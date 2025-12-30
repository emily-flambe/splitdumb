// src/api/errors.ts
import { Hono } from 'hono';
import type { Env } from '../types';

interface ClientErrorReport {
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  tripSlug?: string;
  timestamp?: string;
}

const app = new Hono<{ Bindings: Env }>();

// POST /api/errors - Log client-side errors
app.post('/', async (c) => {
  try {
    const body = await c.req.json<ClientErrorReport>();

    // Log error to Cloudflare Workers logs
    console.error('CLIENT ERROR:', {
      message: body.message,
      stack: body.stack,
      url: body.url,
      userAgent: body.userAgent,
      tripSlug: body.tripSlug,
      timestamp: body.timestamp || new Date().toISOString(),
    });

    return c.json({ ok: true });
  } catch (error) {
    // Don't fail if error reporting itself fails
    console.error('Failed to log client error:', error);
    return c.json({ ok: true });
  }
});

export default app;
