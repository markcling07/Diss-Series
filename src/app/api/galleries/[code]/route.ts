import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizeCode } from '@/lib/gallery';

// Public on purpose: knowing the code IS the authorization for this gallery.
// Returns no owner id and no email addresses, since anyone may reach this.
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const gallery = await prisma.gallery.findUnique({
    where: { code: normalizeCode(code) },
    select: { id: true, code: true, name: true, createdAt: true },
  });

  if (!gallery) {
    return NextResponse.json({ error: 'Gallery not found' }, { status: 404 });
  }

  const photos = await prisma.photo.findMany({
    where: { galleryId: gallery.id },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { username: true } } },
  });

  return NextResponse.json({ gallery, photos });
}
