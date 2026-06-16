import { Prisma } from "@prisma/client";
import {
  countTransactions,
  getTransactions,
} from "../repositories/transaction.repository";

export const PAGE_SIZE = 5;

export async function getPagedTransactions(params: {
  userId: string;
  page: number;
  where?: Prisma.TransactionWhereInput;
}) {
  let page = params.page;

  const total = await countTransactions({
    userId: params.userId,
    where: params.where,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  const skip = (page - 1) * PAGE_SIZE;

  const records = await getTransactions({
    userId: params.userId,
    where: params.where,
    skip,
    take: PAGE_SIZE,
  });

  return {
    records,
    page,
    total,
    totalPages,
    skip,
  };
}