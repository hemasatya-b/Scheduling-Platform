import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

/**
 * Singleton Prisma client. Reuses the instance across hot-reloads in
 * development to avoid exhausting database connections.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
