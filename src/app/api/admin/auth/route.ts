import { NextRequest, NextResponse } from 'next/server';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'ali-library-2025';

export async function POST(req: NextRequest) {
  try {
    const { secret } = await req.json();

    if (!secret || typeof secret !== 'string') {
      return NextResponse.json({ success: false, error: 'المفتاح مطلوب' }, { status: 400 });
    }

    if (secret === ADMIN_SECRET) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'المفتاح غير صحيح' });
  } catch {
    return NextResponse.json({ success: false, error: 'فشل في التحقق' }, { status: 500 });
  }
}
