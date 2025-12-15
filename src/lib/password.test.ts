// src/lib/password.test.ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, generatePassword } from './password';

describe('password utilities', () => {
  describe('generatePassword', () => {
    it('generates a password with default length', () => {
      const password = generatePassword();
      expect(password.length).toBe(12);
    });

    it('generates different passwords each time', () => {
      const passwords = new Set(Array.from({ length: 10 }, () => generatePassword()));
      expect(passwords.size).toBeGreaterThan(1);
    });
  });

  describe('hashPassword and verifyPassword', () => {
    it('verifies correct password', async () => {
      const password = 'test-password-123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('rejects incorrect password', async () => {
      const hash = await hashPassword('correct-password');
      const isValid = await verifyPassword('wrong-password', hash);
      expect(isValid).toBe(false);
    });

    it('produces different hashes for same password', async () => {
      const password = 'same-password';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      expect(hash1).not.toBe(hash2);
    });
  });
});
