// src/api/recovery.ts
import { Hono } from 'hono';
import type { Env, Trip, AddRecoveryEmailRequest, RecoveryRequest } from '../types';
import * as db from '../db/queries';
import { verifyTripAccess } from './trips';

// Trip-scoped recovery routes (mounted at /api/trips/:slug/recovery)
export const tripRecovery = new Hono<{ Bindings: Env; Variables: { trip: Trip } }>();

// All routes require trip auth
tripRecovery.use('*', verifyTripAccess);

// POST /api/trips/:slug/recovery - Add recovery email
tripRecovery.post('/', async (c) => {
  try {
    const trip = c.get('trip');
    const body = await c.req.json<AddRecoveryEmailRequest>();

    if (!body.email || typeof body.email !== 'string') {
      return c.json({ error: 'Email is required' }, 400);
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return c.json({ error: 'Invalid email format' }, 400);
    }

    const email = await db.addRecoveryEmail(c.env.DB, trip.id, body.email);
    return c.json({
      success: true,
      message: 'Recovery email added successfully',
      email: email.email
    }, 201);
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint')) {
      return c.json({ error: 'This email is already registered for this trip' }, 409);
    }
    console.error('Error adding recovery email:', error);
    return c.json({ error: 'Failed to add recovery email' }, 500);
  }
});

// GET /api/trips/:slug/recovery - List recovery emails for trip
tripRecovery.get('/', async (c) => {
  try {
    const trip = c.get('trip');
    const emails = await db.getRecoveryEmailsByTrip(c.env.DB, trip.id);
    // Only return masked emails for privacy
    const maskedEmails = emails.map(e => ({
      id: e.id,
      email: maskEmail(e.email),
      created_at: e.created_at
    }));
    return c.json(maskedEmails);
  } catch (error) {
    console.error('Error fetching recovery emails:', error);
    return c.json({ error: 'Failed to fetch recovery emails' }, 500);
  }
});

// DELETE /api/trips/:slug/recovery - Remove recovery email
tripRecovery.delete('/', async (c) => {
  try {
    const trip = c.get('trip');
    const body = await c.req.json<{ email: string }>();

    if (!body.email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    const deleted = await db.deleteRecoveryEmail(c.env.DB, trip.id, body.email);
    if (!deleted) {
      return c.json({ error: 'Email not found' }, 404);
    }

    return c.json({ success: true, message: 'Recovery email removed' });
  } catch (error) {
    console.error('Error deleting recovery email:', error);
    return c.json({ error: 'Failed to delete recovery email' }, 500);
  }
});

// Public recovery routes (mounted at /api/recovery)
const publicRecovery = new Hono<{ Bindings: Env }>();

// POST /api/recovery/request - Request magic link (no auth required)
// This endpoint looks up trips by email and would send an email with credentials
// For now, we'll just return the trip info (in production, this would send an email)
publicRecovery.post('/request', async (c) => {
  try {
    const body = await c.req.json<RecoveryRequest>();

    if (!body.email || typeof body.email !== 'string') {
      return c.json({ error: 'Email is required' }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return c.json({ error: 'Invalid email format' }, 400);
    }

    const trips = await db.getTripsByRecoveryEmail(c.env.DB, body.email);

    // Always return success to prevent email enumeration attacks
    // In production, we would send an email here with the trip credentials
    // For now, we'll return a generic success message
    if (trips.length === 0) {
      // Don't reveal whether email exists
      return c.json({
        success: true,
        message: 'If this email is registered with any trips, you will receive recovery instructions shortly.'
      });
    }

    // In a real implementation, we would:
    // 1. Generate a time-limited magic link token
    // 2. Send an email with the token
    // 3. User clicks the link to access their trips

    // For MVP without email sending, we return trip info directly
    // This is less secure but functional for testing
    const tripInfo = trips.map(t => ({
      slug: t.slug,
      name: t.name,
      url: `https://splitdumb.emilycogsdill.com/${t.slug}`
    }));

    return c.json({
      success: true,
      message: 'Recovery information found',
      trips: tripInfo,
      note: 'In production, this would be sent via email. You will need the trip password to access each trip.'
    });
  } catch (error) {
    console.error('Error processing recovery request:', error);
    return c.json({ error: 'Failed to process recovery request' }, 500);
  }
});

// Helper function to mask email for privacy
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***';

  const maskedLocal = local.length <= 2
    ? '*'.repeat(local.length)
    : local[0] + '*'.repeat(local.length - 2) + local[local.length - 1];

  return `${maskedLocal}@${domain}`;
}

export default publicRecovery;
