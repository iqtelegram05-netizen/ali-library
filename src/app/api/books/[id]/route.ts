import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/session';
import { prisma } from '@/lib/db';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'ali-library-2025';

// Verify auth via NextAuth session OR Admin Secret Bearer token
async function verifyAdminAuth(req: NextRequest): Promise<{ authenticated: boolean; userId?: string; error?: string }> {
  // First try NextAuth session
  try {
    const session = await getAppSession();
    if (session?.user) {
      const role = (session.user as any).role;
      if (role === 'owner' || role === 'admin') {
        return { authenticated: true, userId: session.user.id };
      }
      return { authenticated: false, error: 'ليس لديك صلاحية' };
    }
  } catch { /* session check failed, try admin secret */ }

  // Then try Admin Secret Bearer token
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (token === ADMIN_SECRET) {
      return { authenticated: true };
    }
  }

  return { authenticated: false, error: 'يجب تسجيل الدخول' };
}

// DELETE /api/books/[id] — Admin only
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error || 'يجب تسجيل الدخول' }, { status: 401 });
    }

    const { id } = await params;
    await prisma.book.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}

// PUT /api/books/[id] — Admin only: edit a book
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error || 'يجب تسجيل الدخول' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, url, category } = body;

    const updateData: Record<string, string> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (url !== undefined) updateData.url = url.trim();
    if (category !== undefined) updateData.category = category;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'لم يتم تقديم بيانات للتحديث' });
    }

    const book = await prisma.book.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, book });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
