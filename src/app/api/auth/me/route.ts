import { NextResponse } from 'next/server';
import { decode } from 'next-auth/jwt';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    // Use cookies() from next/headers instead of getToken({ req })
    // because next-auth v4 getToken() doesn't work with App Router Request objects
    const cookieStore = await cookies();
    const sessionToken =
      cookieStore.get('next-auth.session-token')?.value ||
      cookieStore.get('__Secure-next-auth.session-token')?.value;

    if (!sessionToken) {
      return NextResponse.json({ user: null });
    }

    const token = await decode({
      token: sessionToken,
      secret: process.env.NEXTAUTH_SECRET || '',
      salt:
        cookieStore.get('__Secure-next-auth.session-token')?.value
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token',
    });

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
