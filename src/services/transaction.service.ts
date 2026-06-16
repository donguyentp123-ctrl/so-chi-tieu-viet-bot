import { TransactionType } from "@prisma/client";
import { updateWalletBalance } from "../repositories/wallet.repository";
import {
  createTransaction,
  findTransactionById,
  findTransactionByShortId,
  updateTransaction,
  deleteTransaction,
} from "../repositories/transaction.repository";

export async function createUserTransaction(data: {
  userId: string;
  walletId?: string;
  type: TransactionType;
  amount: number;
  category: string;
  note?: string;
  createdAt?: Date;
}) {
  const transaction = await createTransaction(data);

  if (data.walletId) {
    const balanceChange =
      data.type === TransactionType.INCOME ? data.amount : -data.amount;

    await updateWalletBalance(data.walletId, balanceChange);
  }

  return transaction;
}

export async function getTransactionByShortId(userId: string, shortId: string) {
  return findTransactionByShortId(userId, shortId);
}

export async function getTransactionById(userId: string, id: string) {
  return findTransactionById(userId, id);
}

export async function updateTransactionAmount(id: string, amount: number) {
  return updateTransaction(id, {
    amount,
  });
}

export async function updateTransactionNote(id: string, note: string) {
  return updateTransaction(id, {
    note,
  });
}

export async function updateTransactionCategory(id: string, category: string) {
  return updateTransaction(id, {
    category,
  });
}

export async function removeTransaction(id: string) {
  return deleteTransaction(id);
}