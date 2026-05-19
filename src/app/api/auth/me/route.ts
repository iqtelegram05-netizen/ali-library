import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    // getToken works directly with App Router Request objects
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token?.email) {
      return NextResponse.json({ user: null });
    }

    // Get fresh user data from DB
    let dbUser = null;
    try {
      dbUser = await prisma.user.findUnique({
        where: { email: token.email as string },
        select: { id: true, displayName: true, role: true },
      });
    } catch {
      // DB lookup failed — use token data only
    }

    return NextResponse.json({
      user: {
        id: dbUser?.id || (token.id as string) || null,
        name: (token.name as string) || null,
        email: token.email as string,
        image: (token.picture as string) || null,
        role: dbUser?.role || (token.role as string) || 'user',
        displayName: dbUser?.displayName || (token.displayName as string) || null,
      },
    });
  } catch (error) {
    console.error('[AUTH /api/auth/me] Error:', error);
    return NextResponse.json({ user: null });
  }
}
