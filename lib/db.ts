import { PrismaClient } from '@prisma/client';

// Vercel tidak bisa akses postgres.railway.internal. Pakai DATABASE_PUBLIC_URL jika DATABASE_URL internal.
if (process.env.DATABASE_URL?.includes('railway.internal') && process.env.DATABASE_PUBLIC_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
