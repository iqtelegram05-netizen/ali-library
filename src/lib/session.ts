import { cookies } from 'next/headers';
import { decode } from 'next-auth/jwt';
import { prisma } from './db';
import { auth } from './auth';

/**
 * App Router compatible session helper.
 *
 * Works with phone-based Credentials authentication.
 * Uses auth() from Auth.js v5 as primary, falls back to JWT decode.
 */

interface AppSessionUser {
  id?: string | null;
  name?: string | null;
  phone?: string | null;
  image?: string | null;
  role?: string;
  displayName?: string | null;
  isVerified?: boolean;
}

export interface AppSession {
  user: AppSessionUser;
}

export async function getAppSession(): Promise<AppSession | null> {
  try {
    // Try Auth.js v5 auth() first
    const session = await auth();
    if (session?.user && (session.user as any)?.phone) {
      const phone = (session.user as any).phone;
      let dbUser: { id: string; role: string; displayName: string | null; name: string | null; fullName: string | null; image: string | null; isVerified: boolean } | null = null;
      try {
        dbUser = await prisma.user.findUnique({
          where: { phone },
          select: { id: true, role: true, displayName: true, name: true, fullName: true, image: true, isVerified: true },
        });
      } catch {
        // DB lookup failed
      }

      return {
        user: {
          id: dbUser?.id || (session.user as any).id || null,
          name: dbUser?.fullName || dbUser?.name || session.user.name || null,
          phone: phone,
          image: session.user.image || dbUser?.image || null,
          role: (session.user as any).role || dbUser?.role || 'user',
          displayName: (session.user as any).displayName || dbUser?.displayName || null,
          isVerified: (session.user as any).isVerified || dbUser?.isVerified || false,
        },
      };
    }

    // Fallback: decode JWT from cookie
    const cookieStore = await cookies();
    const secureToken = cookieStore.get('__Secure-next-auth.session-token')?.value;
    const sessionToken = cookieStore.get('next-auth.session-token')?.value;
    const tokenValue = secureToken || sessionToken;

    if (!tokenValue) return null;

    const salt = secureToken
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token';

    const token = await decode({
      token: tokenValue,
      secret: process.env.NEXTAUTH_SECRET || '',
      salt,
    });

    if (!token?.phone) return null;

    let dbUser: { id: string; role: string; displayName: string | null; name: string | null; fullName: string | null; image: string | null; isVerified: boolean } | null = null;
    try {
      dbUser = await prisma.user.findUnique({
        where: { phone: token.phone as string },
        select: { id: true, role: true, displayName: true, name: true, fullName: true, image: true, isVerified: true },
      });
    } catch {
      // DB lookup failed
    }

    return {
      user: {
        id: dbUser?.id || (token.id as string) || null,
        name: dbUser?.fullName || dbUser?.name || (token.name as string) || null,
        phone: token.phone as string,
        image: dbUser?.image || (token.picture as string) || null,
        role: dbUser?.role || (token.role as string) || 'user',
        displayName: dbUser?.displayName || (token.displayName as string) || null,
        isVerified: dbUser?.isVerified || (token.isVerified as boolean) || false,
      },
    };
  } catch (error) {
    console.error('[getAppSession] Error:', error);
    return null;
  }
}
