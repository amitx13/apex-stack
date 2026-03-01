import { prisma, PrismaClient } from '@repo/db';
import { MLM_CONFIG } from '../config/mlm.constants';
import { ApiError } from '../utils/ApiError';

const MAX_CHILDREN = MLM_CONFIG.MATRIX_WIDTH;

/**
 * Find next available position in 5x5 forced matrix using BFS
 */
export type PrismaTransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

export async function findNextAvailablePosition(
  tx?: PrismaTransactionClient  // ← add this
): Promise<{ parentAccountId: string; matrixPosition: number }> {

  const client = tx || prisma;  // ← use tx if provided

  const rootAccount = await client.userAccount.findFirst({
    where: { matrixPosition: 0 },
  });

  if (!rootAccount) {
    throw new ApiError(404, 'Root account (admin) not found.');
  }

  const queue: string[] = [rootAccount.id];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentAccountId = queue.shift()!;
    if (visited.has(currentAccountId)) continue;
    visited.add(currentAccountId);

    const currentAccount = await client.userAccount.findUnique({
      where: { id: currentAccountId },
      include: { children: true },
    });

    if (!currentAccount) continue;

    if (currentAccount.children.length < MAX_CHILDREN) {
      const newPosition = await getNextSequentialPosition(client);  // ← pass client
      console.log(`✅ Found available position: ${newPosition} under account ${currentAccountId}`);
      return { parentAccountId: currentAccount.id, matrixPosition: newPosition };
    }

    for (const child of currentAccount.children) {
      queue.push(child.id);
    }
  }

  throw new ApiError(404, 'No available position found');
}

async function getNextSequentialPosition(
  client: PrismaTransactionClient  // ← use passed client
): Promise<number> {
  const lastAccount = await client.userAccount.findFirst({
    orderBy: { matrixPosition: 'desc' },
    select: { matrixPosition: true },
  });
  return lastAccount ? lastAccount.matrixPosition + 1 : 1;
}

/**
 * Get upline chain for commission distribution (up to 15 levels)
 */
type ParentAccount = {
  id: string;
  userId: string;
  matrixPosition: number;
  parentAccountId: string | null;
  user: { id: string; role: string };
};

export async function getUplineChain(
  userAccountId: string,
  maxLevels: number = MLM_CONFIG.MAX_UPLINE_LEVELS,
  tx?: PrismaTransactionClient  // ← add this
): Promise<{
  userId: string;
  accountId: string;
  level: number;
  matrixPosition: number;
  isAdmin: boolean;
}[]> {
  const client = tx || prisma;  // ← use tx if provided

  const uplineChain: {
    userId: string;
    accountId: string;
    level: number;
    matrixPosition: number;
    isAdmin: boolean;
  }[] = [];

  const startAccount = await client.userAccount.findUnique({
    where: { id: userAccountId },
    select: { parentAccountId: true },
  });

  if (!startAccount?.parentAccountId) {
    console.log(`Account ${userAccountId} has no parent — top of tree`);
    return [];
  }

  let currentParentId: string | null = startAccount.parentAccountId;
  let level = 1;

  while (currentParentId && level <= maxLevels) {
    const parentAccount: ParentAccount | null = await client.userAccount.findUnique({
      where: { id: currentParentId },
      select: {
        id: true,
        userId: true,
        matrixPosition: true,
        parentAccountId: true,
        user: { select: { id: true, role: true } },
      },
    });

    if (!parentAccount) break;

    uplineChain.push({
      userId: parentAccount.userId,
      accountId: parentAccount.id,
      level,
      matrixPosition: parentAccount.matrixPosition,
      isAdmin: parentAccount.user.role === 'ADMIN',
    });

    currentParentId = parentAccount.parentAccountId;
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
    throw new ApiError(404, 'Admin user not found');
  }

  return admin.id;
}
