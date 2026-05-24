import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from './db';
import bcrypt from 'bcryptjs';

/* ===================================================================
   Auth.js v5 — Custom Credentials Provider (Phone + Password).
   Replaced Google OAuth with phone-based authentication.
   Registration requires: phone, password, full name, address,
   country, ID photo, and face photo.
   =================================================================== */

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        phone: { label: 'رقم الهاتف', type: 'text' },
        password: { label: 'كلمة السر', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.password) {
          return null;
        }

        const phone = (credentials.phone as string).trim();
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { phone },
          select: {
            id: true,
            phone: true,
            name: true,
            fullName: true,
            displayName: true,
            image: true,
            password: true,
            role: true,
            isVerified: true,
          },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          phone: user.phone,
          name: user.fullName || user.name || null,
          displayName: user.displayName || null,
          image: user.image || null,
          role: user.role,
          isVerified: user.isVerified,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // On sign-in, populate token from user object
        token.id = user.id;
        token.phone = user.phone;
        token.name = user.name;
        token.role = (user as any).role || 'user';
        token.displayName = (user as any).displayName || null;
        token.isVerified = (user as any).isVerified || false;
      }

      // Refresh user data from DB on every JWT callback
      try {
        const phone = token?.phone as string;
        if (phone) {
          const dbUser = await prisma.user.findUnique({
            where: { phone },
            select: { id: true, role: true, displayName: true, name: true, fullName: true, isVerified: true, image: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.id = dbUser.id;
            token.displayName = dbUser.displayName;
            token.name = dbUser.fullName || dbUser.name;
            token.isVerified = dbUser.isVerified;
            token.picture = dbUser.image;
          }
        }
      } catch (error: any) {
        console.error('[AUTH] jwt error:', error?.message || error);
      }

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
        (session.user as any).phone = token.phone;
        (session.user as any).isVerified = token.isVerified || false;
        session.user.name = token.name as string | null;
        session.user.image = token.picture as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
});
