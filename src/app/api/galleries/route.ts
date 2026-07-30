import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { generateGalleryCode } from '@/lib/gallery';

const MAX_NAME_LENGTH = 80;

export async function POST(req: Request) {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json({ error: 'You must be signed in to create a gallery' }, { status: 401 });
    }

    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!name) {
      return NextResponse.json({ error: 'Gallery name is required' }, { status: 400 });
    }

    if (name.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Gallery name must be ${MAX_NAME_LENGTH} characters or fewer` },
        { status: 400 }
      );
    }

    // Retry on a duplicate code rather than checking first, which would race.
    // At this keyspace even one collision is vanishingly unlikely.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const gallery = await prisma.gallery.create({
          data: { code: generateGalleryCode(), name, ownerId: authUser.id },
          select: { id: true, code: true, name: true, createdAt: true },
        });

        return NextResponse.json({ success: true, gallery: { ...gallery, _count: { photos: 0 } } });
      } catch (error: any) {
        if (error?.code !== 'P2002') throw error; // P2002 = unique constraint failed
      }
    }

    return NextResponse.json({ error: 'Could not allocate a unique gallery code' }, { status: 500 });
  } catch (error) {
    console.error('Create gallery error:', error);
    return NextResponse.json({ error: 'Failed to create gallery' }, { status: 500 });
  }
}

export async function GET() {
  const authUser = await getAuthUser();

  if (!authUser) {
    return NextResponse.json({ error: 'You must be signed in to view your galleries' }, { status: 401 });
  }

  const galleries = await prisma.gallery.findMany({
    where: { ownerId: authUser.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      code: true,
      name: true,
      createdAt: true,
      _count: { select: { photos: true } },
    },
  });

  return NextResponse.json({ galleries });
}
