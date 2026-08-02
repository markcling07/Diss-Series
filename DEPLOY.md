# Deploying DissPic to Railway

Single instance, SQLite and uploaded photos both on one persistent volume. This
is the right shape for getting feedback; see [When to outgrow this](#when-to-outgrow-this)
for the point where it stops being.

## Before you start

Push your work. Railway deploys from GitHub, so nothing local is used:

```powershell
git add -A
git commit -m "Harden for production and add deploy config"
git push origin dev-cling
```

Generate the two secrets you'll need — keep the terminal open, you'll paste
these in step 4:

```powershell
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('SEED_SUPERADMIN_PASSWORD=' + require('crypto').randomBytes(18).toString('base64url'))"
```

## 1. Create the project

railway.app → **New Project** → **Deploy from GitHub repo** → pick
`markcling07/Diss-Series` → choose the branch you pushed.

The first build will **fail**, or succeed and then crash on boot. That is
expected — there is no volume and no `JWT_SECRET` yet. The app refusing to start
without a secret is deliberate, not a bug.

## 2. Add the volume

Service → **Variables** tab's neighbour, **Settings** → **Volumes** → **New Volume**.

- Mount path: `/data`
- Size: 5 GB is plenty to start (500 photos × 10 MB ceiling ≈ 5 GB worst case)

Everything that must survive a deploy lives here. Nothing else does.

## 3. Confirm the build settings

Railway's Nixpacks should detect Node, but the pre-deploy command must be set by
hand. Under **Settings → Build/Deploy**:

- Build command: `npm run build` (runs `prisma generate` then `next build`)
- **Pre-Deploy Command: `npm run migrate`**
- Start command: `npm start` (just `next start`)

Migrations belong in the pre-deploy step, not the start command. Chaining them
onto startup delays the server binding a port, and on a cold deploy the
migration can take longer than the healthcheck window — so Railway kills the
container as unhealthy, and a manual restart then "fixes" it because the
migration is already applied and returns instantly. That produces exactly the
symptom of a deploy that crashes intermittently and succeeds on retry.

Pre-deploy runs with the volume mounted and the environment present, and a
failed migration blocks promotion of the bad deploy instead of crash-looping it.

## 4. Set the environment variables

**Variables** tab → **Raw Editor**, paste, substituting your generated values:

```
NODE_ENV=production
DATABASE_URL=file:/data/disspic.db
UPLOADS_DIR=/data/uploads
JWT_SECRET=<the 64-char hex from earlier>
```

Do **not** set `PORT`. Railway injects it and `next start` reads it; setting it
yourself is a common way to end up with a service that never passes a health
check.

Note `DATABASE_URL` is an absolute path. The local `file:./dev.db` is relative
to `prisma/`, which is inside the deployable app directory — exactly the thing
that gets replaced on every deploy.

## 5. Deploy and get a URL

Redeploy. Then **Settings → Networking → Generate Domain** for a
`*.up.railway.app` hostname with HTTPS already terminated.

Check the deploy logs for:

```
✔ Generated Prisma Client        ← build
✓ Compiled successfully          ← build
Applying migration ...           ← pre-deploy, first deploy only
✓ Ready in ...                   ← start
```

## 6. Create your admin account

The seed refuses to run in production without an explicit password. From
Railway's shell (service → **⋮** → **Shell**), or `railway run` locally:

```bash
SEED_SUPERADMIN_PASSWORD='<generated>' SEED_ADMIN_PASSWORD='<generated>' npm run seed
```

Then sign in at `/login` as `superadmin@app.com`.

Re-running the seed later will **not** reset an existing password — it only
fixes the role. Rotating a password is a deliberate act, not a side effect of
redeploying.

## 7. Smoke-test the deploy

In order, because each depends on the last:

1. `/` loads.
2. Register a throwaway account — proves the DB is writable on the volume.
3. Create a gallery — proves code generation and the owner relation.
4. Upload a photo from your phone via the share link — proves `UPLOADS_DIR` is
   writable and that `sharp` built correctly on Linux.
5. Reload the gallery — proves `/api/files/...` serves from the volume.
6. **Redeploy, then reload the gallery again.** This is the one that matters: it
   proves the photos survived. If they vanish, `UPLOADS_DIR` is not on the
   volume.

## Gotchas specific to this app

**`sharp` on Linux.** It ships prebuilt binaries per platform. Your lockfile was
generated on Windows, so if the build fails resolving `@img/sharp-*`, run
`npm i --os=linux --cpu=x64 sharp` locally and commit the updated lockfile.

**The rate limiter is per-process and keys on `X-Forwarded-For`.** Railway's
proxy sets it, so limits will apply per visitor as intended. If you ever scale
to two instances, each keeps its own counters and the effective limit doubles.

**Uploads are open to anyone holding a gallery code.** That is the product
design, but on a public URL it means a shared link is a public write endpoint,
bounded only by the 500-photos-per-gallery cap and the rate limit. Worth knowing
before you post a code anywhere indexable.

**`allowedDevOrigins` in `next.config.ts` is dev-only** and has no effect here.
No need to add the Railway domain to it.

## When to outgrow this

This setup is deliberately single-instance. Move off it when any of these become
true:

- You need more than one instance (SQLite writes and the in-memory rate limiter
  both assume one) → Postgres + Redis.
- Photos outgrow the volume, or you want a CDN in front of them → object storage
  (S3/R2) behind the same `/api/files` route.
- Downtime during redeploys stops being acceptable → the single volume makes
  zero-downtime deploys awkward.

None of these are near at feedback scale.
