import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "../database/prisma";

export async function createTransaction(data: {
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  note?: string;
  createdAt?: Date;
}) {
  return prisma.transaction.create({
    data,
  });
}

export async function findTransactionById(userId: string, id: string) {
  return prisma.transaction.findFirst({
    where: {
      userId,
      id,
    },
  });
}

export async function findTransactionByShortId(userId: string, shortId: string) {
  return prisma.transaction.findFirst({
    where: {
      userId,
      id: {
        startsWith: shortId,
      },
    },
  });
}

export async function getTransactions(params: {
  userId: string;
  skip?: number;
  take?: number;
  where?: Prisma.TransactionWhereInput;
}) {
  return prisma.transaction.findMany({
    where: {
      userId: params.userId,
      ...params.where,
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: params.skip,
    take: params.take,
  });
}

export async function countTransactions(params: {
  userId: string;
  where?: Prisma.TransactionWhereInput;
}) {
  return prisma.transaction.count({
    where: {
      userId: params.userId,
      ...params.where,
    },
  });
}

export async function updateTransaction(
  id: string,
  data: Prisma.TransactionUpdateInput
) {
  return prisma.transaction.update({
    where: {
      id,
    },
    data,
  });
}

export async function deleteTransaction(id: string) {
  return prisma.transaction.delete({
    where: {
      id,
    },
  });
}