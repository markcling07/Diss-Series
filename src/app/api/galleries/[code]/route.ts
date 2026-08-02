import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { normalizeCode } from '@/lib/gallery';
import { removeUploadFiles } from '@/lib/uploads';
import { badRequestResponse, readJsonBody } from '@/lib/http';

// Public on purpose: knowing the code IS the authorization for this gallery.
// Returns no owner id and no email addresses, since anyone may reach this — the
// owner is reported only as a boolean so the page can show the owner's controls.
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const gallery = await prisma.gallery.findUnique({
    where: { code: normalizeCode(code) },
    select: { id: true, code: true, name: true, isOpen: true, createdAt: true, ownerId: true },
  });

  if (!gallery) {
    return NextResponse.json({ error: 'Gallery not found' }, { status: 404 });
  }

  const authUser = await getAuthUser();
  const isOwner = !!authUser && authUser.id === gallery.ownerId;

  const photos = await prisma.photo.findMany({
    where: { galleryId: gallery.id },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { username: true } } },
  });

  const { ownerId, ...publicGallery } = gallery;

  return NextResponse.json({ gallery: publicGallery, isOwner, photos });
}

// Owner-only: open or close the gallery to further uploads.
export async function PATCH(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json({ error: 'You must be signed in' }, { status: 401 });
    }

    const gallery = await prisma.gallery.findUnique({
      where: { code: normalizeCode(code) },
      select: { id: true, ownerId: true },
    });

    if (!gallery) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 });
    }

    // Holding the code lets you upload and view; only the owner may change how
    // the gallery behaves, or anyone with the link could close someone else's.
    if (gallery.ownerId !== authUser.id) {
      return NextResponse.json(
        { error: 'Only the gallery owner can change this' },
        { status: 403 }
      );
    }

    const body = await readJsonBody<{ isOpen?: unknown }>(req);

    if (typeof body.isOpen !== 'boolean') {
      return NextResponse.json({ error: 'isOpen must be true or false' }, { status: 400 });
    }

    const updated = await prisma.gallery.update({
      where: { id: gallery.id },
      data: { isOpen: body.isOpen },
      select: { id: true, code: true, name: true, isOpen: true, createdAt: true },
    });

    return NextResponse.json({ success: true, gallery: updated });
  } catch (error) {
    const badRequest = badRequestResponse(error);
    if (badRequest) return badRequest;

    console.error('Update gallery error:', error);
    return NextResponse.json({ error: 'Failed to update gallery' }, { status: 500 });
  }
}

// Owner-only, and it takes the photos with it.
//
// The schema's onDelete: SetNull would otherwise leave every photo behind with
// a null galleryId — alive in the database and on disk, but unreachable by the
// person who just deleted the only thing pointing at them. Removing them
// explicitly is what "delete this gallery" is understood to mean.
export async function DELETE(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json({ error: 'You must be signed in' }, { status: 401 });
    }

    const gallery = await prisma.gallery.findUnique({
      where: { code: normalizeCode(code) },
      select: {
        id: true,
        ownerId: true,
        photos: { select: { filename: true, thumbFilename: true } },
      },
    });

    if (!gallery) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 });
    }

    if (gallery.ownerId !== authUser.id) {
      return NextResponse.json(
        { error: 'Only the gallery owner can delete it' },
        { status: 403 }
      );
    }

    // One transaction, photos first: a half-deleted gallery — rows gone but the
    // gallery still listed, or the reverse — is worse than no deletion at all.
    await prisma.$transaction([
      prisma.photo.deleteMany({ where: { galleryId: gallery.id } }),
      prisma.gallery.delete({ where: { id: gallery.id } }),
    ]);

    // Only once the rows are committed, for the same reason as photo deletion:
    // orphaned files are invisible, rows pointing at missing files are not.
    await removeUploadFiles(
      gallery.photos.flatMap((photo) => [photo.filename, photo.thumbFilename])
    );

    return NextResponse.json({ success: true, deletedPhotos: gallery.photos.length });
  } catch (error) {
    console.error('Delete gallery error:', error);
    return NextResponse.json({ error: 'Failed to delete gallery' }, { status: 500 });
  }
}
