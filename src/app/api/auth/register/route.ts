import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

/* ===================================================================
   Registration API — Simplified for Al-Ali Digital Library.
   Only requires: phone, password, fullName.
   address, country, idPhoto, facePhoto are optional.
   =================================================================== */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, password, fullName, address, country, idPhoto, facePhoto } = body;

    // Validation — only phone, password, and fullName are required
    if (!phone || !password || !fullName) {
      return NextResponse.json({
        success: false,
        error: 'يرجى إدخال رقم الهاتف وكلمة السر والاسم الكامل',
      }, { status: 400 });
    }

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Validate phone
    if (!/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
      return NextResponse.json({
        success: false,
        error: 'رقم الهاتف غير صالح. يرجى إدخال رقم هاتف صحيح.',
      }, { status: 400 });
    }

    // Validate password (minimum 6 characters)
    if (password.length < 6) {
      return NextResponse.json({
        success: false,
        error: 'كلمة السر يجب أن تكون 6 أحرف على الأقل.',
      }, { status: 400 });
    }

    // Validate fullName (at least 2 words)
    const nameWords = fullName.trim().split(/\s+/);
    if (nameWords.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'يرجى إدخال الاسم الكامل (الاسم الأول والأخير على الأقل).',
      }, { status: 400 });
    }

    // Validate optional photos if provided
    if (idPhoto && (!idPhoto.startsWith('data:image/') || idPhoto.length > 5 * 1024 * 1024)) {
      return NextResponse.json({
        success: false,
        error: 'صورة الهوية غير صالحة أو حجمها أكبر من 5 ميجابايت.',
      }, { status: 400 });
    }
    if (facePhoto && (!facePhoto.startsWith('data:image/') || facePhoto.length > 5 * 1024 * 1024)) {
      return NextResponse.json({
        success: false,
        error: 'صورة الوجه غير صالحة أو حجمها أكبر من 5 ميجابايت.',
      }, { status: 400 });
    }

    // Check if phone already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone: cleanPhone },
    });

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'رقم الهاتف مسجل مسبقاً. يرجى تسجيل الدخول بدلاً من ذلك.',
      }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Check if this is the owner phone
    const ownerPhone = process.env.OWNER_PHONE;
    const isOwner = ownerPhone && cleanPhone === ownerPhone.replace(/[\s\-\(\)]/g, '');

    // Create user
    const user = await prisma.user.create({
      data: {
        phone: cleanPhone,
        password: hashedPassword,
        fullName: fullName.trim(),
        name: fullName.trim(),
        address: address?.trim() || null,
        country: country?.trim() || null,
        idPhoto: idPhoto || null,
        facePhoto: facePhoto || null,
        role: isOwner ? 'owner' : 'user',
        isVerified: false,
      },
      select: {
        id: true,
        phone: true,
        fullName: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.',
      user,
    });
  } catch (error: any) {
    console.error('[AUTH /api/auth/register] Error:', error?.message || error);
    return NextResponse.json({
      success: false,
      error: 'حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة لاحقاً.',
    }, { status: 500 });
  }
}
