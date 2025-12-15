// src/api/participants.ts
import { Hono } from 'hono';
import type { Env, CreateParticipantRequest, Trip } from '../types';
import * as db from '../db/queries';
import { verifyTripAccess } from './trips';

const app = new Hono<{ Bindings: Env; Variables: { trip: Trip } }>();

// All routes require trip auth
app.use('*', verifyTripAccess);

// POST /api/trips/:slug/participants - Add participant
app.post('/', async (c) => {
  try {
    const trip = c.get('trip');
    const body = await c.req.json<CreateParticipantRequest>();

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return c.json({ error: 'Participant name is required' }, 400);
    }

    const participant = await db.createParticipant(c.env.DB, trip.id, body.name.trim());
    return c.json(participant, 201);
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint')) {
      return c.json({ error: 'Participant already exists' }, 409);
    }
    console.error('Error creating participant:', error);
    return c.json({ error: 'Failed to create participant' }, 500);
  }
});

// DELETE /api/trips/:slug/participants/:id - Remove participant
app.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid participant ID' }, 400);
    }

    const deleted = await db.deleteParticipant(c.env.DB, id);
    if (!deleted) {
      return c.json({ error: 'Participant not found' }, 404);
    }

    return c.json({ success: true, message: 'Participant deleted' });
  } catch (error) {
    console.error('Error deleting participant:', error);
    return c.json({ error: 'Failed to delete participant' }, 500);
  }
});

export default app;
