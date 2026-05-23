import { NextResponse } from 'next/server';
import { decode } from 'next-auth/jwt';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    // Try Auth.js v5 auth() first — most reliable
    const session = await auth();
    if (session?.user?.email) {
      let dbUser = null;
      try {
        dbUser = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true, displayName: true, role: true },
        });
      } catch {
        // DB lookup failed — use session data only
      }

      return NextResponse.json({
        user: {
          id: dbUser?.id || (session.user as any).id || null,
          name: session.user.name || null,
          email: session.user.email,
          image: session.user.image || null,
          role: (session.user as any).role || dbUser?.role || 'user',
          displayName: (session.user as any).displayName || dbUser?.displayName || null,
        },
      });
    }

    // Fallback: decode JWT from cookie
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
