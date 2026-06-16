import { TransactionType } from "@prisma/client";
import { prisma } from "../database/prisma";

function getStartOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function getStartOfMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function formatPercent(value: number, total: number) {
  if (total <= 0) return "0%";
  return ((value / total) * 100).toFixed(1) + "%";
}

export async function getStatisticsReport(userId: string) {
  const todayExpense = await prisma.transaction.aggregate({
    where: {
      userId,
      type: TransactionType.EXPENSE,
      createdAt: { gte: getStartOfToday() },
    },
    _sum: { amount: true },
  });

  const todayIncome = await prisma.transaction.aggregate({
    where: {
      userId,
      type: TransactionType.INCOME,
      createdAt: { gte: getStartOfToday() },
    },
    _sum: { amount: true },
  });

  const monthExpense = await prisma.transaction.aggregate({
    where: {
      userId,
      type: TransactionType.EXPENSE,
      createdAt: { gte: getStartOfMonth() },
    },
    _sum: { amount: true },
  });

  const monthIncome = await prisma.transaction.aggregate({
    where: {
      userId,
      type: TransactionType.INCOME,
      createdAt: { gte: getStartOfMonth() },
    },
    _sum: { amount: true },
  });

  const expenseByCategory = await prisma.transaction.groupBy({
    by: ["category"],
    where: {
      userId,
      type: TransactionType.EXPENSE,
      createdAt: { gte: getStartOfMonth() },
    },
    _sum: { amount: true },
    orderBy: {
      _sum: {
        amount: "desc",
      },
    },
  });

  const dailyStats = [];

  for (let i = 6; i >= 0; i--) {
    const start = getStartOfToday();
    start.setDate(start.getDate() - i);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const income = await prisma.transaction.aggregate({
      where: {
        userId,
        type: TransactionType.INCOME,
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      _sum: { amount: true },
    });

    const expense = await prisma.transaction.aggregate({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      _sum: { amount: true },
    });

    dailyStats.push({
      date: start,
      income: income._sum.amount || 0,
      expense: expense._sum.amount || 0,
    });
  }

  const todayExpenseAmount = todayExpense._sum.amount || 0;
  const todayIncomeAmount = todayIncome._sum.amount || 0;
  const monthExpenseAmount = monthExpense._sum.amount || 0;
  const monthIncomeAmount = monthIncome._sum.amount || 0;

  return {
    todayIncomeAmount,
    todayExpenseAmount,
    monthIncomeAmount,
    monthExpenseAmount,
    monthBalance: monthIncomeAmount - monthExpenseAmount,
    expenseByCategory,
    dailyStats,
  };
}