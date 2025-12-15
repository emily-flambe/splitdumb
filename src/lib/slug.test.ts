// src/lib/slug.test.ts
import { describe, it, expect } from 'vitest';
import { generateSlug, ADJECTIVES, ANIMALS, NOUNS } from './slug';

describe('generateSlug', () => {
  it('returns a string with three words separated by hyphens', () => {
    const slug = generateSlug();
    const parts = slug.split('-');
    expect(parts).toHaveLength(3);
  });

  it('uses valid adjective, animal, noun', () => {
    const slug = generateSlug();
    const [adj, animal, noun] = slug.split('-');
    expect(ADJECTIVES).toContain(adj);
    expect(ANIMALS).toContain(animal);
    expect(NOUNS).toContain(noun);
  });

  it('generates different slugs on multiple calls', () => {
    const slugs = new Set(Array.from({ length: 10 }, () => generateSlug()));
    expect(slugs.size).toBeGreaterThan(1);
  });
});
