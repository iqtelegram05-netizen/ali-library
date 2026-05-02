import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({
      user: {
        id: (session.user as any).id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: (session.user as any).role || 'user',
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
