import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/session';
import { prisma } from '@/lib/db';

// DELETE /api/books/[id] — Owner only
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAppSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'يجب تسجيل الدخول' }, { status: 401 });
    }
    const userRole = session.user.role;
    if (userRole !== 'owner') {
      return NextResponse.json({ success: false, error: 'ليس لديك صلاحية حذف الكتب' }, { status: 403 });
    }

    const { id } = await params;
    await prisma.book.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
