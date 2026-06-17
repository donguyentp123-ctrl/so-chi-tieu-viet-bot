import { prisma } from "../database/prisma";

export async function createBudget(data: {
  userId: string;
  category: string;
  amount: number;
}) {
  return prisma.budget.create({
    data,
  });
}

export async function getBudgets(userId: string) {
  return prisma.budget.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteBudget(id: string) {
  return prisma.budget.delete({
    where: { id },
  });
}