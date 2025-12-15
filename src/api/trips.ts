// src/api/trips.ts
import { Hono } from 'hono';
import type { Env, CreateTripRequest, UpdateTripRequest } from '../types';
import * as db from '../db/queries';
import { verifyPassword } from '../lib/password';

const app = new Hono<{ Bindings: Env }>();

// POST /api/trips - Create a new trip
app.post('/', async (c) => {
  try {
    const body = await c.req.json<CreateTripRequest>();

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return c.json({ error: 'Trip name is required' }, 400);
    }

    const { trip, password } = await db.createTrip(c.env.DB, {
      name: body.name.trim(),
      password: body.password
    });

    return c.json({
      slug: trip.slug,
      name: trip.name,
      password
    }, 201);
  } catch (error) {
    console.error('Error creating trip:', error);
    return c.json({ error: 'Failed to create trip' }, 500);
  }
});

// POST /api/trips/:slug/auth - Verify trip password
app.post('/:slug/auth', async (c) => {
  try {
    const slug = c.req.param('slug');
    const body = await c.req.json<{ password: string }>();

    if (!body.password) {
      return c.json({ error: 'Password is required' }, 400);
    }

    const trip = await db.getTripBySlug(c.env.DB, slug);
    if (!trip) {
      return c.json({ error: 'Trip not found' }, 404);
    }

    const isValid = await verifyPassword(body.password, trip.password_hash);
    if (!isValid) {
      return c.json({ error: 'Invalid password' }, 401);
    }

    return c.json({ success: true, name: trip.name });
  } catch (error) {
    console.error('Error authenticating:', error);
    return c.json({ error: 'Authentication failed' }, 500);
  }
});

// Middleware: verify trip password for all other routes
export async function verifyTripAccess(c: any, next: () => Promise<void>) {
  const slug = c.req.param('slug');
  const password = c.req.header('X-Trip-Password');

  if (!password) {
    return c.json({ error: 'Password required' }, 401);
  }

  const trip = await db.getTripBySlug(c.env.DB, slug);
  if (!trip) {
    return c.json({ error: 'Trip not found' }, 404);
  }

  const isValid = await verifyPassword(password, trip.password_hash);
  if (!isValid) {
    return c.json({ error: 'Invalid password' }, 401);
  }

  c.set('trip', trip);
  await next();
}

// GET /api/trips/:slug - Get trip details
app.get('/:slug', verifyTripAccess, async (c) => {
  try {
    const slug = c.req.param('slug');
    const tripWithParticipants = await db.getTripWithParticipants(c.env.DB, slug);

    if (!tripWithParticipants) {
      return c.json({ error: 'Trip not found' }, 404);
    }

    return c.json(tripWithParticipants);
  } catch (error) {
    console.error('Error fetching trip:', error);
    return c.json({ error: 'Failed to fetch trip' }, 500);
  }
});

// PUT /api/trips/:slug - Update trip
app.put('/:slug', verifyTripAccess, async (c) => {
  try {
    const slug = c.req.param('slug');
    const body = await c.req.json<UpdateTripRequest>();

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

// DELETE /api/trips/:slug - Delete trip
app.delete('/:slug', verifyTripAccess, async (c) => {
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
