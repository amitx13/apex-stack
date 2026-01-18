import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Global type definition for Prisma instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Singleton function to get Prisma instance
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const adapter = new PrismaPg({ 
    connectionString 
  });

  return new PrismaClient({ 
    adapter,
  });
}

// Create or reuse the Prisma instance
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// In development, store the instance in global to prevent hot-reload issues
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Export types
export * from './generated/prisma/client';