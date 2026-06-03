import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/* ===================================================================
   Database Debug API — Full diagnostics for DB connection & schema.
   =================================================================== */

export async function GET(req: Request) {
  try {
    const diagnostics: Record<string, any> = {
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV || 'unknown',
      envVars: {
        POSTGRES_URL: process.env.POSTGRES_URL ? 'SET (' + process.env.POSTGRES_URL.substring(0, 20) + '...)' : 'NOT SET',
        DATABASE_URL: process.env.DATABASE_URL ? 'SET (' + process.env.DATABASE_URL.substring(0, 20) + '...)' : 'NOT SET',
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
        OWNER_PHONE: process.env.OWNER_PHONE ? process.env.OWNER_PHONE : 'NOT SET',
      },
    };

    // Determine which URL is actually being used
    const activeUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
    diagnostics.activeDatabaseUrl = activeUrl ? activeUrl.substring(0, 30) + '...' : 'NONE';
    diagnostics.provider = activeUrl.startsWith('postgresql') || activeUrl.includes('neon') ? 'PostgreSQL (Neon)' :
                          activeUrl.startsWith('file:') ? 'SQLite (local)' : 'Unknown';

    // Test basic connection
    try {
      const userCount = await prisma.user.count();
      diagnostics.userCount = userCount;
      diagnostics.connection = 'OK';
    } catch (connErr: any) {
      diagnostics.connection = 'FAILED';
      diagnostics.connectionError = String(connErr?.message || connErr);
      diagnostics.fix = 'إذا كان POSTGRES_URL أو DATABASE_URL غير محدد، اذهب إلى Vercel → Settings → Environment Variables وأضف POSTGRES_URL';
      return NextResponse.json({ diagnostics }, { status: 503 });
    }

    // Check User table columns
    const columns = ['id', 'email', 'phone', 'name', 'fullName', 'displayName', 'image', 'password', 'address', 'country', 'role', 'isVerified'];
    diagnostics.columns = {};

    for (const col of columns) {
      try {
        await prisma.user.findFirst({ select: { [col]: true } as any });
        diagnostics.columns[col] = 'OK';
      } catch (colErr: any) {
        diagnostics.columns[col] = 'MISSING: ' + String(colErr?.message).substring(0, 80);
      }
    }

    // Check unique constraints
    try {
      await prisma.user.findUnique({ where: { phone: '__test_nonexistent__' } });
      diagnostics.phoneUniqueConstraint = 'OK';
    } catch (uniqueErr: any) {
      diagnostics.phoneUniqueConstraint = 'ERROR: ' + String(uniqueErr?.message).substring(0, 100);
    }

    // Check Book table
    try {
      const bookCount = await prisma.book.count();
      diagnostics.bookCount = bookCount;
    } catch (bookErr: any) {
      diagnostics.bookTableError = String(bookErr?.message);
    }

    // List existing users (safe info only)
    try {
      const users = await prisma.user.findMany({
        select: { id: true, phone: true, name: true, role: true, createdAt: true },
        take: 10,
      });
      diagnostics.users = users;
    } catch (listErr: any) {
      diagnostics.usersError = String(listErr?.message);
    }

    // Schema sync recommendation
    const missingCols = Object.entries(diagnostics.columns || {}).filter(([, v]) => String(v) !== 'OK');
    if (missingCols.length > 0) {
      diagnostics.needsSync = true;
      diagnostics.fix = `يحتاج تشغيل: npx prisma db push --accept-data-loss على قاعدة البيانات. الأعمدة المفقودة: ${missingCols.map(([k]) => k).join(', ')}`;
    } else {
      diagnostics.needsSync = false;
      diagnostics.fix = 'قاعدة البيانات تعمل بشكل صحيح ✅';
    }

    return NextResponse.json({ diagnostics });
  } catch (error: any) {
    return NextResponse.json({
      error: String(error?.message || error),
      fix: 'تحقق من POSTGRES_URL في إعدادات Vercel',
    }, { status: 500 });
  }
}
