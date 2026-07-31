import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { normalizeCode } from '@/lib/gallery';

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

    const body = await req.json();

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
    console.error('Update gallery error:', error);
    return NextResponse.json({ error: 'Failed to update gallery' }, { status: 500 });
  }
}
