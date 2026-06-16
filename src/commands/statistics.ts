import { Telegraf } from "telegraf";
import {
  formatPercent,
  getStatisticsReport,
} from "../services/statistics.service";
import { formatMoney } from "../utils/money";

function formatShortDate(date: Date) {
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function registerStatisticsCommand(bot: Telegraf) {
  bot.hears("📊 Thống kê", async (ctx) => {
    const userId = String(ctx.from.id);

    const report = await getStatisticsReport(userId);

    const categoryText =
      report.expenseByCategory.length === 0
        ? "Chưa có khoản chi nào."
        : report.expenseByCategory
            .map((item, index) => {
              const amount = item._sum.amount || 0;

              return `${index + 1}. ${item.category}: ${formatMoney(
                amount
              )} - ${formatPercent(amount, report.monthExpenseAmount)}`;
            })
            .join("\n");

    const topCategory = report.expenseByCategory[0];

    const topCategoryText = topCategory
      ? `${topCategory.category} (${formatMoney(topCategory._sum.amount || 0)})`
      : "Chưa có dữ liệu";

    const last7DaysText = report.dailyStats
      .map((item) => {
        return `${formatShortDate(item.date)}: ➕ ${formatMoney(
          item.income
        )} | ➖ ${formatMoney(item.expense)}`;
      })
      .join("\n");

    await ctx.reply(
      `📊 THỐNG KÊ THU CHI

Hôm nay:
➕ Thu: ${formatMoney(report.todayIncomeAmount)}
➖ Chi: ${formatMoney(report.todayExpenseAmount)}
💰 Còn lại: ${formatMoney(
        report.todayIncomeAmount - report.todayExpenseAmount
      )}

Tháng này:
➕ Thu: ${formatMoney(report.monthIncomeAmount)}
➖ Chi: ${formatMoney(report.monthExpenseAmount)}
💰 Còn lại: ${formatMoney(report.monthBalance)}

Chi nhiều nhất:
🏷 ${topCategoryText}

Chi theo danh mục tháng này:
${categoryText}

7 ngày gần nhất:
${last7DaysText}`
    );
  });
}