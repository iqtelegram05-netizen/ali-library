import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ user: null });
    }

    // Refresh from DB to get latest displayName
    const userId = (session.user as any).id;
    let dbUser = null;
    if (userId) {
      try {
        dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { displayName: true, role: true },
        });
      } catch {}
    }

    return NextResponse.json({
      user: {
        id: (session.user as any).id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: dbUser?.role || (session.user as any).role || 'user',
        displayName: dbUser?.displayName || null,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
