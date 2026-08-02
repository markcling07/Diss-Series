import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { badRequestResponse, readJsonBody } from '@/lib/http';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();

    if (!authUser || authUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: SuperAdmin access required' }, { status: 403 });
    }

    const { id } = await params;
    const { role } = await readJsonBody<{ role?: string }>(req);

    const allowedRoles = ['USER', 'ADMIN', 'SUPER_ADMIN'];
    if (typeof role !== 'string' || !allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Protect against demoting self
    if (id === authUser.id && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'You cannot demote yourself' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    const badRequest = badRequestResponse(error);
    if (badRequest) return badRequest;

    console.error('Update role error:', error);
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
  }
}
