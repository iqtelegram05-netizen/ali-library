import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Try a simple query to test connection
    const count = await prisma.book.count();
    return NextResponse.json({
      success: true,
      connected: true,
      bookCount: count,
      message: `قاعدة البيانات متصلة — عدد الكتب: ${count}`,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      connected: false,
      error: error.message,
      hint: 'تأكد من إضافة POSTGRES_URL في Environment Variables على Vercel',
    });
  }
}
