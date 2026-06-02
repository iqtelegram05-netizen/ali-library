import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/* ===================================================================
   Database Debug API — Checks schema health and returns diagnostics.
   =================================================================== */

export async function GET(req: Request) {
  try {
    const diagnostics: Record<string, any> = {
      timestamp: new Date().toISOString(),
      databaseUrl: process.env.POSTGRES_URL ? 'SET' : 'NOT SET',
      databaseUrlPrefix: process.env.POSTGRES_URL?.substring(0, 30) + '...',
    };

    // Test basic connection
    try {
      const userCount = await prisma.user.count();
      diagnostics.userCount = userCount;
      diagnostics.connection = 'OK';
    } catch (connErr: any) {
      diagnostics.connection = 'FAILED';
      diagnostics.connectionError = String(connErr?.message || connErr);
      return NextResponse.json({ diagnostics, error: 'Database connection failed' }, { status: 503 });
    }

    // Check User table columns by trying to select each one
    const columns = ['id', 'email', 'phone', 'name', 'fullName', 'displayName', 'image', 'password', 'address', 'country', 'idPhoto', 'facePhoto', 'role', 'isVerified', 'createdAt', 'updatedAt'];
    diagnostics.columns = {};

    for (const col of columns) {
      try {
        await prisma.user.findFirst({
          select: { [col]: true } as any,
        });
        diagnostics.columns[col] = 'EXISTS';
      } catch {
        diagnostics.columns[col] = 'MISSING';
      }
    }

    // Check Book table
    try {
      const bookCount = await prisma.book.count();
      diagnostics.bookCount = bookCount;
      diagnostics.bookTable = 'EXISTS';
    } catch (bookErr: any) {
      diagnostics.bookTable = 'MISSING';
      diagnostics.bookError = String(bookErr?.message);
    }

    // List existing users (without passwords)
    try {
      const users = await prisma.user.findMany({
        select: { id: true, phone: true, name: true, role: true, isVerified: true, createdAt: true },
        take: 10,
      });
      diagnostics.existingUsers = users;
    } catch (listErr: any) {
      diagnostics.existingUsers = 'ERROR: ' + String(listErr?.message);
    }

    return NextResponse.json({ diagnostics });
  } catch (error: any) {
    return NextResponse.json({
      error: String(error?.message || error),
    }, { status: 500 });
  }
}
