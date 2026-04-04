import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// ---------------------------------------------------------------------------
// Setup — set encryption key before importing the module
// ---------------------------------------------------------------------------

const TEST_KEY = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
let originalKey: string | undefined;

beforeAll(() => {
  originalKey = process.env.CREDENTIALS_ENCRYPTION_KEY;
  process.env.CREDENTIALS_ENCRYPTION_KEY = TEST_KEY;
});

afterAll(() => {
  if (originalKey !== undefined) {
    process.env.CREDENTIALS_ENCRYPTION_KEY = originalKey;
  } else {
    delete process.env.CREDENTIALS_ENCRYPTION_KEY;
  }
});

// Import after env is set
import { encrypt, decrypt } from '@/lib/encryption';

// ============================================================================
// Encryption round-trip tests
// ============================================================================

describe('encrypt / decrypt', () => {
  it('encrypt output differs from input', () => {
    const plaintext = 'my-secret-api-key-12345';
    const ciphertext = encrypt(plaintext);

    expect(ciphertext).not.toBe(plaintext);
    // Should be in iv:authTag:encrypted format
    expect(ciphertext.split(':')).toHaveLength(3);
  });

  it('decrypt(encrypt(value)) === value', () => {
    const plaintext = 'super-secret-token-abc-xyz';
    const ciphertext = encrypt(plaintext);
    const decrypted = decrypt(ciphertext);

    expect(decrypted).toBe(plaintext);
  });

  it('encrypt produces different ciphertext each call (different IVs)', () => {
    const plaintext = 'same-input-every-time';
    const ciphertext1 = encrypt(plaintext);
    const ciphertext2 = encrypt(plaintext);

    expect(ciphertext1).not.toBe(ciphertext2);

    // Both should still decrypt to the same value
    expect(decrypt(ciphertext1)).toBe(plaintext);
    expect(decrypt(ciphertext2)).toBe(plaintext);
  });

  it('decrypt throws on malformed format', () => {
    // Missing parts — not in iv:authTag:encrypted format
    expect(() => decrypt('not-valid-format')).toThrow(
      'Invalid encrypted text format'
    );

    // Only two parts
    expect(() => decrypt('abcd:efgh')).toThrow(
      'Invalid encrypted text format'
    );
  });

  it('decrypt throws on tampered data', () => {
    const plaintext = 'important-credential';
    const ciphertext = encrypt(plaintext);
    const parts = ciphertext.split(':');

    // Tamper with the encrypted data portion (flip last character)
    const tampered = parts[2];
    const lastChar = tampered[tampered.length - 1];
    const flippedChar = lastChar === '0' ? '1' : '0';
    const tamperedEncrypted = tampered.slice(0, -1) + flippedChar;

    const tamperedCiphertext = `${parts[0]}:${parts[1]}:${tamperedEncrypted}`;

    expect(() => decrypt(tamperedCiphertext)).toThrow();
  });
});
