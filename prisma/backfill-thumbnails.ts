/**
 * One-off backfill: generates thumbnails for photos uploaded before thumbnail
 * support existed. Safe to re-run — it skips any photo that already has one.
 *
 *   npx tsx prisma/backfill-thumbnails.ts
 */
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const THUMB_MAX_PX = 400;
const THUMB_QUALITY = 80;

const prisma = new PrismaClient({ log: [] });

async function main() {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  const thumbsDir = path.join(uploadsDir, 'thumbs');
  fs.mkdirSync(thumbsDir, { recursive: true });

  const photos = await prisma.photo.findMany({ where: { thumbFilename: null } });
  console.log(`${photos.length} photo(s) without a thumbnail`);

  let done = 0;
  let skipped = 0;

  for (const photo of photos) {
    const source = path.join(uploadsDir, photo.filename);

    if (!fs.existsSync(source)) {
      console.log(`  skip ${photo.filename} — file missing on disk`);
      skipped++;
      continue;
    }

    try {
      const ext = path.extname(photo.filename);
      const generated = `${path.basename(photo.filename, ext)}.webp`;

      await sharp(source)
        .rotate()
        .resize(THUMB_MAX_PX, THUMB_MAX_PX, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY })
        .toFile(path.join(thumbsDir, generated));

      await prisma.photo.update({
        where: { id: photo.id },
        data: { thumbFilename: `thumbs/${generated}` },
      });

      const before = fs.statSync(source).size;
      const after = fs.statSync(path.join(thumbsDir, generated)).size;
      console.log(
        `  ${photo.originalName}: ${(before / 1048576).toFixed(1)} MB -> ${(after / 1024).toFixed(0)} KB`
      );
      done++;
    } catch (error) {
      console.log(`  failed ${photo.filename}:`, (error as Error).message);
      skipped++;
    }
  }

  console.log(`\ndone: ${done} generated, ${skipped} skipped`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
