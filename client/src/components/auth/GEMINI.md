# GEMINI Playbook — client/src/components/auth

## Purpose
Steer Gemini responses for authentication components covering onboarding, sign-in, and profile gating for the spiritual reading experience.

## How to Work with Requests
1. Clarify the auth flow (OTP, OAuth, session refresh) and UI surface involved.
2. Ensure forms and error states are accessible and mobile-friendly.
3. Keep persona continuity and reading context in mind when designing transitions.

## Execution Steps
- Define component responsibilities and props, delegating logic to hooks/lib for API calls and validation.
- Outline loading/error/verification states with clear messaging that matches the brand tone.
- Suggest how to persist or restore reading/chat context after authentication.

## Completion Checklist
- UI behavior and state flows mapped out.
- Accessibility and error-handling patterns documented.
- Context preservation strategies noted.
