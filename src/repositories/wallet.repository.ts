import { prisma } from "../database/prisma";

export async function createWallet(data: {
  userId: string;
  name: string;
  balance?: number;
}) {
  return prisma.wallet.create({
    data: {
      userId: data.userId,
      name: data.name,
      balance: data.balance || 0,
    },
  });
}

export async function getWallets(userId: string) {
  return prisma.wallet.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function findWalletById(userId: string, id: string) {
  return prisma.wallet.findFirst({
    where: {
      id,
      userId,
    },
  });
}

export async function deleteWallet(id: string) {
  return prisma.wallet.delete({
    where: { id },
  });
}

export async function updateWalletBalance(id: string, amount: number) {
  return prisma.wallet.update({
    where: { id },
    data: {
      balance: {
        increment: amount,
      },
    },
  });
}