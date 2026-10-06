import cors from 'cors';
import { config } from './env';

/**
 * Returns all allowed HTTP and WebSocket origins for CORS.
 * Automatically parses comma-separated URLs in CLIENT_URL,
 * trims trailing slashes, and includes standard local dev origins.
 */
export function getAllowedOrigins(): string[] {
  const origins: string[] = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost:5001',
  ];

  if (config.clientUrl) {
    const configured = config.clientUrl
      .split(',')
      .map((url) => url.trim().replace(/\/+$/, ''))
      .filter(Boolean);
    origins.push(...configured);
  }

  return Array.from(new Set(origins));
}

/**
 * Validates whether an incoming HTTP/WebSocket request origin is permitted.
 * Supports exact origin matches and Vercel preview deployment URLs.
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  // Allow requests without Origin header (curl, mobile webviews, health checks, server-to-server)
  if (!origin) return true;

  const normalized = origin.trim().replace(/\/+$/, '');
  const allowed = getAllowedOrigins();

  // Exact configured origin match
  if (allowed.includes(normalized)) return true;

  // Allow Vercel preview deployments when CLIENT_URL is a Vercel domain or in production
  if (
    normalized.endsWith('.vercel.app') &&
    allowed.some((a) => a.includes('.vercel.app'))
  ) {
    return true;
  }

  return false;
}

/**
 * Express CORS middleware options.
 */
export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
