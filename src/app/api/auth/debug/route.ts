import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decode } from 'next-auth/jwt';

/**
 * Debug endpoint to check authentication state.
 * Helps diagnose why login might not be working.
 * Accessible at /api/auth/debug
 */
export async function GET() {
  try {
    const env = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
      VERCEL_URL: process.env.VERCEL_URL || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV || 'unknown',
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    };

    const cookieStore = await cookies();
    const sessionToken =
      cookieStore.get('next-auth.session-token')?.value ||
      cookieStore.get('__Secure-next-auth.session-token')?.value;

    let decodedToken: any = null;
    if (sessionToken) {
      try {
        const salt = cookieStore.get('__Secure-next-auth.session-token')?.value
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token';
        decodedToken = await decode({
          token: sessionToken,
          secret: process.env.NEXTAUTH_SECRET || '',
          salt,
        });
      } catch (e: any) {
        decodedToken = { error: 'Failed to decode: ' + e.message };
      }
    }

    // List all auth-related cookies
    const allCookies: Record<string, string> = {};
    const allCookieNames = cookieStore.getAll().map(c => c.name);
    for (const name of allCookieNames) {
      if (name.includes('next-auth') || name.includes('csrf')) {
        allCookies[name] = cookieStore.get(name)?.value ? 'SET (value hidden)' : 'EMPTY';
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: env,
      cookies: allCookies,
      hasSessionToken: !!sessionToken,
      decodedToken: decodedToken ? {
        email: decodedToken.email || null,
        name: decodedToken.name || null,
        role: decodedToken.role || null,
        id: decodedToken.id || null,
        exp: decodedToken.exp ? new Date(decodedToken.exp * 1000).toISOString() : null,
        iat: decodedToken.iat ? new Date(decodedToken.iat * 1000).toISOString() : null,
        error: decodedToken.error || null,
      } : null,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Unknown error',
      stack: error.stack,
    }, { status: 500 });
  }
}
