// src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';

import trips from './api/trips';
import participants from './api/participants';
import expenses from './api/expenses';
import payments from './api/payments';
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

// Android App Links verification
// See: https://developer.android.com/training/app-links/verify-android-applinks
app.get('/.well-known/assetlinks.json', (c) => {
  return c.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.emilycogsdill.splitdumb',
        // SHA256 fingerprint from release keystore - update when release keystore is available
        sha256_cert_fingerprints: [
          'TODO:ADD_RELEASE_KEYSTORE_SHA256_FINGERPRINT'
        ]
      }
    }
  ]);
});

// Mount API routes
app.route('/api/trips', trips);
app.route('/api/trips/:slug/participants', participants);
app.route('/api/trips/:slug/expenses', expenses);
app.route('/api/trips/:slug/payments', payments);
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
