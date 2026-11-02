/**
 * Auth domain routes — /api/v1/auth
 *
 * /me      — v1 identity check (mirrors /api/auth/user)
 * /sync    — Firebase ID token → Rellio user record (upsert + session)
 *
 * Firebase Admin SDK verification is used when FIREBASE_ADMIN_PROJECT_ID,
 * FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY are all set.
 * Without those env vars, the token's payload is decoded without signature
 * verification (acceptable for development; not for production).
 *
 * Required for production Google/Apple/email-link sign-in:
 *   FIREBASE_ADMIN_PROJECT_ID
 *   FIREBASE_ADMIN_CLIENT_EMAIL
 *   FIREBASE_ADMIN_PRIVATE_KEY     (the JSON-encoded or newline-preserved key)
 */

import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { authService, sanitizeUser } from "../../services/auth";
import { notificationService } from "../../services/notification";

// ─── Firebase Admin (optional) ──────────────────────────────────────────────
let firebaseAdmin: { auth: () => { verifyIdToken: (t: string) => Promise<any> } } | null = null;

function firebaseAdminConfigured(): boolean {
  return !!(
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  );
}

/**
 * Single-line startup banner mirroring `logEmailStatus()`. Tells the
 * operator whether Firebase social sign-in tokens (and email-verification
 * link claims) will be properly verified, and exactly which env var(s)
 * are missing if not. Called once from server/index.ts after env validation.
 */
export function logFirebaseAdminStatus(): void {
  const missing: string[] = [];
  if (!process.env.FIREBASE_ADMIN_PROJECT_ID) missing.push("FIREBASE_ADMIN_PROJECT_ID");
  if (!process.env.FIREBASE_ADMIN_CLIENT_EMAIL) missing.push("FIREBASE_ADMIN_CLIENT_EMAIL");
  if (!process.env.FIREBASE_ADMIN_PRIVATE_KEY) missing.push("FIREBASE_ADMIN_PRIVATE_KEY");

  if (missing.length === 0) {
    console.log(
      `🔐 Firebase Admin: ON · project=${process.env.FIREBASE_ADMIN_PROJECT_ID}`,
    );
  } else if (process.env.NODE_ENV === "production") {
    console.error(
      `🔐 Firebase Admin: NOT CONFIGURED in production — Firebase sign-ins will be REFUSED. ` +
        `Missing: ${missing.join(", ")}`,
    );
  } else {
    console.warn(
      `🔐 Firebase Admin: dev fallback (unverified token decode). Missing: ${missing.join(", ")}`,
    );
  }
}

/**
 * Snapshot of Firebase Admin / Web SDK config status for the dev-only
 * diagnostics endpoint. Returns booleans only — never any secret values.
 *
 * NOTE: only Admin (server) config can be inspected from here. The Web
 * SDK config (VITE_FIREBASE_*) lives in the client bundle and is NOT
 * verified by this snapshot — operators should also visit the auth form
 * and confirm Google/Apple sign-in popups load before declaring victory.
 */
export function getFirebaseStatusSnapshot() {
  return {
    firebaseAdminConfigured: firebaseAdminConfigured(),
    appleEnabledFlag: process.env.VITE_FIREBASE_APPLE_ENABLED === "true",
    note: "Web SDK config (VITE_FIREBASE_*) is bundled into the client and not inspected from the server.",
  };
}

async function getFirebaseAdmin() {
  if (firebaseAdmin) return firebaseAdmin;
  if (!firebaseAdminConfigured()) return null;

  try {
    const admin = await import("firebase-admin");
    if (!admin.default.apps.length) {
      admin.default.initializeApp({
        credential: admin.default.credential.cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
        }),
      });
    }
    firebaseAdmin = admin.default as any;
    return firebaseAdmin;
  } catch (err) {
    console.warn("[auth/sync] firebase-admin not available:", err);
    return null;
  }
}

interface DecodedFirebaseToken {
  uid: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  provider: string;
}

/**
 * Decode a Firebase ID token.
 * Uses Admin SDK verification when credentials are available.
 * Falls back to base64 decode (dev-only, no signature check) otherwise.
 */
async function decodeFirebaseToken(idToken: string): Promise<DecodedFirebaseToken> {
  const admin = await getFirebaseAdmin();

  if (admin) {
    const decoded: any = await admin.auth().verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: !!decoded.email_verified,
      name: decoded.name,
      picture: decoded.picture,
      provider: decoded.firebase?.sign_in_provider ?? "unknown",
    };
  }

  // Hard-fail in production when Firebase Admin is not configured — refuse
  // to accept unverified tokens to prevent identity spoofing.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Firebase Admin credentials are not configured. Set FIREBASE_ADMIN_PROJECT_ID, " +
        "FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY to enable token verification.",
    );
  }

  // Dev-only fallback: decode without verification
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Invalid ID token format");
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  console.warn(
    "[auth/sync] ⚠️  Firebase token decoded WITHOUT verification (dev only). " +
      "Set FIREBASE_ADMIN_* env vars for production-grade token verification.",
  );
  return {
    uid: payload.user_id ?? payload.sub,
    email: payload.email,
    emailVerified: !!payload.email_verified,
    name: payload.name,
    picture: payload.picture,
    provider: payload.firebase?.sign_in_provider ?? "unknown",
  };
}

// ─── Router ──────────────────────────────────────────────────────────────────

export function createAuthRouter(): Router {
  const router = Router();

  // GET /api/v1/auth/me — v1 identity (mirrors /api/auth/user)
  router.get("/me", (req: any, res) => {
    if (req.session?.userId) {
      res.json({ id: req.session.userId, isGuest: false });
    } else {
      const guestId = `guest_${Date.now()}`;
      res.json({ id: guestId, isGuest: true });
    }
  });

  // POST /api/v1/auth/sync — Firebase ID token → Rellio user + session
  //
  // Accepts optional profile fields for the email-verification flow,
  // where the client has firstName/lastName/username typed in by the user
  // but the Firebase profile is bare (Firebase doesn't capture profile
  // metadata for email/password signups).
  router.post("/sync", async (req: any, res) => {
    const schema = z.object({
      idToken: z.string().min(10),
      firstName: z.string().trim().max(80).optional(),
      lastName: z.string().trim().max(80).optional(),
      username: z.string().trim().max(80).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "idToken is required" });
    }
    const { idToken, firstName: payloadFirstName, lastName: payloadLastName, username: payloadUsername } =
      parsed.data;

    try {
      const claims = await decodeFirebaseToken(idToken);

      if (!claims.email) {
        return res.status(400).json({ error: "Firebase token does not contain an email claim" });
      }

      // Upsert: prefer firebaseUid match, fall back to email
      let user =
        (claims.uid ? await storage.getUserByFirebaseUid(claims.uid) : undefined) ||
        (await storage.getUserByEmail(claims.email));
      let isNewUser = false;

      // Resolve profile values: explicit payload > Firebase profile > derived from email
      const [fbFirst, ...fbRest] = (claims.name ?? "").split(" ");
      const resolvedFirstName = payloadFirstName || fbFirst || undefined;
      const resolvedLastName = payloadLastName || (fbRest.length ? fbRest.join(" ") : undefined);
      const resolvedUsername =
        payloadUsername || claims.email.split("@")[0] + "_" + Date.now();

      if (!user) {
        user = await storage.createUser({
          email: claims.email,
          username: resolvedUsername,
          firstName: resolvedFirstName,
          lastName: resolvedLastName,
          profileImageUrl: claims.picture || undefined,
          // Trust Firebase: only mark verified if the claim is present.
          // Email/password Firebase users come back unverified at first;
          // they re-sync here after clicking the verification link.
          verified: claims.emailVerified ? 1 : 0,
          socialProvider: claims.provider,
          firebaseUid: claims.uid,
        });
        isNewUser = true;
      } else {
        // Backfill firebaseUid + social link on existing account if missing.
        // Promote to verified=1 if Firebase says the email is verified.
        // Fill missing profile fields (never overwrite existing values).
        const patch: Partial<typeof user> = {};
        if (!user.firebaseUid && claims.uid) patch.firebaseUid = claims.uid;
        if (!user.socialProvider) patch.socialProvider = claims.provider;
        if (claims.picture && !user.profileImageUrl) patch.profileImageUrl = claims.picture;
        if (claims.emailVerified && user.verified !== 1) patch.verified = 1;
        if (!user.firstName && resolvedFirstName) patch.firstName = resolvedFirstName;
        if (!user.lastName && resolvedLastName) patch.lastName = resolvedLastName;
        // Only backfill username from EXPLICIT payload (not the
        // auto-derived `email_<timestamp>` fallback) — we never want to
        // silently rename an existing account to a junk handle.
        if (!user.username && payloadUsername) patch.username = payloadUsername;
        if (Object.keys(patch).length > 0) {
          user = await storage.updateUser(user.id, patch);
        }
      }

      // Send welcome email exactly once per user.
      // Gate: email present AND verified AND welcomeEmailSentAt null.
      // Verified gate prevents welcoming an account that hasn't yet
      // clicked the verification link (covers the email/password sign-up
      // path where the first /sync call may arrive pre-verification).
      if (user.email && user.verified === 1 && !user.welcomeEmailSentAt) {
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
          console.error("[auth/sync] welcome email failed:", emailErr);
        }
      }

      // Establish backend session
      req.session.userId = user.id;
      req.session.isGuest = false;

      // Issue JWT tokens for parity with email/password login
      const tokens = await authService.createAuthTokens(user);

      res.json({
        success: true,
        user: sanitizeUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isNewUser,
        emailVerified: claims.emailVerified,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[auth/sync] error:", message);
      res.status(401).json({ error: "Invalid or expired Firebase ID token" });
    }
  });

  return router;
}
