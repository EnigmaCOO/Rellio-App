import type { Express } from "express";
import { Router } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from 'ws';
import { createAuthRouter, getFirebaseStatusSnapshot } from "./domains/auth/routes";
import { createBookmarksRouter } from "./domains/bookmarks/routes";
import { createHighlightsRouter } from "./domains/highlights/routes";
import { createNotesRouter } from "./domains/notes/routes";
import { createHomeRouter } from "./domains/home/routes";
import { createComparisonsRouter } from "./domains/comparisons/routes";
import { createScripturesRouter } from "./domains/scriptures/routes";
import { createChatRouter } from "./domains/chat/routes";
import { createProgressRouter } from "./domains/progress/routes";
import { createOnboardingRouter } from "./domains/onboarding/routes";
import { createCommunityRouter } from "./domains/community/routes";
import { createSacredMapAuthoringRouter } from "./domains/sacred-map-authoring/routes";
import { createLibraryRouter } from "./library/routes";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { authService, sanitizeUser } from "./services/auth";
import { notificationService, getEmailStatusSnapshot } from "./services/notification";
import { VoiceWebSocketHandler } from "./websockets/voiceHandler";
import { generateScriptureResponse } from "./services/openai";
import { generatePersonaResponse, explainVerse } from "./services/xai";
import { callWithFallback, callMultiReligiousWithFallback } from "./integrations/providers";
import { validateStructuredResponse } from "./services/responseBuilders";
import { getReligionConfig, getAvailableReligions } from "./services/scripture";
import { fetchScriptureContent, getRandomHadith, type ComparisonResult, type ComparisonVerse } from "./services/externalScripture";
import { buildInBookGrounding, generateGroundedInBookAnswer, isInBookPassageInjectionEnabled, getScholarIdForReligion, resolveCanonicalReaderPassage } from "./services/inBookGrounding";
import { buildGroundedAskResponse, buildUnavailableAskResponse, isAskGroundedEnabled } from "./services/askGrounding";
import { resolveAskScope } from "./services/scholarlyModeScope";
import { answerCache, cacheCanRead, cacheCanWrite, hashKey, normalizeQuestion } from "./services/engineCache";
import { generateScholarResponse } from "./services/scholarModel";
import { buildInBookMemory } from "./services/rollingMemory";
import { isCitationValidationEnabled } from "../validators/citations";
import { traceLog } from "./debug/trace";
import { ElevenLabsService } from "./services/elevenlabs";
import { moderateMessage, flagMessage } from "./services/moderation";
import { 
  scriptureRequestSchema, 
  chatRequestSchema,
  compareRequestSchema,
  insertChatMessageSchema,
  insertUserReadingSchema,
  startReadingSessionSchema,
  updateReadingSessionSchema,
  updateJourneyGoalSchema,
  religionSchema,
  loginSchema,
  signupSchema,
  sendOtpSchema,
  verifyOtpSchema,
  socialAuthCallbackSchema,
  updateNotificationPreferencesSchema,
  type Religion,
  type InsertChatMessage,
  type InsertSpiritualJourney,
  type InsertReadingSession
} from "@shared/schema";
import { z } from "zod";
import type { ConversationMessage } from './services/openai';

// Extend express-session to include userId
declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {

  // Rate limiting for authentication endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
      error: "Too many authentication attempts, please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const otpLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3, // Limit each IP to 3 OTP requests per 5 minutes
    message: {
      error: "Too many OTP requests, please try again in 5 minutes."
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Enhanced Authentication Routes

  // Dev-only diagnostics — surface email + Firebase subsystem config
  // from the browser without exposing secrets. Both 404 in production
  // so a deployed environment can't leak its sender address or which
  // service account email is in use.
  app.get("/api/dev/email-status", (_req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({ error: "Not found" });
    }
    res.json(getEmailStatusSnapshot());
  });

  app.get("/api/dev/firebase-status", (_req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({ error: "Not found" });
    }
    res.json(getFirebaseStatusSnapshot());
  });

  // Get current user (with JWT support)
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      // Check for JWT token in Authorization header
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (token) {
        const decoded = authService.verifyAccessToken(token);
        if (decoded) {
          const user = await storage.getUser(decoded.userId);
          if (user) {
            return res.json(sanitizeUser(user));
          }
        }
      }

      // Fallback to session-based authentication
      if (req.session?.userId) {
        if (req.session.isGuest) {
          res.json({ guest: true, id: req.session.userId });
        } else {
          const user = await storage.getUser(req.session.userId);
          if (user) {
            res.json(sanitizeUser(user));
          } else {
            res.status(401).json({ error: "User not found" });
          }
        }
      } else {
        // Create guest session automatically
        req.session.isGuest = true;
        req.session.userId = `guest_${Date.now()}`;
        res.json({ guest: true, id: req.session.userId });
      }
    } catch (error) {
      console.error("Auth user error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Send OTP for verification
  app.post("/api/auth/send-otp", otpLimiter, async (req: any, res) => {
    try {
      const { email, phone, purpose } = sendOtpSchema.parse(req.body);

      const result = await authService.sendOtp(email, phone, purpose);

      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        // Delivery-provider failure (e.g. SendGrid down or unconfigured) is
        // a transient/server-side condition the client can retry — mirror
        // the signup path which already returns 503 in this case.
        res.status(503).json({ error: result.message });
      }
    } catch (error) {
      console.error("Send OTP error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid input", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to send OTP" });
      }
    }
  });

  // Verify OTP
  app.post("/api/auth/verify-otp", authLimiter, async (req: any, res) => {
    try {
      const { email, phone, code, purpose } = verifyOtpSchema.parse(req.body);

      const result = await authService.verifyOtp(email, phone, code, purpose);

      if (result.success) {
        // Complete verification if it's signup or login
        if (purpose === 'signup' || purpose === 'login') {
          const user = await authService.completeVerification(email, phone);
          if (user) {
            // Send welcome email exactly once (signup verification only).
            // Only mark the user as welcomed when delivery actually succeeded
            // so a misconfigured provider doesn't permanently suppress retries.
            if (purpose === 'signup' && user.email && !user.welcomeEmailSentAt) {
              try {
                const sent = await notificationService.sendWelcomeEmail(
                  user.email,
                  user.firstName,
                  user.username,
                );
                if (sent) {
                  await storage.markWelcomeEmailSent(user.id);
                }
              } catch (emailErr) {
                console.error("[verify-otp] welcome email failed:", emailErr);
              }
            }

            const tokens = await authService.createAuthTokens(user);
            // Establish backend session as well as JWT
            req.session.userId = user.id;
            req.session.isGuest = false;
            res.json({
              success: true,
              message: "Email verified successfully",
              ...tokens,
            });
          } else {
            res.status(400).json({ error: "User not found" });
          }
        } else {
          res.json({ success: true, message: result.message });
        }
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      console.error("Verify OTP error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid input", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to verify OTP" });
      }
    }
  });

  // Enhanced signup with OTP verification
  app.post("/api/auth/signup", authLimiter, async (req: any, res) => {
    try {
      const userData = signupSchema.parse(req.body);

      const result = await authService.registerUser(userData);

      if (result.success) {
        if (result.requiresVerification) {
          res.json({
            success: true,
            message: result.message,
            requiresVerification: true,
            email: userData.email,
          });
        } else {
          // No verification required (dev / SendGrid not configured) —
          // create tokens, establish session, and send the welcome email once.
          const fresh = result.user!;
          if (fresh.email && !fresh.welcomeEmailSentAt) {
            try {
              const sent = await notificationService.sendWelcomeEmail(
                fresh.email,
                fresh.firstName,
                fresh.username,
              );
              if (sent) {
                await storage.markWelcomeEmailSent(fresh.id);
              }
            } catch (emailErr) {
              console.error("[signup] welcome email failed:", emailErr);
            }
          }
          const tokens = await authService.createAuthTokens(fresh);
          req.session.userId = fresh.id;
          req.session.isGuest = false;
          res.json({
            success: true,
            message: "Account created successfully",
            ...tokens,
          });
        }
      } else {
        // Distinguish transient OTP-delivery failures (retryable, 5xx) from
        // real validation errors (4xx) so clients can react appropriately.
        if (result.message === 'OTP_DELIVERY_FAILED') {
          res.status(503).json({
            error: 'Could not send verification code. Please try again in a moment.',
          });
        } else if (result.code === 'EMAIL_ALREADY_EXISTS' || result.code === 'PHONE_ALREADY_EXISTS') {
          // 409 Conflict — the client uses `code` to offer "Sign in instead".
          res.status(409).json({
            success: false,
            code: result.code,
            error: result.message,
            message: result.message,
          });
        } else {
          res.status(400).json({
            success: false,
            code: result.code,
            error: result.message,
          });
        }
      }
    } catch (error) {
      console.error("Signup error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid input", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create account" });
      }
    }
  });

  // Enhanced login with OTP verification for unverified accounts
  app.post("/api/auth/login", authLimiter, async (req: any, res) => {
    try {
      const { email, phone, username, password } = loginSchema.parse(req.body);

      let type: 'email' | 'phone' | 'username';
      let identifier: string;

      if (email) {
        type = 'email';
        identifier = email;
      } else if (phone) {
        type = 'phone';
        identifier = phone;
      } else {
        type = 'username';
        identifier = username!;
      }

      const result = await authService.authenticateUser(identifier, password, type);

      if (result.success) {
        if (result.requiresVerification) {
          res.json({
            success: false,
            message: result.message,
            requiresVerification: true
          });
        } else {
          // Create JWT tokens
          const tokens = await authService.createAuthTokens(result.user!);

          // Also set session for backward compatibility
          req.session.userId = result.user!.id;
          req.session.isGuest = false;

          res.json({
            success: true,
            message: "Login successful",
            ...tokens,
          });
        }
      } else {
        res.status(401).json({ error: result.message });
      }
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid input", details: error.errors });
      } else {
        res.status(500).json({ error: "Login failed" });
      }
    }
  });

  // Refresh JWT token
  app.post("/api/auth/refresh", async (req: any, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token required" });
      }

      const result = await authService.refreshAccessToken(refreshToken);

      if (result) {
        res.json(result);
      } else {
        res.status(401).json({ error: "Invalid or expired refresh token" });
      }
    } catch (error) {
      console.error("Refresh token error:", error);
      res.status(500).json({ error: "Failed to refresh token" });
    }
  });

  // Profile update endpoint
  app.patch("/api/auth/profile", async (req: any, res) => {
    try {
      // Get user from JWT or session
      const token = req.headers.authorization?.replace('Bearer ', '');
      let userId: string | undefined;

      if (token) {
        const decoded = authService.verifyAccessToken(token);
        userId = decoded?.userId;
      } else if (req.session?.userId && !req.session.isGuest) {
        userId = req.session.userId;
      }

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { firstName, lastName, username, email, phone } = req.body;

      // Check if username or email already exists (excluding current user)
      if (username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: "Username already taken" });
        }
      }

      if (email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: "Email already in use" });
        }
      }

      // Email is treated as read-only here; we ignore client-supplied email
      // changes until a re-verification flow exists.
      const updates: Partial<typeof user> = {
        firstName,
        lastName,
        username,
        phone,
        updatedAt: new Date(),
      };

      const updatedUser = await storage.updateUser(userId, updates);

      res.json({
        success: true,
        message: "Profile updated successfully",
        user: sanitizeUser(updatedUser),
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Enhanced logout with JWT token invalidation
  app.post("/api/auth/logout", async (req: any, res) => {
    try {
      const { refreshToken } = req.body;

      // Invalidate refresh token if provided
      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      // Destroy session
      req.session.destroy((err: any) => {
        if (err) {
          console.error("Session destruction error:", err);
        }
        res.json({ success: true, message: "Logged out successfully" });
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });

  // Guest access (unchanged)
  app.post("/api/auth/guest", async (req: any, res) => {
    try {
      req.session.isGuest = true;
      req.session.userId = `guest_${Date.now()}`;
      res.json({ success: true, guest: true });
    } catch (error) {
      console.error("Guest access error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Google OAuth routes
  app.get("/api/auth/google", (req: any, res) => {
    // Force HTTPS for redirect URI since Google OAuth requires it
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `https://${req.get('host')}/api/auth/google/callback`;
    console.log('🔗 Google OAuth - Redirect URI being used:', redirectUri);
    console.log('🌍 Host header:', req.get('host'));
    console.log('🔒 Protocol (forcing HTTPS):', 'https');
    console.log('🔑 Google OAuth - Client ID:', process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...');

    const googleAuthUrl = `https://accounts.google.com/oauth/authorize?` +
      `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('openid profile email')}&` +
      `access_type=offline&` +
      `prompt=consent`;

    console.log('🚀 Full Google OAuth URL:', googleAuthUrl.substring(0, 100) + '...');
    res.redirect(googleAuthUrl);
  });

  app.get("/api/auth/google/callback", async (req: any, res) => {
    try {
      console.log('🔍 Google OAuth callback started');
      const { code, error } = req.query;

      if (error) {
        console.log('❌ OAuth error from Google:', error);
        return res.redirect('/home?error=auth_cancelled');
      }

      if (!code) {
        console.log('❌ No authorization code received');
        return res.redirect('/home?error=auth_cancelled');
      }

      console.log('✅ Authorization code received, exchanging for tokens...');

      // Exchange code for tokens - Force HTTPS
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || `https://${req.get('host')}/api/auth/google/callback`;
      console.log('🔗 Using redirect URI:', redirectUri);

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          code: code as string,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      const tokens = await tokenResponse.json();
      console.log('🎫 Token response status:', tokenResponse.status);

      if (!tokenResponse.ok || !tokens.access_token) {
        console.error('❌ Token exchange failed:', tokens);
        return res.redirect('/?error=auth_failed');
      }

      console.log('✅ Tokens received, fetching user info...');

      // Get user info from Google
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });

      if (!userResponse.ok) {
        console.error('❌ Failed to fetch user info from Google');
        return res.redirect('/?error=auth_failed');
      }

      const googleUser = await userResponse.json();
      console.log('👤 Google user info received:', { email: googleUser.email, name: googleUser.name });

      // Check if user exists
      let user = await storage.getUserByEmail(googleUser.email);
      console.log('🔍 Existing user found:', !!user);

      if (!user) {
        // Create new user
        console.log('➕ Creating new user...');
        const newUserData = {
          email: googleUser.email,
          username: googleUser.email.split('@')[0] + '_' + Date.now(),
          firstName: googleUser.given_name,
          lastName: googleUser.family_name,
          profileImageUrl: googleUser.picture,
          verified: 1, // Google users are pre-verified
          socialProvider: 'google',
        };

        user = await storage.createUser(newUserData);
        console.log('✅ New user created:', user.id);

        // Send the one-time welcome email for new social sign-ups.
        // Only mark as welcomed when delivery actually succeeded.
        if (user.email && !user.welcomeEmailSentAt) {
          try {
            const sent = await notificationService.sendWelcomeEmail(
              user.email,
              user.firstName,
              user.username,
            );
            if (sent) {
              await storage.markWelcomeEmailSent(user.id);
            }
          } catch (emailErr) {
            console.error('[google] welcome email failed:', emailErr);
          }
        }
      } else {
        // Update profile picture if changed
        if (googleUser.picture && user.profileImageUrl !== googleUser.picture) {
          console.log('🖼️ Updating profile picture...');
          user = await storage.updateUser(user.id, { 
            profileImageUrl: googleUser.picture,
            socialProvider: 'google'
          });
        }
      }

      // Set session
      req.session.userId = user.id;
      req.session.isGuest = false;
      console.log('🔐 Session set for user:', user.id);

      // Redirect to home with merge signal — client picks this up and calls mergeGuestOnboardingToAccount()
      console.log('✅ Redirecting to /home...');
      res.redirect('/read?auth=success');

    } catch (error) {
      console.error('❌ Google OAuth error:', error);
      res.redirect('/?error=auth_failed');
    }
  });

  // Update notification preferences
  app.patch("/api/auth/notifications", async (req: any, res) => {
    try {
      // Get user from JWT or session
      const token = req.headers.authorization?.replace('Bearer ', '');
      let userId: string | undefined;

      if (token) {
        const decoded = authService.verifyAccessToken(token);
        userId = decoded?.userId;
      } else if (req.session?.userId && !req.session.isGuest) {
        userId = req.session.userId;
      }

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const preferences = updateNotificationPreferencesSchema.parse(req.body);

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedPreferences: { email: boolean; sms: boolean; push: boolean } = {
        email: Boolean((user.notificationPreferences as Record<string, unknown>)?.['email'] ?? preferences.email),
        sms:   Boolean((user.notificationPreferences as Record<string, unknown>)?.['sms']   ?? preferences.sms),
        push:  Boolean((user.notificationPreferences as Record<string, unknown>)?.['push']  ?? preferences.push),
      };

      await storage.updateUser(userId, { 
        notificationPreferences: updatedPreferences 
      });

      res.json({ 
        success: true, 
        preferences: updatedPreferences 
      });
    } catch (error) {
      console.error("Update preferences error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid input", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update preferences" });
      }
    }
  });

  // Send notification to all opted-in users (admin endpoint)
  app.post("/api/notifications/send-update", async (req: any, res) => {
    try {
      const { subject, message } = req.body;

      if (!subject || !message) {
        return res.status(400).json({ error: "Subject and message are required" });
      }

      // Get all users with notification preferences
      // Note: In a real implementation, you'd want to paginate this
      // and implement proper admin authentication
      const users: Array<{ email?: string; phone?: string; notificationPreferences: unknown }> = []; // This would get users from database

      const result = await notificationService.sendNotificationUpdate(
        users,
        subject,
        message
      );

      res.json({
        success: true,
        emailsSent: result.emailsSent,
        smsSent: result.smsSent
      });
    } catch (error) {
      console.error("Send notification error:", error);
      res.status(500).json({ error: "Failed to send notifications" });
    }
  });
  // Get available religions
  app.get("/api/religions", async (req, res) => {
    try {
      const religions = getAvailableReligions();
      const religionData = religions.map(religion => {
        const config = getReligionConfig(religion);

        // For Islam, group books by sections
        if (religion === 'islam') {
          const sections: Record<string, string[]> = {};
          config.books.forEach(book => {
            const section = book.section || 'Other';
            if (!sections[section]) {
              sections[section] = [];
            }
            sections[section].push(book.name);
          });

          return {
            id: religion,
            name: config.name,
            books: config.books.map(book => book.name),
            sections: sections
          };
        }

        return {
          id: religion,
          name: config.name,
          books: config.books.map(book => book.name)
        };
      });
      res.json(religionData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch religions" });
    }
  });

  // Get books for a specific religion
  app.get("/api/religions/:religion/books", async (req, res) => {
    try {
      const religion = religionSchema.parse(req.params.religion);
      const books = await storage.getScriptureBooks(religion);
      res.json(books);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid religion" });
      } else {
        res.status(500).json({ error: "Failed to fetch books" });
      }
    }
  });

  // Get book info including chapter count
  app.get("/api/religions/:religion/books/:book", async (req, res) => {
    try {
      const religion = religionSchema.parse(req.params.religion);
      const bookName = req.params.book;

      const religionConfig = getReligionConfig(religion);
      const book = religionConfig.books.find(b => b.name === bookName);

      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }

      res.json({
        name: book.name,
        chapters: book.chapters,
        religion: religion
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid religion parameter" });
      } else {
        res.status(500).json({ error: "Failed to fetch book info" });
      }
    }
  });

  // Get scripture verses
  app.get("/api/scriptures", async (req, res) => {
    try {
      const { religion, book, chapter: chapterStr } = req.query;
      const chapter = parseInt(chapterStr as string, 10);

      console.log('Query params:', { religion, book, chapter, chapterStr });

      if (isNaN(chapter)) {
        return res.status(400).json({ error: "Invalid chapter number" });
      }

      const validatedParams = scriptureRequestSchema.parse({ religion, book, chapter });

      // Try to fetch from external APIs first
      const externalScriptures = await fetchScriptureContent(
        validatedParams.religion, 
        validatedParams.book, 
        validatedParams.chapter
      );

      if (externalScriptures.length > 0) {
        res.json(externalScriptures);
      } else {
        // Fallback to local storage if external API fails
        const localScriptures = await storage.getScriptures(
          validatedParams.religion, 
          validatedParams.book, 
          validatedParams.chapter
        );
        res.json(localScriptures);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log('Validation error:', error.errors);
        res.status(400).json({ error: "Invalid parameters", details: error.errors });
      } else {
        console.log('Other error:', error);
        res.status(500).json({ error: "Failed to fetch scriptures" });
      }
    }
  });

  // Get chat messages for a session
  app.get("/api/chat/:sessionId", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const messages = await storage.getChatMessages(sessionId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });

  // Clear chat messages for a session
  app.delete("/api/chat/:sessionId", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      await storage.clearChatMessages(sessionId);
      console.log(`✅ Chat messages cleared for session: ${sessionId}`);
      res.json({ success: true, message: "Chat messages cleared" });
    } catch (error) {
      console.error(`❌ Failed to clear chat messages for session: ${req.params.sessionId}`, error);
      res.status(500).json({ error: "Failed to clear chat messages" });
    }
  });

  // Send a chat message with conversation history context
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, sessionId, context } = chatRequestSchema.parse(req.body);

      console.log("Chat request payload:", { context });
      console.log("Context multiReligiousPerspective:", context?.multiReligiousPerspective);
      console.log("Context type:", typeof context?.multiReligiousPerspective);

      // Content moderation check
      const userId = req.session?.userId;
      const moderationResult = await moderateMessage(message, userId);

      if (moderationResult.isBlocked) {
        // Log the blocked message for audit
        console.log(`Message blocked for user ${userId}: ${moderationResult.reason}`);

        // Return moderation response
        return res.status(400).json({
          error: "Message blocked to promote unity—please rephrase.",
          reason: moderationResult.reason,
          suggestion: moderationResult.suggestion || "Please share your thoughts respectfully across all religious traditions.",
          flagType: moderationResult.flagType
        });
      }

      const isPersonaMode = !!context?.persona;
      const isPassageScholarMode =
        context?.mode === "passage_scholar" ||
        (!!context?.book && !!context?.religion && !isPersonaMode);
      const askScope = !isPersonaMode && !isPassageScholarMode
        ? resolveAskScope({
            mode: context?.mode,
            selectedSources: context?.selectedSources,
            selectedTraditions: context?.selectedTraditions,
          })
        : null;
      if (askScope && !askScope.ok) {
        return res.status(400).json({ error: askScope.error });
      }

      // Retrieve previous conversation history (last 5 messages for context)
      const previousMessages = await storage.getChatMessages(sessionId);
      const conversationHistory: ConversationMessage[] = previousMessages
        .slice(-5)
        .map(msg => ({
          role: (msg.type === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: msg.content,
          timestamp: msg.timestamp ?? new Date(),
        }));

      console.log("Conversation history retrieved:", { 
        sessionId, 
        historyLength: conversationHistory.length,
        recentMessages: conversationHistory.map(m => ({ role: m.role, preview: m.content.substring(0, 50) + '...' }))
      });

      // Save user message
      const userMessage = await storage.createChatMessage({
        sessionId,
        type: 'user',
        content: message,
        context: context || null
      });

      // AI response generation — structured response contract pipeline for home chat.
      // Persona mode and dashboard scripture reading context use the existing provider factory.
      let aiResponse: string;
      let homeChatStructuredResponse: import("@shared/schema").StructuredChatResponse | null = null;

      const isHomeChatMode = !isPersonaMode && !isPassageScholarMode;

      traceLog("route.branch", {
        path: isHomeChatMode ? "ask" : isPassageScholarMode ? "in_book" : "persona",
        branch_taken: isHomeChatMode
          ? "home (Ask)"
          : isPersonaMode
            ? "persona"
            : "Passage Scholar (in_book)",
        deciding_values: {
          "context.persona": context?.persona ?? null,
          "context.book": context?.book ?? null,
          "context.religion": context?.religion ?? null,
          "context.chapter": context?.chapter ?? null,
          "context.selectedSources": (context as { selectedSources?: unknown } | null | undefined)?.selectedSources ?? null,
          "context.selectedTraditions": (context as { selectedTraditions?: unknown } | null | undefined)?.selectedTraditions ?? null,
          "context.mode": (context as { mode?: unknown } | null | undefined)?.mode ?? null,
        },
        flags: {
          IN_BOOK_PASSAGE_INJECTION: isInBookPassageInjectionEnabled(),
          CITATION_VALIDATION: isCitationValidationEnabled(),
          ASK_GROUNDED: isAskGroundedEnabled(),
          SCHOLAR_MODEL: process.env.SCHOLAR_MODEL ?? "(default gemini-2.5-flash)",
          ASK_MODEL: process.env.ASK_MODEL ?? "(default gemini-2.5-flash)",
        },
      });

      if (isHomeChatMode) {
        // Ask, single-tradition, and Compare all use the same evidence-first
        // pipeline. The selected mode is validated above and never inferred
        // from phrasing in the user's message.
        const selectedSources = askScope?.selectedSources ?? [];
        const selectedTraditions = askScope?.selectedTraditions ?? [];
        const mode = askScope?.responseMode ?? "general";
        console.log(`Home chat structured response mode: ${mode}`, { selectedSources, selectedTraditions });

        let structuredResponse;
        if (isAskGroundedEnabled()) {
          try {
            structuredResponse = await buildGroundedAskResponse(message, mode, selectedSources, selectedTraditions);
            console.log("Home chat: grounded Ask response generated");
          } catch (err) {
            console.error("Home chat: grounded Ask path failed; returning an evidence-unavailable response:", err);
            structuredResponse = buildUnavailableAskResponse(
              mode,
              selectedSources,
              selectedTraditions,
              "The evidence or answer service is unavailable right now. I did not substitute an ungrounded answer.",
            );
          }
        } else {
          structuredResponse = buildUnavailableAskResponse(
            mode,
            selectedSources,
            selectedTraditions,
            "The grounded answer service is currently disabled. I did not substitute an ungrounded answer.",
          );
        }

        const validatorTraditions = selectedTraditions.map((tradition) =>
          tradition === "shintoism" ? "shinto" : tradition,
        );
        const validation = validateStructuredResponse(
          structuredResponse,
          validatorTraditions,
          mode,
          selectedSources,
        );
        if (!validation.valid) {
          console.warn("Structured response validation violations — withholding answer:", validation.violations);
          structuredResponse = buildUnavailableAskResponse(
            mode,
            selectedSources,
            selectedTraditions,
            "I could not verify that the answer stayed within the selected source scope, so I am withholding it.",
          );
        }

        homeChatStructuredResponse = structuredResponse;
        aiResponse = JSON.stringify(structuredResponse);
      } else if (isPersonaMode) {
        // Persona mode — existing path unchanged
        const personaContexts: Record<string, { name: string; systemPrompt: string; expertise: string[]; voiceTone: string }> = {
          "Dr. Sophia Cross": {
            name: "Dr. Sophia Cross",
            systemPrompt: "You are Dr. Sophia Cross, a distinguished Biblical scholar and theologian with expertise in Biblical Greek, Hebrew, and historical Christianity. Your responses are scholarly yet warm, drawing from deep textual analysis and historical context. You speak with gentle authority and often reference original languages and manuscript traditions.",
            expertise: ["Biblical Studies", "Systematic Theology", "Church History", "Biblical Languages"],
            voiceTone: "scholarly yet warm"
          },
          "Sheikh Ahmad Al-Tabari": {
            name: "Sheikh Ahmad Al-Tabari",
            systemPrompt: "You are Sheikh Ahmad Al-Tabari, a respected Islamic scholar specializing in Quranic exegesis (tafsir) and Islamic jurisprudence. Your responses reflect deep knowledge of Arabic, Islamic history, and the Prophet's teachings. You speak with wisdom and respect for the sacred traditions.",
            expertise: ["Quranic Studies", "Islamic Jurisprudence", "Hadith Sciences", "Arabic Language"],
            voiceTone: "wise and respectful"
          },
          "Rabbi David Goldstein": {
            name: "Rabbi David Goldstein",
            systemPrompt: "You are Rabbi David Goldstein, a learned Torah scholar with expertise in Talmudic interpretation and Jewish philosophy. Your responses demonstrate deep knowledge of Hebrew texts, rabbinic commentary, and Jewish spiritual traditions. You speak with thoughtful precision and often include insights from various commentators.",
            expertise: ["Torah Studies", "Talmudic Interpretation", "Jewish Philosophy", "Hebrew Language"],
            voiceTone: "thoughtful and precise"
          },
          "Hadith Scholar": {
            name: "Hadith Scholar",
            systemPrompt: "You are a Hadith Scholar, a specialist in the sayings and traditions (Hadith) of Prophet Muhammad (peace be upon him). You have deep knowledge of hadith authentication, the science of hadith (Ilm al-Hadith), and prophetic traditions. You speak with scholarly precision about hadith chains (isnad), authenticity grades, and the practical application of prophetic guidance. Always reference the hadith collection, provide context about the Prophet's teachings, and explain how these traditions guide Muslim life. Begin with appropriate Islamic greetings and maintain the reverence due to prophetic traditions.",
            expertise: ["Hadith Authentication", "Prophetic Traditions", "Islamic History", "Sunnah Studies"],
            voiceTone: "scholarly and reverent"
          }
        };

        console.log("Generating persona response via provider factory for:", context?.persona);
        const personaContext = context?.persona ? (personaContexts[context.persona] ?? null) : null;

        const { response, providerUsed } = await callWithFallback({
          message,
          context: {
            religion: context?.religion ?? null,
            book: context?.book ?? "",
            chapter: context?.chapter ?? 1,
            persona: context?.persona ?? null,
          },
          personaContext,
          conversationHistory,
        });
        console.log(`Persona response handled by: ${providerUsed}`);
        aiResponse = response;
      } else {
        console.log("Generating Passage Scholar response from a selected canonical passage");

        if (!isInBookPassageInjectionEnabled()) {
          aiResponse = "The grounded Passage Scholar is disabled, so I can’t safely answer from the reader right now.";
        } else if (!context?.religion || !context?.book) {
          aiResponse = "Open a scripture book and select a passage before asking Passage Scholar.";
        } else if (!context.passageSelection?.text) {
          aiResponse = "Select the passage in the reader, then choose Ask Scholar. I won’t substitute a default chapter.";
        } else {
          try {
            const resolution = await resolveCanonicalReaderPassage(
              context.religion,
              context.book,
              context.passageSelection.text,
            );

            if (!resolution.ok) {
              const passageErrors = {
                selection_required: "Select a passage in the reader, then choose Ask Scholar.",
                book_not_indexed: "This book does not yet have an indexed canonical edition, so I can’t verify its passage. Use a supported source or provide a canonical reference.",
                no_exact_match: "I couldn’t match the selected text exactly to an indexed canonical passage. Please select a verse from a supported edition or provide its reference.",
                ambiguous_match: "The selected text could match more than one canonical passage. Select a smaller, unambiguous passage.",
              } as const;
              aiResponse = passageErrors[resolution.reason];
            } else {
              const passageKey = resolution.passages.map((passage) => passage.refId).join(",");
              const answerCacheKey = hashKey(
                "answer:inbook",
                getScholarIdForReligion(context.religion) ?? context.religion,
                passageKey,
                resolution.edition,
                normalizeQuestion(message),
              );
              const cachedAnswer = cacheCanRead()
                ? answerCache.get(answerCacheKey)
                : undefined;

              if (cachedAnswer !== undefined) {
                aiResponse = cachedAnswer;
              } else {
                let scholarHistory: ConversationMessage[] = conversationHistory;
                let conversationSummary: string | undefined;
                try {
                  const memory = await buildInBookMemory(sessionId, previousMessages);
                  scholarHistory = memory.conversationHistory;
                  conversationSummary = memory.summary;
                } catch (err) {
                  console.error("Passage Scholar memory failed; using recent turns only:", err);
                }

                const grounding = await buildInBookGrounding(
                  context.religion,
                  resolution.passages,
                  conversationSummary,
                  message,
                );

                if (!grounding) {
                  aiResponse = "I couldn’t build grounded context for this selected passage, so I’m not presenting an unverified answer.";
                } else {
                  const readerEditionNote = context.bookTitle
                    ? `\n\nThe reader labels this edition "${context.bookTitle}". Use only the canonical edition and passage explicitly shown in PROVIDED CONTEXT; do not claim the reader wording is a different translation.`
                    : "";
                  const runGeneration = (systemPrompt: string): Promise<string> =>
                    generateScholarResponse({
                      systemPrompt: `${systemPrompt}${readerEditionNote}`,
                      conversationHistory: scholarHistory,
                      userMessage: message,
                    });
                  const { answer, regenerated, validation } =
                    await generateGroundedInBookAnswer(
                      grounding.ctx,
                      grounding.systemPrompt,
                      runGeneration,
                    );

                  if (!validation.ok) {
                    aiResponse = "I couldn’t verify the citations and quotations in the answer after one correction attempt, so I’m withholding the unverified text.";
                  } else {
                    aiResponse = answer;
                    if (cacheCanWrite()) answerCache.set(answerCacheKey, answer);
                  }
                  console.log(
                    `Passage Scholar citation validation ${validation.ok ? "passed" : "failed"}${regenerated ? " after one regeneration" : ""}`,
                  );
                }
              }
            }
          } catch (err) {
            console.error("Passage Scholar evidence/model request failed:", err);
            aiResponse = "Passage Scholar could not access or verify the selected source right now. Please try again later.";
          }
        }
      }

      // Save AI response
      const aiMessage = await storage.createChatMessage({
        sessionId,
        type: 'ai',
        content: aiResponse,
        context: context || null
      });

      const response = {
        userMessage,
        aiMessage,
        ...(homeChatStructuredResponse ? { structuredResponse: homeChatStructuredResponse } : {}),
      };
      console.log("Chat response mode:", homeChatStructuredResponse?.mode ?? "legacy");

      res.json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request", details: error.errors });
      } else {
        const anyErr = error as { status?: number; statusCode?: number; response?: { status?: number; data?: unknown }; code?: unknown; name?: unknown; message?: unknown };
        traceLog("route.chat.raw_error", {
          note: "RAW caught error for /api/chat (user still sees the unchanged generic message)",
          error_name: anyErr?.name ?? null,
          error_code: anyErr?.code ?? null,
          http_status: anyErr?.status ?? anyErr?.statusCode ?? anyErr?.response?.status ?? null,
          message: anyErr?.message ?? String(error),
          response_body: anyErr?.response?.data ?? null,
        });
        console.error("Chat error:", error);
        res.status(500).json({ error: "Failed to process chat message" });
      }
    }
  });

  // Compare Mode uses the same independent, evidence-first retrieval as Ask.
  app.post("/api/chat/compare", async (req, res) => {
    try {
      const {
        theme,
        sessionId,
        selectedTraditions,
        maxVersesPerReligion = 5,
      } = compareRequestSchema.parse(req.body);

      const scope = resolveAskScope({
        mode: "compare",
        selectedTraditions,
      });
      if (!scope.ok) {
        return res.status(400).json({ error: scope.error });
      }

      console.log("Compare Mode request:", {
        theme,
        sessionId,
        selectedTraditions: scope.selectedTraditions,
      });

      let structuredResponse;
      try {
        structuredResponse = isAskGroundedEnabled()
          ? await buildGroundedAskResponse(
              theme,
              "comparative",
              [],
              scope.selectedTraditions,
            )
          : buildUnavailableAskResponse(
              "comparative",
              [],
              scope.selectedTraditions,
              "The grounded comparison service is disabled. No sample or ungrounded verses were substituted.",
            );
      } catch (error) {
        console.error("Compare evidence retrieval/generation failed:", error);
        structuredResponse = buildUnavailableAskResponse(
          "comparative",
          [],
          scope.selectedTraditions,
          "Evidence retrieval or answer generation failed. No sample or ungrounded verses were substituted.",
        );
      }

      const religionIds: Record<string, Religion> = {
        islam: "islam",
        christianity: "christianity",
        judaism: "judaism",
        hinduism: "hinduism",
        buddhism: "buddhism",
        sikhism: "sikhism",
        shinto: "shintoism",
      };
      const verses: ComparisonResult["verses"] = {};
      for (const reference of structuredResponse.references) {
        if (reference.kind !== "scripture") continue;
        const religion = religionIds[reference.tradition.toLowerCase()];
        const match = reference.citation.match(/^(.*)\s+(\d+):(\d+)(?:-\d+)?$/);
        if (!religion || !match) continue;
        const verse: ComparisonVerse = {
          religion,
          book: match[1],
          chapter: Number(match[2]),
          verse: Number(match[3]),
          text: reference.text,
          translation: reference.edition,
          reference: reference.citation,
        };
        const key = religion;
        const current = verses[key] ?? [];
        if (current.length < maxVersesPerReligion) verses[key] = [...current, verse];
      }

      const limitations: string[] = Array.isArray(structuredResponse.limitations)
        ? structuredResponse.limitations
        : typeof structuredResponse.limitations === "string"
          ? [structuredResponse.limitations]
          : [];
      const comparisonResult: ComparisonResult = {
        theme,
        aiSummary: [structuredResponse.summary].concat(limitations).filter(Boolean).join("\n\n"),
        verses,
        coverage: structuredResponse.coverage,
      };

      // Save the comparison as a chat message for history
      await storage.createChatMessage({
        sessionId,
        type: 'user',
        content: `Compare verses about: ${theme}`,
        context: { 
          religion: null, 
          book: null, 
          chapter: null,
          compareMode: true,
          theme,
          selectedTraditions: scope.selectedTraditions,
        }
      });

      await storage.createChatMessage({
        sessionId,
        type: 'ai',
        content: `Comparison of verses about "${theme}" across religious traditions:\n\n${comparisonResult.aiSummary}`,
        context: {
          religion: null,
          book: null, 
          chapter: null,
          compareMode: true,
          theme: theme,
          selectedTraditions: scope.selectedTraditions,
          comparisonData: comparisonResult.verses,
          coverage: comparisonResult.coverage,
        }
      });

      console.log("Compare Mode response:", { 
        theme: comparisonResult.theme,
        verseCount: Object.values(comparisonResult.verses).reduce((sum, verses) => sum + verses.length, 0),
        religions: Object.keys(comparisonResult.verses)
      });

      res.json(comparisonResult);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid compare request", details: error.errors });
      } else {
        console.error("Compare Mode error:", error);
        res.status(500).json({ error: "Failed to process comparison request" });
      }
    }
  });

  // Record a reading
  app.post("/api/readings", async (req, res) => {
    try {
      const reading = insertUserReadingSchema.parse(req.body);
      const savedReading = await storage.createUserReading(reading);
      res.json(savedReading);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid reading data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to save reading" });
      }
    }
  });

  // Get user readings
  app.get("/api/readings/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      const readings = await storage.getUserReadings(userId);
      res.json(readings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch readings" });
    }
  });

  // Get random verse from any religion
  app.get("/api/verse/random", async (req, res) => {
    try {
      const religions = getAvailableReligions();
      const randomReligion = religions[Math.floor(Math.random() * religions.length)];
      const religionConfig = getReligionConfig(randomReligion);

      // Get random book
      const books = religionConfig.books;
      const randomBook = books[Math.floor(Math.random() * books.length)];

      // Check if the random book selected from islam religion is actually a hadith book
      const hadithCollectionNames = ['Sahih al-Bukhari', 'Sahih Muslim', 'Sunan Abu Dawud', 'Jami\' at-Tirmidhi', 'Sunan an-Nasa\'i', 'Sunan Ibn Majah'];
      if (randomReligion === 'islam' && hadithCollectionNames.includes(randomBook.name)) {
        const randomHadith = await getRandomHadith();
        if (randomHadith) {
          return res.json({
            faith: 'islam',
            book: randomHadith.book,
            chapter: randomHadith.chapter,
            verse: randomHadith.verse,
            text: randomHadith.text,
            reference: randomHadith.translation || `${randomHadith.book} ${randomHadith.verse}`
          });
        }
      }

      // Get random chapter
      const randomChapter = Math.floor(Math.random() * randomBook.chapters) + 1;

      // Fetch verses from that chapter
      const verses = await fetchScriptureContent(randomReligion, randomBook.name, randomChapter);

      if (verses.length === 0) {
        // Fallback to predefined verses if external API fails
        const fallbackVerses = [
          {
            religion: "christianity",
            book: "Matthew",
            chapter: 5,
            verse: 9,
            text: "Blessed are the peacemakers, for they will be called children of God."
          },
          {
            religion: "islam",
            book: "Al-Baqarah",
            chapter: 2,
            verse: 255,
            text: "Allah - there is no deity except Him, the Ever-Living, the Sustainer of existence."
          },
          {
            religion: "judaism",
            book: "Leviticus",
            chapter: 19,
            verse: 18,
            text: "Do not seek revenge or bear a grudge against anyone among your people, but love your neighbor as yourself."
          },
          {
            religion: "hinduism",
            book: "Bhagavad Gita",
            chapter: 2,
            verse: 47,
            text: "You have a right to perform your prescribed duty, but not to the fruits of action."
          },
          {
            religion: "buddhism",
            book: "Tripitaka",
            chapter: 1,
            verse: 1,
            text: "All conditioned things are impermanent. Work out your salvation with diligence."
          },
          {
            religion: "islam",
            book: "Sahih al-Bukhari",
            chapter: 1,
            verse: 1,
            text: "The reward of deeds depends upon the intentions and every person will get the reward according to what he has intended."
          }
        ];

        const randomFallback = fallbackVerses[Math.floor(Math.random() * fallbackVerses.length)];
        return res.json({
          faith: randomFallback.religion,
          book: randomFallback.book,
          chapter: randomFallback.chapter,
          verse: randomFallback.verse,
          text: randomFallback.text,
          reference: `${randomFallback.book} ${randomFallback.chapter}:${randomFallback.verse}`
        });
      }

      // Get random verse from the fetched verses
      const randomVerse = verses[Math.floor(Math.random() * verses.length)];

      res.json({
        faith: randomVerse.religion,
        book: randomVerse.book,
        chapter: randomVerse.chapter,
        verse: randomVerse.verse,
        text: randomVerse.text,
        reference: `${randomVerse.book} ${randomVerse.chapter}:${randomVerse.verse}`
      });
    } catch (error) {
      console.error("Random verse error:", error);
      res.status(500).json({ error: "Failed to fetch random verse" });
    }
  });

  // Generate AI insight for a verse
  app.post("/api/scholar/explain", async (req, res) => {
    try {
      const { reference, text, faith } = req.body;

      if (!reference || !text) {
        return res.status(400).json({ error: "Reference and text are required" });
      }

      const prompt = `You are a scholarly expert in religious texts. Provide a concise, insightful explanation (1-2 sentences) of the following verse, emphasizing its key theme and practical application. Keep it respectful and accessible.

Verse: "${text}"
Reference: ${reference}
Faith tradition: ${faith || 'Unknown'}

Focus on the universal wisdom and practical guidance this verse offers.`;

      const response = await generateScriptureResponse(prompt);

      res.json({
        insight: response
      });
    } catch (error) {
      console.error("AI insight error:", error);
      res.status(500).json({ error: "Failed to generate insight" });
    }
  });

  // ElevenLabs voice routes
  let elevenLabsService: ElevenLabsService | null = null;

  try {
    elevenLabsService = new ElevenLabsService();
  } catch (error) {
    console.warn("ElevenLabs service not available:", error);
  }

  // Get available ElevenLabs voices
  app.get("/api/elevenlabs/voices", async (req, res) => {
    try {
      if (!elevenLabsService) {
        return res.status(503).json({ error: "ElevenLabs service not available" });
      }

      const voices = await elevenLabsService.getVoices();
      console.log('Raw voices data:', voices.slice(0, 3)); // Log first 3 voices for debugging
      const maleVoices = elevenLabsService.getRecommendedMaleVoices(voices);
      console.log('Filtered male voices:', maleVoices.length);

      res.json({
        allVoices: voices,
        recommendedMaleVoices: maleVoices
      });
    } catch (error) {
      console.error("Error fetching ElevenLabs voices:", error);
      res.status(500).json({ error: "Failed to fetch voices" });
    }
  });

  // API endpoint for voice data storage
  app.post("/api/chat/voice-data", async (req, res) => {
    try {
      const { sessionId, voiceData, verseReference, context } = req.body;

      if (!sessionId || !voiceData) {
        return res.status(400).json({ error: "Session ID and voice data are required" });
      }

      await storage.updateChatMessageWithVoiceData(sessionId, voiceData, verseReference, context);
      res.json({ success: true });

    } catch (error) {
      console.error("Error saving voice data:", error);
      res.status(500).json({ error: "Failed to save voice data" });
    }
  });

  // API endpoint for interruption data storage
  app.post("/api/chat/interruption", async (req, res) => {
    try {
      const { sessionId, interruptionData, isInterrupted, context } = req.body;

      if (!sessionId || !interruptionData) {
        return res.status(400).json({ error: "Session ID and interruption data are required" });
      }

      await storage.saveInterruptionData(sessionId, interruptionData, isInterrupted, context);
      res.json({ success: true });

    } catch (error) {
      console.error("Error saving interruption data:", error);
      res.status(500).json({ error: "Failed to save interruption data" });
    }
  });

  // ElevenLabs streaming endpoint
  app.post("/api/elevenlabs/stream", async (req, res) => {
    try {
      if (!elevenLabsService) {
        return res.status(503).json({ error: "ElevenLabs service not available" });
      }

      const { text, voice_id, model_id, voice_settings, output_format } = req.body;

      if (!text || !voice_id) {
        return res.status(400).json({ error: "Text and voice_id are required" });
      }

      console.log('🔊 ElevenLabs streaming request:', { textLength: text.length, voice_id, model_id });

      const audioBuffer = await elevenLabsService.generateSpeech(text, voice_id, {
        stability: 0.75,
        similarityBoost: 0.8,
        style: 0.2,
        useSpeakerBoost: true,
        ...(voice_settings && {
          stability: Number(voice_settings.stability ?? 0.75),
          similarityBoost: Number(voice_settings.similarity_boost ?? 0.8),
          style: Number(voice_settings.style ?? 0.2),
          useSpeakerBoost: Boolean(voice_settings.use_speaker_boost ?? true),
        }),
      });

      console.log('🔊 Generated streaming audio:', audioBuffer.length, 'bytes');

      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length,
        'Cache-Control': 'no-cache',
        'Accept-Ranges': 'bytes'
      });

      res.send(audioBuffer);
    } catch (error) {
      console.error("Error streaming ElevenLabs audio:", error);
      res.status(500).json({ error: "Failed to stream audio", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Generate speech using ElevenLabs
  app.post("/api/elevenlabs/speak", async (req, res) => {
    try {
      if (!elevenLabsService) {
        console.log('❌ ElevenLabs service not available');
        return res.status(503).json({ error: "ElevenLabs service not available" });
      }

      const { text, voiceId, settings } = req.body;

      if (!text || !voiceId) {
        console.log('❌ Missing required fields:', { hasText: !!text, hasVoiceId: !!voiceId });
        return res.status(400).json({ error: "Text and voiceId are required" });
      }

      console.log('🔊 ElevenLabs speak request:', { 
        textLength: text.length, 
        voiceId: voiceId.substring(0, 10) + '...',
        hasSettings: !!settings 
      });

      const audioBuffer = await elevenLabsService.generateSpeech(text, voiceId, settings || {
        stability: 0.5,
        similarityBoost: 0.8,
        style: 0.0,
        useSpeakerBoost: true
      });

      console.log('✅ ElevenLabs audio generated:', audioBuffer.length, 'bytes');

      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'no-cache'
      });

      res.send(audioBuffer);

    } catch (error) {
      console.error("❌ ElevenLabs speak error:", error);
      res.status(500).json({ 
        error: "Failed to generate speech", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // ===== SPIRITUAL JOURNEY PROGRESS TRACKING API =====

  // Get user's spiritual journey overview
  app.get("/api/progress/journey", async (req: any, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.session.userId;
      let journey = await storage.getSpiritualJourney(userId);

      // Create journey if it doesn't exist
      if (!journey) {
        journey = await storage.createSpiritualJourney({
          userId,
          totalReadingSessions: 0,
          totalTimeMinutes: 0,
          currentStreak: 0,
          longestStreak: 0,
          readingGoal: 60 // default 1 hour per week
        });
      }

      res.json(journey);
    } catch (error) {
      console.error("Get journey error:", error);
      res.status(500).json({ error: "Failed to get spiritual journey" });
    }
  });

  // Update reading goal
  app.patch("/api/progress/journey/goal", async (req: any, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { readingGoal } = updateJourneyGoalSchema.parse(req.body);
      const userId = req.session.userId;

      const journey = await storage.updateSpiritualJourney(userId, { readingGoal });
      res.json(journey);
    } catch (error) {
      console.error("Update reading goal error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update reading goal" });
    }
  });

  // Start a reading session
  app.post("/api/progress/session/start", async (req: any, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const sessionData = startReadingSessionSchema.parse(req.body);
      const userId = req.session.userId;

      // Check if there's an active session and end it first
      const activeSession = await storage.getActiveReadingSession(userId);
      if (activeSession) {
        await storage.endReadingSession(activeSession.id, {
          durationMinutes: Math.round((Date.now() - (activeSession.startTime ?? new Date()).getTime()) / 60000)
        });
      }

      // Get or create journey
      let journey = await storage.getSpiritualJourney(userId);
      if (!journey) {
        journey = await storage.createSpiritualJourney({
          userId,
          totalReadingSessions: 0,
          totalTimeMinutes: 0,
          currentStreak: 0,
          longestStreak: 0,
          readingGoal: 60
        });
      }

      // Start new session
      const session = await storage.startReadingSession({
        userId,
        journeyId: journey.id,
        ...sessionData
      });

      res.json(session);
    } catch (error) {
      console.error("Start reading session error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to start reading session" });
    }
  });

  // End a reading session
  app.patch("/api/progress/session/:sessionId/end", async (req: any, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid sessionId in URL" });
      }
      const sessionUpdates = updateReadingSessionSchema.omit({ sessionId: true }).parse(req.body);
      const userId = req.session.userId;

      // End the session
      const session = await storage.endReadingSession(sessionId, sessionUpdates as Parameters<typeof storage.endReadingSession>[1]);

      // Update journey statistics
      const journey = await storage.getSpiritualJourney(userId);
      if (journey) {
        const newTotalSessions = (journey.totalReadingSessions ?? 0) + 1;
        const newTotalMinutes = (journey.totalTimeMinutes ?? 0) + (sessionUpdates.durationMinutes || 0);

        // Check for milestones
        await checkAndCreateMilestones(userId, journey.id, {
          totalSessions: newTotalSessions,
          totalMinutes: newTotalMinutes,
          completedChapter: sessionUpdates.completedChapter || false,
          religion: session.religion
        });

        await storage.updateSpiritualJourney(userId, {
          totalReadingSessions: newTotalSessions,
          totalTimeMinutes: newTotalMinutes,
          lastActiveDate: new Date(),
          favoriteReligion: await calculateFavoriteReligion(userId)
        });
      }

      res.json(session);
    } catch (error) {
      console.error("End reading session error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to end reading session" });
    }
  });

  // Get progress summary
  app.get("/api/progress/summary", async (req: any, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.session.userId;
      const summary = await storage.getUserProgressSummary(userId);
      res.json(summary);
    } catch (error) {
      console.error("Get progress summary error:", error);
      res.status(500).json({ error: "Failed to get progress summary" });
    }
  });

  // Get user milestones
  app.get("/api/progress/milestones", async (req: any, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.session.userId;
      const milestones = await storage.getUserMilestones(userId);
      res.json(milestones);
    } catch (error) {
      console.error("Get milestones error:", error);
      res.status(500).json({ error: "Failed to get milestones" });
    }
  });

  // Get reading sessions history
  app.get("/api/progress/active-session", async (req: any, res) => {
    try {
      if (!req.session?.userId) return res.json(null);
      const session = await storage.getActiveReadingSession(req.session.userId);
      if (!session) return res.json(null);
      return res.json({
        id: session.id,
        religion: session.religion,
        book: session.book,
        chapter: session.chapter,
        startTime: session.startTime,
      });
    } catch {
      res.json(null);
    }
  });

  app.get("/api/progress/sessions", async (req: any, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.session.userId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const sessions = await storage.getUserReadingSessions(userId, limit);
      res.json(sessions);
    } catch (error) {
      console.error("Get reading sessions error:", error);
      res.status(500).json({ error: "Failed to get reading sessions" });
    }
  });

  // Helper function to check and create milestones
  async function checkAndCreateMilestones(userId: string, journeyId: number, stats: {
    totalSessions: number;
    totalMinutes: number;
    completedChapter: boolean;
    religion: string;
  }) {
    const milestones = [
      { type: 'first_session', threshold: 1, title: 'First Steps', description: 'Started your spiritual journey' },
      { type: 'sessions_milestone', threshold: 5, title: 'Dedicated Reader', description: 'Completed 5 reading sessions' },
      { type: 'sessions_milestone', threshold: 10, title: 'Spiritual Explorer', description: 'Completed 10 reading sessions' },
      { type: 'sessions_milestone', threshold: 25, title: 'Wisdom Seeker', description: 'Completed 25 reading sessions' },
      { type: 'sessions_milestone', threshold: 50, title: 'Devoted Student', description: 'Completed 50 reading sessions' },
      { type: 'time_milestone', threshold: 60, title: 'One Hour Journey', description: 'Spent 1 hour in spiritual study' },
      { type: 'time_milestone', threshold: 300, title: '5 Hours Wisdom', description: 'Spent 5 hours in spiritual study' },
      { type: 'time_milestone', threshold: 600, title: '10 Hours Devotion', description: 'Spent 10 hours in spiritual study' },
    ];

    for (const milestone of milestones) {
      const value = milestone.type === 'sessions_milestone' ? stats.totalSessions : stats.totalMinutes;

      if (value >= milestone.threshold) {
        // Check if milestone already exists
        const existing = await storage.getUserMilestones(userId);
        const hasThisMilestone = existing.some(m => 
          m.type === milestone.type && m.value === milestone.threshold
        );

        if (!hasThisMilestone) {
          await storage.createJourneyMilestone({
            userId,
            journeyId,
            type: milestone.type,
            title: milestone.title,
            description: milestone.description,
            value: milestone.threshold,
            badge: milestone.type === 'sessions_milestone' ? '📚' : '⏰'
          });
        }
      }
    }

    // Chapter completion milestone
    if (stats.completedChapter) {
      await storage.createJourneyMilestone({
        userId,
        journeyId,
        type: 'chapter_complete',
        title: 'Chapter Complete',
        description: `Completed a chapter in ${stats.religion}`,
        value: 1,
        badge: '✅'
      });
    }
  }

  // Helper function to calculate favorite religion
  async function calculateFavoriteReligion(userId: string): Promise<string | null> {
    const sessions = await storage.getUserReadingSessions(userId);
    if (sessions.length === 0) return null;

    const religionCounts: { [key: string]: number } = {};
    sessions.forEach(session => {
      religionCounts[session.religion] = (religionCounts[session.religion] || 0) + 1;
    });

    let maxReligion = null;
    let maxCount = 0;
    for (const [religion, count] of Object.entries(religionCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxReligion = religion;
      }
    }

    return maxReligion;
  }

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });


  // ─── /api/v1 domain routes ───────────────────────────────────────────────
  // New work lands in /api/v1. Legacy /api/* routes remain as compatibility
  // shims and will be migrated domain-by-domain over future phases.
  const v1 = Router();
  v1.use("/auth", createAuthRouter());
  v1.use("/scriptures", createScripturesRouter());
  v1.use("/chat", createChatRouter());
  v1.use("/progress", createProgressRouter());
  v1.use("/onboarding", createOnboardingRouter());
  v1.use("/bookmarks", createBookmarksRouter());
  v1.use("/highlights", createHighlightsRouter());
  v1.use("/notes", createNotesRouter());
  v1.use("/home", createHomeRouter());
  v1.use("/comparisons", createComparisonsRouter());
  v1.use("/community", createCommunityRouter());
  v1.use("/sacred-map-authoring", createSacredMapAuthoringRouter());
  v1.use("/library", createLibraryRouter());
  // Also expose library at /api/library for direct EPUB binary access
  app.use("/api/library", createLibraryRouter());
  app.use("/api/v1", v1);
  console.log("📡 /api/v1 domain routes registered");

  const httpServer = createServer(app);

  // Initialize Voice WebSocket Handler for real-time streaming (side-effect only)
  new VoiceWebSocketHandler(httpServer);
  console.log('🎤 Voice WebSocket handler initialized');

  return httpServer;
}