# Rellio Auth + Onboarding Architecture

## State Transition Model

```
NEW VISITOR
  └─► / (Landing)
        └─► "Enter app" → /onboarding (if not complete) or /home (if complete)

ONBOARDING (no auth required)
  └─► 10-step SoulSet wizard
        └─► Complete → localStorage["rellio_onboarding"].completed = true
              └─► Navigate to /home (guest)

GUEST HOME
  └─► Home reads personalization from localStorage
  └─► Progress API disabled for guests
  └─► "Save your journey" CTA visible
        └─► Click → /auth (upgrade surface, never a blocker)

AUTH UPGRADE (/auth)
  ├─► Email/Password sign in
  │     └─► POST /api/auth/login → session set
  │           └─► AuthContext.signInWithEmail() called
  │                 └─► mergeGuestOnboardingToAccount() auto-called ✓
  │                       └─► navigate("/home")
  │
  ├─► Email/Password sign up
  │     └─► POST /api/auth/signup → session set
  │           └─► AuthContext.signUpWithEmail() called
  │                 └─► mergeGuestOnboardingToAccount() auto-called ✓
  │                       └─► navigate("/home")
  │
  ├─► Google (Firebase — when VITE_FIREBASE_* configured)
  │     └─► signInWithPopup(googleProvider)
  │           └─► POST /api/v1/auth/sync { idToken }
  │                 └─► Backend: decode token → upsert user → set session
  │                       └─► mergeGuestOnboardingToAccount() auto-called ✓
  │                             └─► navigate("/home")
  │
  ├─► Google (Backend OAuth fallback — when Firebase NOT configured)
  │     └─► localStorage.set("rellio_pending_merge", "1")
  │           └─► window.location.href = /api/auth/google
  │                 └─► Backend OAuth → /api/auth/google/callback
  │                       └─► session set → redirect /home?auth=success
  │                             └─► App.useGoogleAuthReturn() detects param
  │                                   └─► mergeGuestOnboardingToAccount() called ✓
  │
  └─► Apple (Firebase — when VITE_FIREBASE_APPLE_ENABLED=true)
        └─► signInWithPopup(appleProvider)
              └─► POST /api/v1/auth/sync { idToken }
                    └─► [same as Google Firebase path above]

AUTHENTICATED HOME
  └─► isAuthenticated = true, isGuest = false
  └─► Progress API enabled
  └─► Guest CTA hidden
  └─► Onboarding data merged to DB via /api/v1/onboarding/merge
```

## Sources of Truth

| Concern | Source | Persists |
|---|---|---|
| Auth identity (guest) | Express Session (MemoryStore) + localStorage guest flag | Browser tab |
| Auth identity (authenticated) | Express Session + JWT (localStorage) | Browser |
| Onboarding profile (guest) | `localStorage["rellio_onboarding"]` | Browser |
| Onboarding profile (authenticated) | `onboarding_profiles` DB table | Forever |
| Home personalization | localStorage (guest) or DB (authenticated) | Browser / Forever |

## Key Files

| File | Role |
|---|---|
| `client/src/contexts/AuthContext.tsx` | **Single source of truth for auth identity.** Wraps Firebase auth + backend session. Auto-calls merge on every sign-in. |
| `client/src/hooks/useAuth.ts` | Backward-compatible wrapper for existing consumers. Delegates to AuthContext. |
| `client/src/hooks/useOnboarding.ts` | Onboarding state management. `mergeGuestOnboardingToAccount()` pushes localStorage → DB. |
| `client/src/lib/firebase.ts` | Firebase config. Gracefully disabled when VITE_FIREBASE_* env vars absent. |
| `client/src/lib/flowResolver.ts` | Pure function: auth + onboarding state → canonical route. |
| `client/src/App.tsx` | Router with `OnboardingGuard`, `AuthProvider` wrapper, Google OAuth return handler. |
| `client/src/pages/auth.tsx` | Auth upgrade surface. `onSuccess` navigates to `/home` (not `/`). |
| `client/src/components/auth/AuthForm.tsx` | All auth actions delegate to AuthContext. Merge is automatic. |
| `server/domains/auth/routes.ts` | `POST /api/v1/auth/sync` — Firebase token → Rellio user upsert + session. |
| `server/domains/onboarding/routes.ts` | `POST /api/v1/onboarding/merge` — Guest profile → DB. |
| `server/routes.ts` | Google OAuth callback redirects to `/home?auth=success` (fixed from `/?auth=success`). |

## Environment Variables Required

### For Firebase Google Sign-In (frontend)
```
VITE_FIREBASE_API_KEY          = your-web-api-key
VITE_FIREBASE_AUTH_DOMAIN      = your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID       = your-project-id
VITE_FIREBASE_APP_ID           = 1:xxx:web:xxx
VITE_FIREBASE_MEASUREMENT_ID   = G-xxx (optional, for Analytics)
```

### For Apple Sign-In (requires Firebase + Apple Developer account)
```
VITE_FIREBASE_APPLE_ENABLED    = true
```

### For Firebase token verification on the backend (production)
```
FIREBASE_ADMIN_PROJECT_ID      = your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL    = firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY     = -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
```
⚠️ Without these, `/api/v1/auth/sync` decodes tokens WITHOUT cryptographic verification.
This is acceptable for development; set them before going to production.

### For Google OAuth fallback (existing backend route, no Firebase)
```
GOOGLE_CLIENT_ID               = xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET           = GOCSPX-xxx
GOOGLE_REDIRECT_URI            = https://your-domain/api/auth/google/callback
```

## Merge Behavior

When a guest signs in or signs up, `mergeGuestOnboardingToAccount()` is called automatically by `AuthContext`. It:

1. Reads `localStorage["rellio_onboarding"]`
2. If `completed = true`, calls `POST /api/v1/onboarding/merge`
3. Backend checks if DB profile already exists for this user:
   - No profile → inserts the guest data → `{ merged: true }`
   - Profile exists (user already onboarded on another device) → skips → `{ merged: true }`
4. Guest data is **never deleted** from localStorage; server becomes the authoritative record
5. No duplicate profiles possible (enforced by `userId` unique constraint)

## QA Checklist

### First-time visitor
- [ ] Visit `/` → see landing page
- [ ] Click "Enter app" → redirected to `/onboarding` (not `/auth`)
- [ ] Complete onboarding in < 2 minutes
- [ ] At least one goal required (enforced in Step 3)
- [ ] Reach `/home` without signing in
- [ ] Home shows traditions, topics, and quote from onboarding selections
- [ ] Refresh → still on `/home` (localStorage persists)

### Returning guest
- [ ] Visit `/` → click "Enter app" → redirected to `/home` (skips onboarding)
- [ ] Home shows saved preferences from localStorage

### Email sign-in from guest home
- [ ] Click upgrade CTA → navigate to `/auth`
- [ ] Sign in with email/password → navigate to `/home` (not `/`)
- [ ] Check DB: `onboarding_profiles` has a row for this user
- [ ] Home shows same preferences (merged from localStorage)

### Google sign-in (Firebase path)
- [ ] Set `VITE_FIREBASE_*` env vars
- [ ] Click "Continue with Google" → Firebase popup opens
- [ ] Sign in → popup closes → navigate to `/home`
- [ ] Check DB: user created/updated, onboarding merged

### Google sign-in (backend OAuth fallback path)
- [ ] Set `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` + `GOOGLE_REDIRECT_URI`
- [ ] Click "Continue with Google" → redirected to Google
- [ ] Sign in → redirected to `/home?auth=success`
- [ ] `mergeGuestOnboardingToAccount()` called automatically
- [ ] URL cleaned to `/home`

### Apple sign-in
- [ ] Without `VITE_FIREBASE_APPLE_ENABLED=true`: button shows "(not configured)" label and is disabled — no broken UX
- [ ] With Firebase + Apple Developer configured: popup works end-to-end

### Authenticated returning user
- [ ] Sign in → navigate to `/home`
- [ ] Refresh → still authenticated (session + JWT persist)
- [ ] Sign out → navigate to `/`

### Partial onboarding resume
- [ ] Start onboarding, fill 3 steps, close browser
- [ ] Reopen → `/onboarding` loads at Step 1 (localStorage has partial data)
- [ ] In-progress state preserved in form selections

### No dead-end routes
- [ ] `/home` without onboarding → redirect to `/onboarding`
- [ ] `/read`, `/compare`, `/community` without onboarding → redirect to `/onboarding`
- [ ] `/onboarding` when already complete → redirect to `/home`

## What Is NOT Yet Done (requires credentials)

1. **Firebase Google sign-in** — needs `VITE_FIREBASE_*` env vars from Firebase Console
2. **Firebase backend token verification** — needs `FIREBASE_ADMIN_*` env vars (service account)
3. **Apple sign-in** — needs Apple Developer membership + Service ID in Firebase console
4. **Cross-device guest sync** — requires Firebase anonymous auth so guest identity persists across devices (currently only localStorage)
5. **`sessions` table persistence** — currently using `MemoryStore` for sessions; switch to `connect-pg-simple` for production durability
