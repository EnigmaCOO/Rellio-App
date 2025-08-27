import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { storage } from '../storage';
import { notificationService } from './notification';
import type { User, InsertUser, InsertOtpCode, InsertRefreshToken } from '@shared/schema';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'password'>;
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

      if (email) {
        await notificationService.sendOtpEmail(email, code, purpose);
      } else if (phone) {
        await notificationService.sendOtpSms(phone, code, purpose);
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

    // Remove password from user object
    const { password, ...userWithoutPassword } = user;

    return {
      accessToken,
      refreshToken,
      user: userWithoutPassword,
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
  }): Promise<{ success: boolean; message: string; user?: User; requiresVerification?: boolean }> {
    try {
      // Check if user already exists
      if (userData.email) {
        const existingUser = await storage.getUserByEmail(userData.email);
        if (existingUser) {
          return { success: false, message: 'Email already registered' };
        }
      }

      if (userData.phone) {
        const existingUser = await storage.getUserByPhone(userData.phone);
        if (existingUser) {
          return { success: false, message: 'Phone number already registered' };
        }
      }

      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return { success: false, message: 'Username already taken' };
      }

      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);

      // Create user
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

      const newUser = await storage.createUser(newUserData);

      // Send OTP for verification
      const otpResult = await this.sendOtp(
        userData.email,
        userData.phone,
        'signup'
      );

      return {
        success: true,
        message: 'Account created successfully. Please verify your OTP to continue.',
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
        await this.sendOtp(user.email, user.phone, 'login');
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