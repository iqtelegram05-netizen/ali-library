import { PrismaClient } from '@prisma/client';

/* ===================================================================
   Prisma Client — Supports both POSTGRES_URL and DATABASE_URL.
   This ensures compatibility with Vercel, Neon, and local dev.
   =================================================================== */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Check if POSTGRES_URL is set, otherwise try DATABASE_URL
  const databaseUrl =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    '';

  if (!databaseUrl) {
    console.warn(
      '[PRISMA] WARNING: Neither POSTGRES_URL nor DATABASE_URL is set. ' +
      'Database operations will FAIL. Please set POSTGRES_URL in Vercel environment variables.'
    );
  } else {
    console.log('[PRISMA] Using database URL:', databaseUrl.substring(0, 25) + '...');
  }

  return new PrismaClient({
    datasourceUrl: databaseUrl || undefined,
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
