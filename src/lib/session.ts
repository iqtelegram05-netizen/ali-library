import { cookies } from 'next/headers';
import { decode } from 'next-auth/jwt';
import { prisma } from './db';

/**
 * App Router compatible session helper.
 *
 * next-auth v4's `getServerSession()` and `getToken({ req })` are designed
 * for Pages Router and do NOT properly extract cookies from the App Router
 * standard `Request` object, causing all login checks to fail.
 *
 * This helper uses `cookies()` from `next/headers` + `decode` from
 * `next-auth/jwt` to reliably read the session token in App Router.
 */

interface AppSessionUser {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  displayName?: string | null;
}

export interface AppSession {
  user: AppSessionUser;
}

export async function getAppSession(): Promise<AppSession | null> {
  try {
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

    if (!token?.email) return null;

    // Get fresh user data from DB (for role & displayName)
    let dbUser: { id: string; role: string; displayName: string | null; name: string | null; image: string | null; email: string } | null = null;
    try {
      dbUser = await prisma.user.findUnique({
        where: { email: token.email as string },
        select: { id: true, role: true, displayName: true, name: true, image: true, email: true },
      });
    } catch {
      // DB lookup failed — use token data only
    }

    return {
      user: {
        id: dbUser?.id || (token.id as string) || null,
        name: dbUser?.name || (token.name as string) || null,
        email: token.email as string,
        image: dbUser?.image || (token.picture as string) || null,
        role: dbUser?.role || (token.role as string) || 'user',
        displayName: dbUser?.displayName || (token.displayName as string) || null,
      },
    };
  } catch (error) {
    console.error('[getAppSession] Error:', error);
    return null;
  }
}
