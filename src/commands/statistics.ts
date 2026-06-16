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

    const todayExpenseAmount = todayExpense._sum.amount || 0;
    const todayIncomeAmount = todayIncome._sum.amount || 0;
    const monthExpenseAmount = monthExpense._sum.amount || 0;
    const monthIncomeAmount = monthIncome._sum.amount || 0;

    const categoryText =
      expenseByCategory.length === 0
        ? "Chưa có khoản chi nào."
        : expenseByCategory
            .map((item, index) => {
              return `${index + 1}. ${item.category}: ${formatMoney(
                item._sum.amount || 0
              )}`;
            })
            .join("\n");

    await ctx.reply(
      `📊 THỐNG KÊ THU CHI

Hôm nay:
➕ Thu: ${formatMoney(todayIncomeAmount)}
➖ Chi: ${formatMoney(todayExpenseAmount)}
💰 Còn lại: ${formatMoney(todayIncomeAmount - todayExpenseAmount)}

Tháng này:
➕ Thu: ${formatMoney(monthIncomeAmount)}
➖ Chi: ${formatMoney(monthExpenseAmount)}
💰 Còn lại: ${formatMoney(monthIncomeAmount - monthExpenseAmount)}

Chi theo danh mục tháng này:
${categoryText}`
    );
  });
}