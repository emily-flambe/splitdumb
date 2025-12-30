// src/api/export.test.ts
import { describe, it, expect } from 'vitest';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import app from '../index';

describe('export endpoint', () => {
  it('requires authentication', async () => {
    const request = new Request('http://localhost/api/trips/test-slug/export');
    const ctx = createExecutionContext();
    const response = await app.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty('error', 'Password required');
  });
});
