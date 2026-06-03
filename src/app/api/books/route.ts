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

// GET /api/books — Public: anyone can see books
export async function GET() {
  try {
    const books = await prisma.book.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, books });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}

// DELETE /api/books — Bulk delete books by IDs or category
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error || 'يجب تسجيل الدخول' }, { status: 401 });
    }

    const body = await req.json();
    const { ids, category, deleteAll } = body;

    let deletedCount = 0;

    if (deleteAll) {
      // Delete ALL books
      const result = await prisma.book.deleteMany({});
      deletedCount = result.count;
    } else if (ids && Array.isArray(ids) && ids.length > 0) {
      // Delete specific books by IDs
      const result = await prisma.book.deleteMany({
        where: { id: { in: ids } },
      });
      deletedCount = result.count;
    } else if (category) {
      // Delete all books in a specific category
      const result = await prisma.book.deleteMany({
        where: { category },
      });
      deletedCount = result.count;
    } else {
      return NextResponse.json({ success: false, error: 'يجب تحديد كتب أو تصنيف للحذف' });
    }

    return NextResponse.json({ success: true, deletedCount });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}

// POST /api/books — Admin/Owner only: add a new book
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error || 'يجب تسجيل الدخول' }, { status: 401 });
    }

    const body = await req.json();
    const { name, url, category } = body;
    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'يجب توفير اسم الكتاب' });
    }
    if (!url || !url.trim()) {
      return NextResponse.json({ success: false, error: 'يجب توفير رابط الكتاب' });
    }

    const book = await prisma.book.create({
      data: {
        name: name.trim(),
        url: url.trim(),
        category: category || 'other',
        addedBy: auth.userId || undefined,
      },
    });

    return NextResponse.json({ success: true, book });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
