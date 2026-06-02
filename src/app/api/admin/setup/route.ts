import { NextResponse } from 'next/server';

// This endpoint returns the default admin secret info.
// If ADMIN_SECRET is set in environment, it takes priority.
// Default fallback: "ali-library-2025"
export async function GET() {
  const adminSecret = process.env.ADMIN_SECRET || 'ali-library-2025';

  return NextResponse.json({
    configured: !!process.env.ADMIN_SECRET,
    hint: 'اضبط ADMIN_SECRET في متغيرات البيئة لتغيير مفتاح المشرف',
    // Never return the actual secret, only confirm it's set
  });
}
