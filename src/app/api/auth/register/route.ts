import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

/* ===================================================================
   Registration API — Simplified for Al-Ali Digital Library.
   Only requires: phone, password, fullName.
   =================================================================== */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, password, fullName } = body;

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

    // Check if phone already exists
    try {
      const existingUser = await prisma.user.findUnique({
        where: { phone: cleanPhone },
      });

      if (existingUser) {
        return NextResponse.json({
          success: false,
          error: 'رقم الهاتف مسجل مسبقاً. يرجى تسجيل الدخول بدلاً من ذلك.',
        }, { status: 409 });
      }
    } catch (dbErr: any) {
      console.error('[REGISTER] DB findUnique error:', dbErr?.message || dbErr);
      return NextResponse.json({
        success: false,
        error: 'خطأ في الاتصال بقاعدة البيانات. يرجى المحاولة لاحقاً.',
      }, { status: 503 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Check if this is the owner phone
    const ownerPhone = process.env.OWNER_PHONE;
    const isOwner = ownerPhone && cleanPhone === ownerPhone.replace(/[\s\-\(\)]/g, '');

    // Create user — only use core fields to avoid schema mismatch
    let user;
    try {
      const createData: Record<string, any> = {
        phone: cleanPhone,
        password: hashedPassword,
        fullName: fullName.trim(),
        name: fullName.trim(),
        role: isOwner ? 'owner' : 'user',
        isVerified: false,
      };

      user = await prisma.user.create({
        data: createData,
        select: {
          id: true,
          phone: true,
          fullName: true,
          role: true,
          isVerified: true,
          createdAt: true,
        },
      });
    } catch (createErr: any) {
      console.error('[REGISTER] DB create error:', createErr?.message || createErr);

      // Handle unique constraint violation
      if (createErr?.code === 'P2002') {
        return NextResponse.json({
          success: false,
          error: 'رقم الهاتف مسجل مسبقاً. يرجى تسجيل الدخول بدلاً من ذلك.',
        }, { status: 409 });
      }

      // Handle missing column/field errors
      const errMsg = String(createErr?.message || createErr);
      if (errMsg.includes('does not exist') || errMsg.includes('column') || errMsg.includes('field')) {
        console.error('[REGISTER] Schema mismatch detected — attempting minimal create...');
        try {
          user = await prisma.user.create({
            data: {
              phone: cleanPhone,
              password: hashedPassword,
              name: fullName.trim(),
              role: isOwner ? 'owner' : 'user',
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
        } catch (retryErr: any) {
          console.error('[REGISTER] Minimal create also failed:', retryErr?.message || retryErr);
          return NextResponse.json({
            success: false,
            error: 'خطأ في قاعدة البيانات. يرجى المحاولة لاحقاً.',
          }, { status: 500 });
        }
      } else {
        return NextResponse.json({
          success: false,
          error: 'خطأ أثناء إنشاء الحساب: ' + (errMsg.substring(0, 100)),
        }, { status: 500 });
      }
    }

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
