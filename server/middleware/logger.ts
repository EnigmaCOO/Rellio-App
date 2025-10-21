import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.token',
      '*.apiKey',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
});

export function createRequestLogger() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();

    req.log = logger.child({
      reqId: Math.random().toString(36).substring(7),
      method: req.method,
      url: req.url,
    });

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      req.log.info({
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      }, 'Request completed');
    });

    next();
  };
}
