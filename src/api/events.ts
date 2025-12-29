// src/api/events.ts
import { Hono } from 'hono';
import type { Env, Trip } from '../types';
import * as db from '../db/queries';
import { verifyTripAccess } from './trips';

const app = new Hono<{ Bindings: Env; Variables: { trip: Trip } }>();

// All routes require trip auth
app.use('*', verifyTripAccess);

// GET /api/trips/:slug/events - List events
app.get('/', async (c) => {
  try {
    const trip = c.get('trip');
    const events = await db.getEventLogsByTrip(c.env.DB, trip.id);
    return c.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return c.json({ error: 'Failed to fetch events' }, 500);
  }
});

export default app;
