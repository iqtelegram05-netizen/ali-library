import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from './db';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (user?.email) {
          const ownerEmail = process.env.OWNER_EMAIL;
          const isOwner = ownerEmail && user.email.toLowerCase() === ownerEmail.toLowerCase();
          await prisma.user.upsert({
            where: { email: user.email },
            update: {
              name: user.name || undefined,
              image: user.image || undefined,
              ...(isOwner ? { role: 'owner' } : {}),
            },
            create: {
              email: user.email,
              name: user.name || null,
              image: user.image || null,
              role: isOwner ? 'owner' : 'user',
            },
          });
        }
        return true;
      } catch (error: any) {
        console.error('[AUTH] signIn error:', error?.message || error);
        return true;
      }
    },
    async jwt({ token, user, trigger, session }) {
      try {
        const email = user?.email || token?.email;
        if (email) {
          const dbUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true, role: true, displayName: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.id = dbUser.id;
            token.displayName = dbUser.displayName;
          }
        }
      } catch {}
      if (trigger === 'update' && session) {
        if (session.displayName !== undefined) token.displayName = session.displayName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role || 'user';
        (session.user as any).id = token.id;
        (session.user as any).displayName = token.displayName || null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
