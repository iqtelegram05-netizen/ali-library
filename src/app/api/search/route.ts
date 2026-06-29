import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/search?q=... — Search books by name (case-insensitive Arabic search)
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q') || '';

    if (q.trim()) {
      // Search mode: filter books whose names contain the query
      const books = await prisma.book.findMany({
        where: {
          name: {
            contains: q.trim(),
            mode: 'insensitive',
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ success: true, books, query: q.trim(), total: books.length });
    } else {
      // No query: return ALL books for grouped display
      const books = await prisma.book.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ success: true, books, query: '', total: books.length });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}