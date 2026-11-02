/**
 * Centralized environment validation.
 * Import and call validateEnv() once at app startup before anything else.
 * Missing required vars throw immediately so the process never boots silently broken.
 */

interface EnvConfig {
  DATABASE_URL: string;
  SESSION_SECRET: string;
  OPENAI_API_KEY: string;
  // Optional – warn but don't throw
  ELEVENLABS_API_KEY?: string;
  XAI_API_KEY?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  SENDGRID_API_KEY?: string;
  NODE_ENV: string;
}

const REQUIRED: Array<keyof EnvConfig> = [
  'DATABASE_URL',
  'OPENAI_API_KEY',
];

const OPTIONAL_WARN: Array<keyof EnvConfig> = [
  'ELEVENLABS_API_KEY',
  'XAI_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'GOOGLE_CLIENT_ID',
  'SENDGRID_API_KEY',
];

export function validateEnv(): EnvConfig {
  const missing: string[] = [];

  for (const key of REQUIRED) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('🚨 Missing required environment variables:', missing.join(', '));
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  for (const key of OPTIONAL_WARN) {
    if (!process.env[key]) {
      console.warn(`⚠️  Optional env var not set: ${key} — related features will be degraded`);
    }
  }

  console.log('✅ Environment validation passed');

  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    SESSION_SECRET: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    XAI_API_KEY: process.env.XAI_API_KEY,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    NODE_ENV: process.env.NODE_ENV || 'development',
  };
}

export type { EnvConfig };
