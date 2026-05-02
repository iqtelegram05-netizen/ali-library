import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/admin/users — Owner/Admin: list all users
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }
    const role = (session.user as any).role;
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        displayName: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}

// PUT /api/admin/users — Owner only: update user role
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }
    if ((session.user as any).role !== 'owner') {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 403 });
    }

    const { userId, role } = await req.json();
    if (!userId || !role) {
      return NextResponse.json({ success: false, error: 'بيانات غير مكتملة' });
    }
    if (!['user', 'admin'].includes(role)) {
      return NextResponse.json({ success: false, error: 'دور غير صالح' });
    }

    // Prevent owner from demoting themselves
    if ((session.user as any).id === userId && role !== 'owner') {
      return NextResponse.json({ success: false, error: 'لا يمكنك تغيير دورك' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
