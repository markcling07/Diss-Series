import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { normalizeCode } from '@/lib/gallery';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

// Grid thumbnails render at most ~184px, so 400px covers high-DPI screens with
// room to spare. WebP at this size turns a multi-megabyte phone photo into a
// few KB, which is the difference between a gallery loading and appearing broken.
const THUMB_MAX_PX = 400;
const THUMB_QUALITY = 80;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const caption = formData.get('caption') as string | null;
    const galleryCode = formData.get('galleryCode') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Validate file type
    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validMimeTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    // Check if user is logged in
    const authUser = await getAuthUser();

    // Resolve the gallery before anything touches disk, so a bad code can't
    // leave an orphaned file in public/uploads. Only the public code is
    // accepted here — never a galleryId supplied by the client.
    let galleryId: string | null = null;
    if (galleryCode) {
      const gallery = await prisma.gallery.findUnique({
        where: { code: normalizeCode(galleryCode) },
        select: { id: true, isOpen: true },
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

      galleryId = gallery.id;
    }

    // Prepare upload directories
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const thumbsDir = path.join(uploadsDir, 'thumbs');
    await mkdir(thumbsDir, { recursive: true });

    // Generate unique filename
    const ext = path.extname(file.name) || `.${file.type.split('/')[1]}`;
    const uniqueId = crypto.randomBytes(12).toString('hex');
    const filename = `${Date.now()}_${uniqueId}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    // Save file bytes
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Derive a small WebP thumbnail for the grid. A failure here must not fail
    // the upload — the original is already safely on disk, and the grid falls
    // back to it when thumbFilename is null.
    let thumbFilename: string | null = null;
    try {
      const generated = `${path.basename(filename, ext)}.webp`;
      await sharp(buffer)
        .rotate() // honour EXIF orientation, or phone photos come out sideways
        .resize(THUMB_MAX_PX, THUMB_MAX_PX, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY })
        .toFile(path.join(thumbsDir, generated));
      thumbFilename = `thumbs/${generated}`;
    } catch (thumbError) {
      console.error('Thumbnail generation failed, serving original instead:', thumbError);
    }

    // Save database record
    const photo = await prisma.photo.create({
      data: {
        filename,
        thumbFilename,
        originalName: file.name,
        caption: caption?.trim() || null,
        mimeType: file.type,
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
