import path from 'path';

// Configuration that must differ between a laptop and a real server lives here,
// so there is one place to look when a deploy behaves unlike development.
//
// The rule throughout: development gets a convenient default, production gets an
// exception. A missing secret that silently falls back is worse than a server
// that refuses to boot — the fallback looks like it works right up until someone
// forges a token with the value they read out of the repository.

function requiredInProduction(name: string, developmentFallback: string): string {
  const value = process.env[name];
  if (value) return value;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `${name} is not set. Refusing to start in production with a default value — ` +
        `generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }

  return developmentFallback;
}

export function getJwtSecret(): string {
  return requiredInProduction('JWT_SECRET', 'dev-only-insecure-secret');
}

// Uploads must survive a deploy, so they cannot live inside the application
// directory that gets replaced. On a server this points at a mounted volume
// (UPLOADS_DIR=/data/uploads); locally it defaults to ./var/uploads, which is
// gitignored. Deliberately *not* under public/ — see the files route handler for
// why user-uploaded bytes are never served as static assets.
export const UPLOADS_DIR =
  process.env.UPLOADS_DIR || path.join(process.cwd(), 'var', 'uploads');

export const THUMBS_DIRNAME = 'thumbs';
