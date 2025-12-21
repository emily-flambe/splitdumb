// src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';

import trips from './api/trips';
import participants from './api/participants';
import expenses from './api/expenses';
import balances from './api/balances';
import events from './api/events';
import admin from './api/admin';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('*', cors({
  origin: '*',
  credentials: true,
}));

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'SplitDumb API is running'
  });
});

// Mount API routes
app.route('/api/trips', trips);
app.route('/api/trips/:slug/participants', participants);
app.route('/api/trips/:slug/expenses', expenses);
app.route('/api/trips/:slug/balances', balances);
app.route('/api/trips/:slug/events', events);
app.route('/api/admin', admin);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
