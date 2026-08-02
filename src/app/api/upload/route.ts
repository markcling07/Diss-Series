import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { normalizeCode } from '@/lib/gallery';
import { checkRateLimit, clientKey, tooManyRequests } from '@/lib/rate-limit';
import { UPLOADS_DIR, THUMBS_DIRNAME } from '@/lib/env';
import { ALLOWED_FORMATS, thumbRelativePath } from '@/lib/uploads';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

// Grid thumbnails render at most ~184px, so 400px covers high-DPI screens with
// room to spare. WebP at this size turns a multi-megabyte phone photo into a
// few KB, which is the difference between a gallery loading and appearing broken.
const THUMB_MAX_PX = 400;
const THUMB_QUALITY = 80;

const MAX_SIZE = 10 * 1024 * 1024;

// Uploading is open to guests by design, so this endpoint is reachable by
// anyone holding a share code. The limit is what stops a code from being a
// free, unbounded write channel into our disk.
const MAX_UPLOADS = 30;
const UPLOAD_WINDOW_MS = 10 * 60 * 1000;

// A gallery that has collected this many photos stops accepting them. Without a
// ceiling somewhere, one shared link can fill the volume and take down every
// other gallery with it.
const MAX_PHOTOS_PER_GALLERY = 500;

export async function POST(req: Request) {
  try {
    const limit = checkRateLimit(clientKey(req, 'upload'), MAX_UPLOADS, UPLOAD_WINDOW_MS);
    if (!limit.ok) {
      return tooManyRequests(limit.retryAfterSeconds);
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const caption = formData.get('caption') as string | null;
    const galleryCode = formData.get('galleryCode') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Checked before reading the body into memory, so an oversized upload costs
    // us the header and nothing more.
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    // Check if user is logged in
    const authUser = await getAuthUser();

    // Resolve the gallery before anything touches disk, so a bad code can't
    // leave an orphaned file in the uploads directory. Only the public code is
    // accepted here — never a galleryId supplied by the client.
    let galleryId: string | null = null;
    if (galleryCode) {
      const gallery = await prisma.gallery.findUnique({
        where: { code: normalizeCode(galleryCode) },
        select: { id: true, isOpen: true, _count: { select: { photos: true } } },
      });

      if (!gallery) {
        return NextResponse.json({ error: 'Invalid gallery code' }, { status: 400 });
      }

      // Enforced here, not just by hiding the upload form — the endpoint is
      // public, so a closed gallery has to refuse uploads on the server.
      if (!gallery.isOpen) {
        return NextResponse.json(
          { error: 'This gallery is closed and is no longer accepting photos' },
          { status: 403 }
        );
      }

      if (gallery._count.photos >= MAX_PHOTOS_PER_GALLERY) {
        return NextResponse.json(
          { error: `This gallery has reached its limit of ${MAX_PHOTOS_PER_GALLERY} photos` },
          { status: 403 }
        );
      }

      galleryId = gallery.id;
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // The bytes decide what this file is — not `file.type` (which the browser
    // supplies and a script can set to anything) and not the extension on
    // `file.name`. Deriving both from sharp's decode is what stops an .html
    // payload with an image/png content type from being stored under a name
    // this app would later serve back as markup.
    let format: string | undefined;
    try {
      format = (await sharp(buffer).metadata()).format;
    } catch {
      return NextResponse.json(
        { error: 'That file could not be read as an image.' },
        { status: 400 }
      );
    }

    const descriptor = format ? ALLOWED_FORMATS[format] : undefined;
    if (!descriptor) {
      return NextResponse.json(
        { error: 'Unsupported image format. Use JPEG, PNG, GIF, WebP or AVIF.' },
        { status: 400 }
      );
    }

    // Prepare upload directories
    const thumbsDir = path.join(UPLOADS_DIR, THUMBS_DIRNAME);
    await mkdir(thumbsDir, { recursive: true });

    // Generate unique filename. Both parts are ours: a timestamp for rough
    // ordering on disk, random bytes so names cannot be guessed or collided,
    // and an extension from the table above.
    const uniqueId = crypto.randomBytes(12).toString('hex');
    const stem = `${Date.now()}_${uniqueId}`;
    const filename = `${stem}${descriptor.ext}`;

    await writeFile(path.join(UPLOADS_DIR, filename), buffer);

    // Derive a small WebP thumbnail for the grid. A failure here must not fail
    // the upload — the original is already safely on disk, and the grid falls
    // back to it when thumbFilename is null.
    let thumbFilename: string | null = null;
    try {
      const generated = `${stem}.webp`;
      await sharp(buffer)
        .rotate() // honour EXIF orientation, or phone photos come out sideways
        .resize(THUMB_MAX_PX, THUMB_MAX_PX, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY })
        .toFile(path.join(thumbsDir, generated));
      thumbFilename = thumbRelativePath(generated);
    } catch (thumbError) {
      console.error('Thumbnail generation failed, serving original instead:', thumbError);
    }

    // Save database record. mimeType records what we determined the file to be,
    // so the serving route never has to consult anything the client wrote.
    const photo = await prisma.photo.create({
      data: {
        filename,
        thumbFilename,
        originalName: file.name,
        caption: caption?.trim() || null,
        mimeType: descriptor.mime,
        size: file.size,
        userId: authUser ? authUser.id : null,
        galleryId,
      },
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      photo,
      isGuest: !authUser,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to process upload' }, { status: 500 });
  }
}
