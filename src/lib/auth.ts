import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from './db';
import bcrypt from 'bcryptjs';

/* ===================================================================
   Auth.js v5 — Custom Credentials Provider (Phone + Password).
   Safe schema detection to handle missing columns in DB.
   =================================================================== */

let _schemaChecked = false;
let _safeSelect: Record<string, boolean> = {
  id: true, phone: true, name: true, password: true, role: true, isVerified: true, image: true,
};

async function detectAuthSchema() {
  if (_schemaChecked) return;
  _schemaChecked = true;
  const optionalFields = ['fullName', 'displayName'];
  for (const field of optionalFields) {
    try {
      await prisma.user.findFirst({ select: { [field]: true } as any });
      _safeSelect[field] = true;
    } catch {
      _safeSelect[field] = false;
      console.log(`[AUTH] Schema: ${field} column does NOT exist`);
    }
  }
  console.log('[AUTH] Safe select fields:', _safeSelect);
}

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

        await detectAuthSchema();

        let user: any = null;
        try {
          user = await prisma.user.findUnique({
            where: { phone },
            select: _safeSelect as any,
          });
        } catch (err: any) {
          console.error('[AUTH] authorize findUnique error:', err?.message);
          // Fallback: try with minimal fields
          try {
            user = await prisma.user.findUnique({
              where: { phone },
              select: { id: true, phone: true, name: true, password: true, role: true, isVerified: true },
            });
          } catch (retryErr: any) {
            console.error('[AUTH] authorize minimal findUnique also failed:', retryErr?.message);
            return null;
          }
        }

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
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.phone = user.phone;
        token.name = user.name;
        token.role = (user as any).role || 'user';
        token.displayName = (user as any).displayName || null;
        token.isVerified = (user as any).isVerified || false;
      }

      // Refresh user data from DB
      try {
        const phone = token?.phone as string;
        if (phone) {
          await detectAuthSchema();
          let dbUser: any = null;
          try {
            dbUser = await prisma.user.findUnique({
              where: { phone },
              select: _safeSelect as any,
            });
          } catch {
            // fallback
          }
          if (dbUser) {
            token.role = dbUser.role;
            token.id = dbUser.id;
            token.displayName = dbUser.displayName || null;
            token.name = dbUser.fullName || dbUser.name;
            token.isVerified = dbUser.isVerified;
            token.picture = dbUser.image;
          }
        }
      } catch (error: any) {
        console.error('[AUTH] jwt refresh error:', error?.message);
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
