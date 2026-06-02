import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

/* ===================================================================
   Registration API — Al-Ali Digital Library.
   Safely creates user by auto-detecting which columns exist in DB.
   =================================================================== */

/* Cache for detected schema — avoids re-checking on every request */
let _schemaChecked = false;
let _hasFullName = true;
let _hasAddress = false;
let _hasCountry = false;

async function detectSchema() {
  if (_schemaChecked) return;
  _schemaChecked = true;
  try {
    // Try a safe query that references fullName
    const testUser = await prisma.user.findFirst({
      select: { fullName: true },
    });
    _hasFullName = true;
  } catch {
    _hasFullName = false;
    console.log('[REGISTER] Schema: fullName column does NOT exist');
  }

  try {
    const testUser = await prisma.user.findFirst({
      select: { address: true },
    });
    _hasAddress = true;
  } catch {
    _hasAddress = false;
  }

  try {
    const testUser = await prisma.user.findFirst({
      select: { country: true },
    });
    _hasCountry = true;
  } catch {
    _hasCountry = false;
  }

  console.log('[REGISTER] Schema detected:', { _hasFullName, _hasAddress, _hasCountry });
}

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

    // Clean phone number
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Validate phone
    if (!/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
      return NextResponse.json({
        success: false,
        error: 'رقم الهاتف غير صالح',
      }, { status: 400 });
    }

    // Validate password
    if (password.length < 6) {
      return NextResponse.json({
        success: false,
        error: 'كلمة السر يجب أن تكون 6 أحرف على الأقل',
      }, { status: 400 });
    }

    // Validate fullName (at least 2 words)
    const nameWords = fullName.trim().split(/\s+/);
    if (nameWords.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'يرجى إدخال الاسم الكامل (الاسم الأول والأخير)',
      }, { status: 400 });
    }

    // Detect DB schema on first request
    await detectSchema();

    // Check if phone already exists
    try {
      const existingUser = await prisma.user.findUnique({
        where: { phone: cleanPhone },
      });
      if (existingUser) {
        return NextResponse.json({
          success: false,
          error: 'رقم الهاتف مسجل مسبقاً. يرجى تسجيل الدخول.',
        }, { status: 409 });
      }
    } catch (dbErr: any) {
      console.error('[REGISTER] findUnique error:', dbErr?.message);
      return NextResponse.json({
        success: false,
        error: 'خطأ في البحث عن المستخدم. قد لا تكون قاعدة البيانات متصلة.',
      }, { status: 503 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Check if this is the owner phone
    const ownerPhone = process.env.OWNER_PHONE;
    const isOwner = ownerPhone && cleanPhone === ownerPhone.replace(/[\s\-\(\)]/g, '');

    // Build data object based on detected schema
    const data: Record<string, any> = {
      phone: cleanPhone,
      password: hashedPassword,
      name: fullName.trim(),
      role: isOwner ? 'owner' : 'user',
    };

    if (_hasFullName) {
      data.fullName = fullName.trim();
    }

    // Create user
    let user;
    try {
      user = await prisma.user.create({
        data,
        select: {
          id: true,
          phone: true,
          name: true,
          fullName: _hasFullName,
          role: true,
          isVerified: true,
          createdAt: true,
        },
      });
    } catch (createErr: any) {
      console.error('[REGISTER] create error:', createErr?.message || createErr);
      const errMsg = String(createErr?.message || createErr);

      // Unique constraint violation
      if (createErr?.code === 'P2002') {
        return NextResponse.json({
          success: false,
          error: 'رقم الهاتف مسجل مسبقاً.',
        }, { status: 409 });
      }

      // Column doesn't exist — retry without fullName
      if (errMsg.includes('does not exist') || errMsg.includes('column') || errMsg.includes('field')) {
        console.log('[REGISTER] Retrying with minimal fields...');
        delete data.fullName;
        try {
          user = await prisma.user.create({
            data,
            select: {
              id: true,
              phone: true,
              name: true,
              role: true,
              isVerified: true,
              createdAt: true,
            },
          });
        } catch (retryErr: any) {
          console.error('[REGISTER] Minimal create also failed:', retryErr?.message);
          return NextResponse.json({
            success: false,
            error: 'خطأ في قاعدة البيانات. الجدول يحتاج تحديث.',
          }, { status: 500 });
        }
      } else {
        return NextResponse.json({
          success: false,
          error: 'خطأ أثناء إنشاء الحساب.',
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.',
      user,
    });
  } catch (error: any) {
    console.error('[REGISTER] Unhandled error:', error?.message || error);
    return NextResponse.json({
      success: false,
      error: 'حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.',
    }, { status: 500 });
  }
}
