import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  const authUser = await getAuthUser();

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const photos = await prisma.photo.findMany({
    where: { userId: authUser.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ photos });
}
