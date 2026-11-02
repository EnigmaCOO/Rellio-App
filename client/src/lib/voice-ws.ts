/**
 * Canonical voice WebSocket URL resolver.
 * All voice components must use this helper instead of constructing the URL inline.
 */

const FALLBACK_HOST = "localhost:5000";

/**
 * Returns the full WebSocket URL for the voice endpoint, derived from the
 * current page origin so it works identically in development, Replit preview,
 * and production (same-origin, no hardcoded ports or hostnames).
 */
export function resolveVoiceWsUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host || FALLBACK_HOST;

  if (!host || host.includes("undefined")) {
    console.warn("⚠️ resolveVoiceWsUrl: invalid host detected, using fallback:", FALLBACK_HOST);
    return `${protocol}//${FALLBACK_HOST}/ws/voice`;
  }

  return `${protocol}//${host}/ws/voice`;
}
