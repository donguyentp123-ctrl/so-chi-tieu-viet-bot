import { Telegraf } from "telegraf";
import { prisma } from "../database/prisma";
import { formatMoney } from "../utils/money";

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

function formatPercent(value: number, total: number) {
  if (total <= 0) return "0%";
  return ((value / total) * 100).toFixed(1) + "%";
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function registerStatisticsCommand(bot: Telegraf) {
  bot.hears("📊 Thống kê", async (ctx) => {
    const userId = String(ctx.from.id);

    const todayExpense = await prisma.transaction.aggregate({
      where: {
        userId,
        type: "EXPENSE",
        createdAt: {
          gte: getStartOfToday(),
        },
      },
      _sum: {
        amount: true,
      },
    });

    const todayIncome = await prisma.transaction.aggregate({
      where: {
        userId,
        type: "INCOME",
        createdAt: {
          gte: getStartOfToday(),
        },
      },
      _sum: {
        amount: true,
      },
    });

    const monthExpense = await prisma.transaction.aggregate({
      where: {
        userId,
        type: "EXPENSE",
        createdAt: {
          gte: getStartOfMonth(),
        },
      },
      _sum: {
        amount: true,
      },
    });

    const monthIncome = await prisma.transaction.aggregate({
      where: {
        userId,
        type: "INCOME",
        createdAt: {
          gte: getStartOfMonth(),
        },
      },
      _sum: {
        amount: true,
      },
    });

    const expenseByCategory = await prisma.transaction.groupBy({
      by: ["category"],
      where: {
        userId,
        type: "EXPENSE",
        createdAt: {
          gte: getStartOfMonth(),
        },
      },
      _sum: {
        amount: true,
      },
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
          type: "INCOME",
          createdAt: {
            gte: start,
            lt: end,
          },
        },
        _sum: {
          amount: true,
        },
      });

      const expense = await prisma.transaction.aggregate({
        where: {
          userId,
          type: "EXPENSE",
          createdAt: {
            gte: start,
            lt: end,
          },
        },
        _sum: {
          amount: true,
        },
      });

      dailyStats.push({
        date: start,
        income: income._sum.amount || 0,
        expense: expense._sum.amount || 0,
      });
    }

    const last7DaysText = dailyStats
      .map((item) => {
        return `${formatShortDate(item.date)}: ➕ ${formatMoney(
          item.income
        )} | ➖ ${formatMoney(item.expense)}`;
      })
      .join("\n");

    const todayExpenseAmount = todayExpense._sum.amount || 0;
    const todayIncomeAmount = todayIncome._sum.amount || 0;
    const monthExpenseAmount = monthExpense._sum.amount || 0;
    const monthIncomeAmount = monthIncome._sum.amount || 0;
    const monthBalance = monthIncomeAmount - monthExpenseAmount;

    const categoryText =
      expenseByCategory.length === 0
        ? "Chưa có khoản chi nào."
        : expenseByCategory
            .map((item, index) => {
              const amount = item._sum.amount || 0;

              return `${index + 1}. ${item.category}: ${formatMoney(
                amount
              )} - ${formatPercent(amount, monthExpenseAmount)}`;
            })
            .join("\n");

    const topCategory = expenseByCategory[0];

    const topCategoryText = topCategory
      ? `${topCategory.category} (${formatMoney(topCategory._sum.amount || 0)})`
      : "Chưa có dữ liệu";

    await ctx.reply(
      `📊 THỐNG KÊ THU CHI

Hôm nay:
➕ Thu: ${formatMoney(todayIncomeAmount)}
➖ Chi: ${formatMoney(todayExpenseAmount)}
💰 Còn lại: ${formatMoney(todayIncomeAmount - todayExpenseAmount)}

Tháng này:
➕ Thu: ${formatMoney(monthIncomeAmount)}
➖ Chi: ${formatMoney(monthExpenseAmount)}
💰 Còn lại: ${formatMoney(monthBalance)}

Chi nhiều nhất:
🏷 ${topCategoryText}

Chi theo danh mục tháng này:
${categoryText}

7 ngày gần nhất:
${last7DaysText}`
    );
  });
}