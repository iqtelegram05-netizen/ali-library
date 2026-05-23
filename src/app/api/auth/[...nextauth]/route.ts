import { NextRequest } from 'next/server';
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// CRITICAL FIX: Auto-detect NEXTAUTH_URL for Vercel deployment.
// Without this, NextAuth v4 cannot properly handle OAuth callbacks —
// the session cookie won't be set, and users won't stay logged in.
if (!process.env.NEXTAUTH_URL) {
  if (process.env.VERCEL_URL) {
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
  } else {
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
  }
}

// Wrap the NextAuth handler to work reliably with App Router
async function authHandler(req: NextRequest) {
  // Ensure the URL is absolute (NextAuth v4 expects this)
  const url = new URL(req.url);
  const headers = new Headers(req.headers);

  // Set the host and origin headers that NextAuth needs for callback validation
  if (!headers.get('x-forwarded-host')) {
    headers.set('x-forwarded-host', url.host);
  }
  if (!headers.get('x-forwarded-proto')) {
    headers.set('x-forwarded-proto', url.protocol.replace(':', ''));
  }

  // Create a new request with proper headers
  const newReq = new NextRequest(req, { headers });

  // @ts-expect-error - NextAuth v4 expects Node.js req/res but works with Web API in practice
  return NextAuth(authOptions)(newReq);
}

export async function GET(req: NextRequest) {
  return authHandler(req);
}

export async function POST(req: NextRequest) {
  return authHandler(req);
}
