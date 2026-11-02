/**
 * DEBUG_TRACE — observe-only diagnostic logging.
 *
 * This module adds NO behavior. Every log is gated behind the DEBUG_TRACE env
 * flag, which is OFF unless explicitly set to "true"/"1". When off, `traceLog`
 * is a no-op and nothing changes anywhere.
 *
 * It exists so a single diagnostic run can prove which code path executes for a
 * given request and exactly what is sent to the model. Secrets are redacted
 * before anything is printed.
 */

/** True only when DEBUG_TRACE is explicitly "true"/"1". Default OFF (incl. prod). */
export function isDebugTraceEnabled(): boolean {
  const raw = process.env.DEBUG_TRACE;
  return raw === "true" || raw === "1";
}

/**
 * Exact (case-insensitive) key names whose VALUES must be redacted. Matched
 * exactly so legitimate fields like `max_tokens` are not hidden.
 */
const SECRET_KEYS = new Set(
  [
    "key",
    "apikey",
    "api_key",
    "gemini_api_key",
    "token",
    "access_token",
    "refresh_token",
    "id_token",
    "secret",
    "password",
    "passwd",
    "authorization",
    "auth",
    "privatekey",
    "private_key",
    "credential",
    "credentials",
    "cookie",
    "sessionid",
    "session_id",
  ].map((k) => k.toLowerCase()),
);

const SECRET_VALUE_RE =
  /(AIza[0-9A-Za-z\-_]{10,}|sk-[A-Za-z0-9\-_]{10,}|xai-[A-Za-z0-9\-_]{10,}|Bearer\s+[A-Za-z0-9\-._~+/]+=*)/g;

function redactString(s: string): string {
  return s.replace(SECRET_VALUE_RE, "[REDACTED]");
}

/** Recursively redact values under secret-named keys, and token-like substrings. */
function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[depth-limit]";
  if (typeof value === "string") return redactString(value);
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SECRET_KEYS.has(k.toLowerCase()) ? "[REDACTED]" : redact(v, depth + 1);
  }
  return out;
}

/**
 * Emit one structured DEBUG_TRACE line. No-op unless DEBUG_TRACE is on.
 * `event` labels the trace point; `payload` carries the captured fields.
 */
export function traceLog(event: string, payload: Record<string, unknown>): void {
  if (!isDebugTraceEnabled()) return;
  try {
    const safe = redact({ event, ...payload });
    console.log("[DEBUG_TRACE] " + JSON.stringify(safe));
  } catch {
    console.log(`[DEBUG_TRACE] (serialize failed) event=${event}`);
  }
}
