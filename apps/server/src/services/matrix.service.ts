import { prisma } from '@repo/db';
import { MLM_CONFIG } from '../config/mlm.constants';

const MAX_CHILDREN = MLM_CONFIG.MATRIX_WIDTH;

/**
 * Find next available position in 5x5 forced matrix using BFS
 */
export async function findNextAvailablePosition(): Promise<{
  parentAccountId: string;
  matrixPosition: number;
}> {
  // Get root account (admin at position 0)
  const rootAccount = await prisma.userAccount.findFirst({
    where: { matrixPosition: 0 },
  });

  if (!rootAccount) {
    throw new Error(
      'Root account (admin) not found. Please run initialize-admin script first.'
    );
  }

  // BFS queue - Start with root
  const queue: string[] = [rootAccount.id];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentAccountId = queue.shift()!;

    // Skip if already visited
    if (visited.has(currentAccountId)) continue;
    visited.add(currentAccountId);

    // Get current account with children
    const currentAccount = await prisma.userAccount.findUnique({
      where: { id: currentAccountId },
      include: { children: true },
    });

    if (!currentAccount) continue;

    // Check if this account has space for more children (< 5)
    if (currentAccount.children.length < MAX_CHILDREN) {
      // Found available spot!
      const newPosition = await getNextSequentialPosition();

      console.log(
        `✅ Found available position: ${newPosition} under account ${currentAccountId} (current position: ${currentAccount.matrixPosition})`
      );

      return {
        parentAccountId: currentAccount.id,
        matrixPosition: newPosition,
      };
    }

    // No space - add all children to queue (go deeper)
    for (const child of currentAccount.children) {
      queue.push(child.id);
    }
  }

  throw new Error('BFS traversal completed without finding available position');
}

/**
 * Get next sequential position number
 */
async function getNextSequentialPosition(): Promise<number> {
  const lastAccount = await prisma.userAccount.findFirst({
    orderBy: { matrixPosition: 'desc' },
    select: { matrixPosition: true },
  });

  return lastAccount ? lastAccount.matrixPosition + 1 : 1;
}

/**
 * Get upline chain for commission distribution (up to 15 levels)
 */
export async function getUplineChain(
  userAccountId: string,
  maxLevels: number = MLM_CONFIG.MAX_UPLINE_LEVELS
): Promise<
  {
    userId: string;
    accountId: string;
    level: number;
    matrixPosition: number;
    isAdmin: boolean;
  }[]
> {
  const uplineChain: any[] = [];

  let currentAccount = await prisma.userAccount.findUnique({
    where: { id: userAccountId },
    include: {
      parent: {
        include: {
          user: { select: { id: true, role: true } },
        },
      },
    },
  });

  let level = 1;

  // Traverse up the tree
  while (currentAccount?.parent && level <= maxLevels) {
    uplineChain.push({
      userId: currentAccount.parent.userId,
      accountId: currentAccount.parent.id,
      level: level,
      matrixPosition: currentAccount.parent.matrixPosition,
      isAdmin: currentAccount.parent.user.role === 'ADMIN',
    });

    // Move up one level
    currentAccount = await prisma.userAccount.findUnique({
      where: { id: currentAccount.parentAccountId! },
      include: {
        parent: {
          include: {
            user: { select: { id: true, role: true } },
          },
        },
      },
    });

    level++;
  }

  return uplineChain;
}

/**
 * Get admin user ID
 */
export async function getAdminUserId(): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true },
  });

  if (!admin) {
    throw new Error('Admin user not found');
  }

  return admin.id;
}
