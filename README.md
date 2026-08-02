# DissPic

A shared photo archive. Someone creates a gallery, shares its eight-character
code, and anyone holding that code can add photos — no account needed. Accounts
exist only for the people who own galleries and for admins.

Next.js 16 (App Router, Turbopack) · Prisma · SQLite · sharp.

## The permission model, in one paragraph

**The gallery code is the permission.** Anyone who holds it can view the gallery
and upload to it. Codes are eight characters drawn from a 28-symbol alphabet
with a CSPRNG (`src/lib/gallery.ts`), giving ~3.7 × 10¹¹ combinations, and the
alphabet deliberately excludes vowels and the look-alikes `I L O 0 1` so a code
survives being read aloud or copied off a printout. Uploading is open by design,
which makes *deletion* the real access control: a photo can be removed by
whoever uploaded it while signed in, by the gallery's owner, or by an admin.

## Local development

```bash
cp .env.example .env       # then fill in JWT_SECRET
npx prisma migrate dev
npx tsx prisma/seed.ts     # creates the admin accounts
npm run dev
```

Runs on http://localhost:3000. To reach it from a phone on the same Wi-Fi, add
your machine's subnet to `allowedDevOrigins` in `next.config.ts`.

### Environment variables

| Variable       | Required            | Purpose |
| -------------- | ------------------- | ------- |
| `DATABASE_URL` | yes                 | Prisma connection string. SQLite paths are relative to `prisma/`. |
| `JWT_SECRET`   | yes in production   | Signs session cookies. The app **refuses to boot** in production without it rather than falling back to a default. |
| `UPLOADS_DIR`  | no (has a default)  | Where photos are written. Defaults to `./var/uploads`. |

## Where uploaded photos live

Not in `public/`. They are written to `UPLOADS_DIR` and served by the route
handler at `src/app/api/files/[...filePath]/route.ts`, which:

- resolves every path against the uploads root and rejects traversal,
- sets `Content-Type` from a closed allowlist keyed on the extension, and
- sends `X-Content-Type-Options: nosniff` so the browser cannot sniff past it.

That matters because uploads are open to guests. The upload route determines a
file's real format by decoding it with sharp and derives both the stored
extension and the recorded MIME type from *that* — never from `file.type` or the
client's filename. A file the decoder rejects is never written.

The directory also has to outlive a deploy, which is the other reason it sits
outside the app: `output: 'standalone'` does not copy `public/` at all, and any
deploy that replaces the application directory would take the photos with it.

## Deploying (VPS with a persistent volume)

Assumes a mounted volume at `/data` and nginx in front.

```bash
npm ci
npx prisma migrate deploy
npm run build
npm start
```

Environment:

```
NODE_ENV=production
DATABASE_URL="file:/data/disspic.db"
JWT_SECRET="<32 random bytes, hex>"
UPLOADS_DIR="/data/uploads"
```

Both the database and the uploads must be on the volume. Put them anywhere the
deploy can overwrite and the first redeploy silently destroys every photo.

**nginx** should terminate TLS and set `client_max_body_size 12M` — larger than
the app's own 10 MB cap, so oversized uploads are refused by the app with a
readable message rather than by the proxy with a bare 413.

### Rate limiting is per-process

`src/lib/rate-limit.ts` is an in-memory fixed-window counter. It protects a
single `next start` instance, which is what this deployment is. Run more than
one instance and each gets its own allowance — at that point move the limits to
nginx or Redis. The limiter keys on the *rightmost* `X-Forwarded-For` entry, the
one your own proxy appends; make sure nginx sets it (`proxy_set_header
X-Forwarded-For $proxy_add_x_forwarded_for;`), because with the header absent
every caller collapses into a single shared bucket.

## Current limits

| Action | Limit |
| ------ | ----- |
| Login attempts | 10 per 5 min per IP |
| Signups | 5 per hour per IP |
| Uploads | 30 per 10 min per IP |
| File size | 10 MB |
| Photos per gallery | 500 |
| Galleries per user | 50 |

## Roles

`USER`, `ADMIN`, `SUPER_ADMIN`. Only a `SUPER_ADMIN` can change roles, and the
route refuses to let one demote themselves — otherwise the last super-admin
could lock everyone out of the admin surface.

## Tests

```bash
npm test          # once
npm run test:watch
```

Vitest, `environment: 'node'`, colocated as `src/lib/*.test.ts`. The suite
covers the security-critical pure functions rather than the UI: gallery code
generation and its alphabet, upload path resolution and the content-type
allowlist, the rate limiter's windows and its `X-Forwarded-For` handling, the
JWT secret's refusal to fall back in production, and JSON body parsing.

Routes and components are not unit-tested. They need a database, a filesystem
and a request — end-to-end territory, and the honest place to add coverage next.

## Known gaps

- No password reset and no email verification. Both need mail delivery, which
  this app has no dependency on yet.
- No end-to-end tests (see above).

## Branches

`dev-cling` → `Staging` → `main` (capital S; git is case-sensitive).

## A note on OneDrive

The working copy lives inside a OneDrive folder. Sync and the dev server's file
watcher can fight, pinning several CPU cores and rewriting `.next` in a loop.
Pause sync before long dev sessions and before switching branches.
