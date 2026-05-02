import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

// POST /api/books — Admin/Owner only: add a new book
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'يجب تسجيل الدخول' }, { status: 401 });
    }
    const userRole = (session.user as any).role;
    if (userRole !== 'owner' && userRole !== 'admin') {
      return NextResponse.json({ success: false, error: 'ليس لديك صلاحية إضافة كتب' }, { status: 403 });
    }

    const body = await req.json();
    const { name, url, category } = body;
    if (!name || !url) {
      return NextResponse.json({ success: false, error: 'يجب توفير اسم الكتاب والرابط' });
    }

    const book = await prisma.book.create({
      data: {
        name,
        url,
        category: category || 'other',
        addedBy: (session.user as any).id,
      },
    });

    return NextResponse.json({ success: true, book });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
