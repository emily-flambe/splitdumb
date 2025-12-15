// src/lib/slug.ts
export const ADJECTIVES = [
  'happy', 'brave', 'quick', 'calm', 'bright',
  'clever', 'gentle', 'kind', 'proud', 'swift',
  'warm', 'wild', 'bold', 'cool', 'eager',
  'fair', 'grand', 'jolly', 'keen', 'lucky'
];

export const ANIMALS = [
  'fox', 'owl', 'bear', 'wolf', 'deer',
  'hawk', 'lion', 'tiger', 'eagle', 'otter',
  'panda', 'koala', 'raven', 'shark', 'whale',
  'zebra', 'moose', 'lynx', 'crane', 'heron'
];

export const NOUNS = [
  'river', 'mountain', 'forest', 'meadow', 'canyon',
  'valley', 'island', 'sunset', 'thunder', 'crystal',
  'summit', 'rapids', 'glacier', 'prairie', 'harbor',
  'ridge', 'creek', 'grove', 'trail', 'peak'
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateSlug(): string {
  return `${randomItem(ADJECTIVES)}-${randomItem(ANIMALS)}-${randomItem(NOUNS)}`;
}
