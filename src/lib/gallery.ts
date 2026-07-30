import crypto from 'crypto';

// No vowels, so a code can never accidentally spell a word.
// No I, L, O, 0 or 1, so it survives being read aloud or copied off a printout.
const CODE_ALPHABET = 'BCDFGHJKMNPQRSTVWXYZ23456789';
const CODE_LENGTH = 8;

// 28^8 is about 3.7e11 — short enough to dictate across a room, large enough
// that guessing a code is impractical. Holding a code grants upload access.
export function generateGalleryCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    // randomInt rejection-samples, so unlike randomBytes() % 28 it stays unbiased.
    code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

// Codes are always stored uppercase. SQLite has no case-insensitive lookup in
// Prisma, so every code lookup goes through here first.
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}
