import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { storage } from '../storage';
import { notificationService } from './notification';
import type { User, InsertUser, InsertOtpCode, InsertRefreshToken } from '@shared/schema';

// Internal-only fields that must never reach the client. Includes the
// password hash plus moderation/ban metadata and the firebase uid which
// is an internal join key.
const INTERNAL_USER_FIELDS = [
  'password',
  'banned',
  'banReason',
  'banExpiresAt',
  'moderationWarnings',
  'firebaseUid',
] as const;

export type SafeUser = Omit<User, typeof INTERNAL_USER_FIELDS[number]>;

/**
 * Strip internal/sensitive fields from a user record before returning to
 * clients. Centralized so every auth code path emits the same shape.
 */
export function sanitizeUser(user: User): SafeUser {
  const copy: Record<string, unknown> = { ...user };
  for (const field of INTERNAL_USER_FIELDS) {
    delete copy[field];
  }
  return copy as SafeUser;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: SafeUser;
}

export interface OtpResult {
  success: boolean;
  message: string;
  requiresVerification?: boolean;
}

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production';
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';
  private readonly OTP_EXPIRY_MINUTES = 5;

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT access token
   */
  generateAccessToken(userId: string): string {
    return jwt.sign({ userId, type: 'access' }, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });
  }

  /**
   * Generate JWT refresh token
   */
  generateRefreshToken(userId: string): string {
    return jwt.sign({ userId, type: 'refresh' }, this.JWT_REFRESH_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
    });
  }

  /**
   * Verify JWT token
   */
  verifyAccessToken(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      if (decoded.type !== 'access') return null;
      return { userId: decoded.userId };
    } catch {
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, this.JWT_REFRESH_SECRET) as any;
      if (decoded.type !== 'refresh') return null;
      return { userId: decoded.userId };
    } catch {
      return null;
    }
  }

  /**
   * Generate 6-digit OTP code
   */
  generateOtpCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Create and store OTP code
   */
  async createOtpCode(
    email: string | undefined,
    phone: string | undefined,
    purpose: 'signup' | 'login' | 'reset'
  ): Promise<string> {
    const code = this.generateOtpCode();
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    const otpData: InsertOtpCode = {
      email: email || null,
      phone: phone || null,
      code,
      purpose,
      expiresAt,
      verified: 0,
    };

    await storage.createOtpCode(otpData);
    return code;
  }

  /**
   * Send OTP via email or SMS
   */
  async sendOtp(
    email: string | undefined,
    phone: string | undefined,
    purpose: 'signup' | 'login' | 'reset'
  ): Promise<OtpResult> {
    try {
      // Clear any existing unverified OTP codes for this email/phone
      await storage.clearUnverifiedOtpCodes(email, phone);

      const code = await this.createOtpCode(email, phone, purpose);

      // Notification helpers return false when the underlying provider
      // (SendGrid, SMTP, Twilio) reports a delivery failure — treat that
      // as a real failure so callers can surface a 5xx and let the user
      // retry rather than locking them out of an unverified account.
      let delivered = false;
      if (email) {
        delivered = await notificationService.sendOtpEmail(email, code, purpose);
      } else if (phone) {
        delivered = await notificationService.sendOtpSms(phone, code, purpose);
      }

      if (!delivered) {
        return {
          success: false,
          message: 'Failed to send verification code. Please try again.',
        };
      }

      return {
        success: true,
        message: email 
          ? 'OTP sent to your email address' 
          : 'OTP sent to your phone number',
      };
    } catch (error) {
      console.error('Failed to send OTP:', error);
      return {
        success: false,
        message: 'Failed to send OTP. Please try again.',
      };
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(
    email: string | undefined,
    phone: string | undefined,
    code: string,
    purpose: 'signup' | 'login' | 'reset'
  ): Promise<OtpResult> {
    try {
      const isValid = await storage.verifyOtpCode(email, phone, code, purpose);
      
      if (!isValid) {
        return {
          success: false,
          message: 'Invalid or expired OTP code',
        };
      }

      return {
        success: true,
        message: 'OTP verified successfully',
      };
    } catch (error) {
      console.error('Failed to verify OTP:', error);
      return {
        success: false,
        message: 'Failed to verify OTP. Please try again.',
      };
    }
  }

  /**
   * Create authenticated user tokens
   */
  async createAuthTokens(user: User): Promise<AuthTokens> {
    const accessToken = this.generateAccessToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    // Store refresh token in database
    const refreshTokenData: InsertRefreshToken = {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    await storage.createRefreshToken(refreshTokenData);

    return {
      accessToken,
      refreshToken,
      user: sanitizeUser(user),
    };
  }

  /**
   * Register new user with email/phone
   */
  async registerUser(userData: {
    email?: string;
    phone?: string;
    username: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{ success: boolean; message: string; user?: User; requiresVerification?: boolean; code?: string }> {
    try {
      // Check if user already exists.
      //
      // Recovery edge case: if a previous signup created the account but
      // OTP delivery failed (or the user simply abandoned the flow before
      // verifying), the email/phone is "taken" by an unverified shell
      // account — retrying signup would otherwise hard-fail with
      // "already registered" and trap the user. In that case, refresh
      // the credentials on the unverified record and resend the OTP so
      // the user can complete verification on the same identifier.
      let unverifiedExistingUser: User | undefined;

      if (userData.email) {
        const existingUser = await storage.getUserByEmail(userData.email);
        if (existingUser) {
          if (!existingUser.verified) {
            unverifiedExistingUser = existingUser;
          } else {
            // Verified duplicate — surface a machine-readable code so the
            // client can offer a one-click "Sign in instead" affordance
            // instead of trapping the user on a generic error toast.
            return {
              success: false,
              code: 'EMAIL_ALREADY_EXISTS',
              message: 'An account with this email already exists. Please sign in instead.',
            };
          }
        }
      }

      if (userData.phone) {
        const existingUser = await storage.getUserByPhone(userData.phone);
        if (existingUser) {
          if (!existingUser.verified) {
            unverifiedExistingUser = existingUser;
          } else {
            return {
              success: false,
              code: 'PHONE_ALREADY_EXISTS',
              message: 'An account with this phone number already exists. Please sign in instead.',
            };
          }
        }
      }

      const existingUsername = await storage.getUserByUsername(userData.username);
      // Allow the unverified-recovery flow to keep its prior username,
      // but otherwise treat collisions as fatal.
      if (
        existingUsername &&
        existingUsername.id !== unverifiedExistingUser?.id
      ) {
        return {
          success: false,
          code: 'USERNAME_TAKEN',
          message: 'Username already taken',
        };
      }

      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);

      let newUser: User;
      if (unverifiedExistingUser) {
        // Refresh the unverified shell account with the latest credentials
        // so the user can retry from a clean state. We deliberately avoid
        // touching `verified` here — that flips only via a successful OTP.
        const refreshed = await storage.updateUser(unverifiedExistingUser.id, {
          username: userData.username,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
        });
        newUser = refreshed ?? unverifiedExistingUser;
      } else {
        const newUserData: InsertUser = {
          email: userData.email,
          phone: userData.phone,
          username: userData.username,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          verified: 0, // Not verified initially
          socialProvider: null,
          notificationPreferences: {
            email: !!userData.email,
            sms: !!userData.phone,
            push: true,
          },
        };

        newUser = await storage.createUser(newUserData);
      }

      // SendGrid configured: send OTP, require verification.
      // SendGrid missing: auto-verify ONLY in non-production environments so
      // onboarding never blocks during local dev. In production a missing
      // SENDGRID_API_KEY is a misconfiguration — refuse to silently bypass
      // email verification.
      const sendgridConfigured = !!process.env.SENDGRID_API_KEY;
      const isProduction = process.env.NODE_ENV === 'production';

      if (!sendgridConfigured) {
        if (isProduction) {
          console.error(
            '[auth] SENDGRID_API_KEY missing in production. ' +
              `Refusing to auto-verify ${userData.email ?? userData.phone ?? 'new user'}. ` +
              'Configure SENDGRID_API_KEY (or SMTP_*) and redeploy.',
          );
          return {
            success: false,
            message: 'OTP_DELIVERY_FAILED',
          };
        }
        console.warn(
          '[auth] SENDGRID_API_KEY missing in development. ' +
            `Email verification auto-completed for ${userData.email ?? userData.phone ?? 'new user'}. ` +
            'Configure SendGrid for production-grade verification.',
        );
        const verifiedUser = await storage.updateUser(newUser.id, { verified: 1 });
        return {
          success: true,
          message: 'Account created successfully.',
          user: verifiedUser ?? newUser,
          requiresVerification: false,
        };
      }

      const otpResult = await this.sendOtp(
        userData.email,
        userData.phone,
        'signup'
      );

      if (!otpResult.success) {
        // SendGrid configured but delivery failed — surface a transient
        // error so the route returns 5xx and the user can retry rather
        // than silently bypassing verification.
        return {
          success: false,
          message: 'OTP_DELIVERY_FAILED',
        };
      }

      return {
        success: true,
        message: 'Account created. Please verify your email to continue.',
        user: newUser,
        requiresVerification: true,
      };
    } catch (error) {
      console.error('Failed to register user:', error);
      return {
        success: false,
        message: 'Failed to create account. Please try again.',
      };
    }
  }

  /**
   * Authenticate user with email/phone/username and password
   */
  async authenticateUser(
    identifier: string,
    password: string,
    type: 'email' | 'phone' | 'username'
  ): Promise<{ success: boolean; message: string; user?: User; requiresVerification?: boolean }> {
    try {
      let user: User | undefined;

      switch (type) {
        case 'email':
          user = await storage.getUserByEmail(identifier);
          break;
        case 'phone':
          user = await storage.getUserByPhone(identifier);
          break;
        case 'username':
          user = await storage.getUserByUsername(identifier);
          break;
      }

      if (!user || !user.password) {
        return { success: false, message: 'Invalid credentials' };
      }

      const isPasswordValid = await this.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return { success: false, message: 'Invalid credentials' };
      }

      // Check if user is verified
      if (!user.verified) {
        // Send new OTP for verification
        await this.sendOtp(user.email ?? undefined, user.phone ?? undefined, 'login');
        return {
          success: false,
          message: 'Account not verified. OTP sent for verification.',
          user,
          requiresVerification: true,
        };
      }

      return {
        success: true,
        message: 'Authentication successful',
        user,
      };
    } catch (error) {
      console.error('Failed to authenticate user:', error);
      return {
        success: false,
        message: 'Authentication failed. Please try again.',
      };
    }
  }

  /**
   * Complete user verification after OTP success
   */
  async completeVerification(email?: string, phone?: string): Promise<User | null> {
    try {
      let user: User | undefined;

      if (email) {
        user = await storage.getUserByEmail(email);
      } else if (phone) {
        user = await storage.getUserByPhone(phone);
      }

      if (!user) return null;

      // Mark user as verified
      const updatedUser = await storage.updateUser(user.id, { verified: 1 });
      return updatedUser;
    } catch (error) {
      console.error('Failed to complete verification:', error);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string } | null> {
    try {
      const decoded = this.verifyRefreshToken(refreshToken);
      if (!decoded) return null;

      // Check if refresh token exists in database
      const tokenExists = await storage.getRefreshToken(refreshToken);
      if (!tokenExists) return null;

      // Generate new access token
      const newAccessToken = this.generateAccessToken(decoded.userId);

      return { accessToken: newAccessToken };
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }

  /**
   * Logout user by invalidating refresh token
   */
  async logout(refreshToken: string): Promise<boolean> {
    try {
      await storage.deleteRefreshToken(refreshToken);
      return true;
    } catch (error) {
      console.error('Failed to logout:', error);
      return false;
    }
  }
}

export const authService = new AuthService();