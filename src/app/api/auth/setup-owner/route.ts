import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST() {
  try {
    const ownerEmail = process.env.OWNER_EMAIL;
    if (!ownerEmail) {
      return NextResponse.json({ success: false, error: 'OWNER_EMAIL غير معرف في متغيرات البيئة' });
    }

    const user = await prisma.user.findUnique({ where: { email: ownerEmail } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'لم يتم العثور على مستخدم بهذا البريد. سجّل الدخول أولاً ثم أعد المحاولة.' });
    }

    await prisma.user.update({
      where: { email: ownerEmail },
      data: { role: 'owner' },
    });

    return NextResponse.json({ success: true, message: `تم تعيين ${ownerEmail} كمالك` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
