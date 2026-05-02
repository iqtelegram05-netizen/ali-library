import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// PUT /api/user/profile — Update user display name
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'يجب تسجيل الدخول' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ success: false, error: 'معرف المستخدم غير موجود' }, { status: 401 });
    }

    const body = await req.json();
    const { displayName } = body;

    if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'يجب إدخال اسم صالح' });
    }

    if (displayName.trim().length > 50) {
      return NextResponse.json({ success: false, error: 'الاسم طويل جداً (الحد الأقصى 50 حرف)' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { displayName: displayName.trim() },
      select: {
        id: true,
        name: true,
        displayName: true,
        email: true,
        image: true,
        role: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
