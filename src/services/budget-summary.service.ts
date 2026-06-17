import { TransactionType } from "@prisma/client";
import { prisma } from "../database/prisma";

function getStartOfMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function getBudgetSummaries(userId: string) {
  const budgets = await prisma.budget.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const summaries = await Promise.all(
    budgets.map(async (budget) => {
      const spent = await prisma.transaction.aggregate({
        where: {
          userId,
          type: TransactionType.EXPENSE,
          category: budget.category,
          createdAt: {
            gte: getStartOfMonth(),
          },
        },
        _sum: {
          amount: true,
        },
      });

      const spentAmount = spent._sum.amount || 0;
      const remaining = budget.amount - spentAmount;
      const percent =
        budget.amount > 0 ? Math.round((spentAmount / budget.amount) * 100) : 0;

      return {
        id: budget.id,
        category: budget.category,
        amount: budget.amount,
        spent: spentAmount,
        remaining,
        percent,
        isOverBudget: spentAmount > budget.amount,
      };
    })
  );

  return summaries;
}

export function renderProgressBar(percent: number) {
  const totalBlocks = 10;
  const filledBlocks = Math.min(totalBlocks, Math.round(percent / 10));
  const emptyBlocks = totalBlocks - filledBlocks;

  return "█".repeat(filledBlocks) + "░".repeat(emptyBlocks);
}

export async function checkBudgetAfterExpense(params: {
  userId: string;
  category: string;
}) {
  const summaries = await getBudgetSummaries(params.userId);

  const budget = summaries.find(
    (item) => item.category.toLowerCase() === params.category.toLowerCase()
  );

  if (!budget) {
    return null;
  }

  if (budget.isOverBudget) {
    return `

⚠️ CẢNH BÁO NGÂN SÁCH

Danh mục: ${budget.category}
Ngân sách: ${budget.amount.toLocaleString("vi-VN")}đ
Đã chi: ${budget.spent.toLocaleString("vi-VN")}đ
Vượt: ${Math.abs(budget.remaining).toLocaleString("vi-VN")}đ`;
  }

  if (budget.percent >= 80) {
    return `

⚠️ SẮP CHẠM NGÂN SÁCH

Danh mục: ${budget.category}
Đã dùng: ${budget.percent}%
Còn lại: ${budget.remaining.toLocaleString("vi-VN")}đ`;
  }

  return null;
}