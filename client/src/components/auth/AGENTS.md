# AGENT: `client/src/components/auth`

## Legacy Definition (pre-refresh)
- Owned **login, signup, OTP, and OAuth components** that framed onboarding with persona previews, voice snippets, and immediate reading cues feeding the 3D dashboard handoff.
- Connected Firebase/Google auth flows with gentle copy, rate limiting, and persona-assisted guidance during verification.

## Updated Definition
This directory contains authentication-related UI components for Rellio.

## Responsibilities
- Provide **sign-in / sign-up / reset** UIs that:
  - Feel welcoming and non-judgmental.
  - Match the spiritual, premium aesthetic.
- Integrate with backend auth flows (`server/services/auth.ts`) in a secure and user-friendly way.

## Key Tasks for Agents
- Ensure validation and error messaging is clear and gentle (aligned with Rellio’s compassionate tone).
- Support future enhancements:
  - Social login providers where appropriate.
  - Preference setup during onboarding (faith traditions, learning goals).
- Avoid embedding business logic directly in components; delegate to hooks/lib.
