import helmet from 'helmet';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { Request, Response, NextFunction } from 'express';
import xss from 'xss';

// Helmet configuration with strict CSP
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: process.env.NODE_ENV === 'development' 
        ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] // Dev needs for Vite HMR
        : ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: [
        "'self'",
        "https://api.openai.com",
        "https://api.x.ai",
        "https://api.elevenlabs.io",
        "wss:",
        "ws:",
      ],
      mediaSrc: ["'self'", "blob:", "data:"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
});

// Rate limiter instances
const generalLimiter = new RateLimiterMemory({
  points: 100, // 100 requests
  duration: 60, // per 60 seconds
});

const authLimiter = new RateLimiterMemory({
  points: 5, // 5 requests
  duration: 300, // per 5 minutes
});

const aiLimiter = new RateLimiterMemory({
  points: 20, // 20 AI requests
  duration: 60, // per minute
});

const voiceLimiter = new RateLimiterMemory({
  points: 30, // 30 voice requests
  duration: 60, // per minute
});

// Rate limiting middleware factory
export function rateLimitMiddleware(limiter: RateLimiterMemory, errorMessage?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    
    try {
      await limiter.consume(key);
      next();
    } catch (rejRes: any) {
      const retryAfter = Math.round(rejRes.msBeforeNext / 1000) || 1;
      res.set('Retry-After', String(retryAfter));
      res.status(429).json({
        error: errorMessage || 'Too many requests, please try again later.',
        retryAfter,
      });
    }
  };
}

// Route-specific limiters
export const generalRateLimit = rateLimitMiddleware(generalLimiter);
export const authRateLimit = rateLimitMiddleware(authLimiter, 'Too many authentication attempts. Please try again in 5 minutes.');
export const aiRateLimit = rateLimitMiddleware(aiLimiter, 'Too many AI requests. Please slow down.');
export const voiceRateLimit = rateLimitMiddleware(voiceLimiter, 'Too many voice requests. Please slow down.');

// Input sanitization middleware - only sanitize string values
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  // Skip sanitization for file uploads or binary data
  if (req.is('multipart/form-data') || req.is('application/octet-stream')) {
    return next();
  }
  
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query as any);
  }
  next();
}

function sanitizeObject(obj: any): any {
  // Only sanitize strings, preserve everything else
  if (typeof obj === 'string') {
    return xss(obj, {
      whiteList: {}, // No HTML allowed by default
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style'],
    });
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  // For objects, recursively sanitize only string properties
  if (obj && typeof obj === 'object' && obj.constructor === Object) {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  // Preserve numbers, booleans, nulls, etc.
  return obj;
}

// CORS configuration
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = [
      'http://localhost:5000',
      'http://127.0.0.1:5000',
      ...(process.env.ALLOWED_ORIGINS?.split(',') || []),
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
