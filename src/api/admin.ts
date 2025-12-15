// src/api/admin.ts
import { Hono } from 'hono';
import type { Env, Trip } from '../types';
import * as db from '../db/queries';

const ADMIN_PASSWORD = 'hunter2';

const app = new Hono<{ Bindings: Env }>();

// Middleware: verify admin password
async function verifyAdmin(c: any, next: () => Promise<void>) {
  const password = c.req.header('X-Admin-Password');

  if (!password || password !== ADMIN_PASSWORD) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await next();
}

// POST /api/admin/auth - Verify admin password
app.post('/auth', async (c) => {
  const body = await c.req.json<{ password: string }>();

  if (body.password === ADMIN_PASSWORD) {
    return c.json({ success: true });
  }

  return c.json({ error: 'Invalid admin password' }, 401);
});

// GET /api/admin/trips - List all trips
app.get('/trips', verifyAdmin, async (c) => {
  try {
    const trips = await db.getAllTrips(c.env.DB);
    // Don't expose password hashes
    const sanitized = trips.map(({ password_hash, ...trip }) => trip);
    return c.json(sanitized);
  } catch (error) {
    console.error('Error listing trips:', error);
    return c.json({ error: 'Failed to list trips' }, 500);
  }
});

// PUT /api/admin/trips/:slug - Update any trip
app.put('/trips/:slug', verifyAdmin, async (c) => {
  try {
    const slug = c.req.param('slug');
    const body = await c.req.json<{ name?: string; password?: string }>();

    const trip = await db.updateTrip(c.env.DB, slug, body);
    if (!trip) {
      return c.json({ error: 'Trip not found' }, 404);
    }

    const { password_hash, ...tripWithoutHash } = trip;
    return c.json(tripWithoutHash);
  } catch (error) {
    console.error('Error updating trip:', error);
    return c.json({ error: 'Failed to update trip' }, 500);
  }
});

// DELETE /api/admin/trips/:slug - Delete any trip
app.delete('/trips/:slug', verifyAdmin, async (c) => {
  try {
    const slug = c.req.param('slug');
    const deleted = await db.deleteTrip(c.env.DB, slug);

    if (!deleted) {
      return c.json({ error: 'Trip not found' }, 404);
    }

    return c.json({ success: true, message: 'Trip deleted' });
  } catch (error) {
    console.error('Error deleting trip:', error);
    return c.json({ error: 'Failed to delete trip' }, 500);
  }
});

export default app;
