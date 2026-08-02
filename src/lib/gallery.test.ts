import { describe, expect, it } from 'vitest';
import { generateGalleryCode, normalizeCode } from './gallery';

// The code is the whole permission model: holding one grants upload access to a
// gallery. These tests pin the two properties that makes it safe to hand out —
// that it is drawn from the intended alphabet, and that it is long enough that
// guessing is not a strategy.

const ALPHABET = 'BCDFGHJKMNPQRSTVWXYZ23456789';

describe('generateGalleryCode', () => {
  it('produces eight characters', () => {
    for (let i = 0; i < 100; i++) {
      expect(generateGalleryCode()).toHaveLength(8);
    }
  });

  it('only uses the documented alphabet', () => {
    for (let i = 0; i < 200; i++) {
      for (const char of generateGalleryCode()) {
        expect(ALPHABET).toContain(char);
      }
    }
  });

  it('never emits a character that is ambiguous when read aloud', () => {
    // I/L/O/0/1 are excluded so a code survives a printout or a phone call, and
    // vowels are excluded so a code cannot accidentally spell a word.
    const forbidden = /[ILO01AEU]/;

    for (let i = 0; i < 200; i++) {
      expect(generateGalleryCode()).not.toMatch(forbidden);
    }
  });

  it('does not repeat across a large sample', () => {
    // Not a randomness proof — a cheap guard against someone replacing the
    // CSPRNG with something seeded or stateful, which would show up instantly
    // as collisions at this sample size.
    const codes = new Set<string>();
    for (let i = 0; i < 5000; i++) {
      codes.add(generateGalleryCode());
    }
    expect(codes.size).toBe(5000);
  });

  it('uses every symbol in the alphabet given enough draws', () => {
    // Catches an off-by-one in the index range that would silently make one end
    // of the alphabet unreachable and shrink the keyspace.
    const seen = new Set<string>();
    for (let i = 0; i < 20000; i++) {
      for (const char of generateGalleryCode()) seen.add(char);
    }
    expect(seen.size).toBe(ALPHABET.length);
  });
});

describe('normalizeCode', () => {
  it('uppercases and trims, because lookups are case-sensitive in SQLite', () => {
    expect(normalizeCode('  bcdf2345  ')).toBe('BCDF2345');
  });

  it('leaves an already-normal code untouched', () => {
    expect(normalizeCode('BCDF2345')).toBe('BCDF2345');
  });
});
