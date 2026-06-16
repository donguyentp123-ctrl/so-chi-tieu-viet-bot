import { Telegraf } from "telegraf";
import { prisma } from "../database/prisma";
import { formatMoney } from "../utils/money";

export function registerListCommand(bot: Telegraf) {
  bot.hears("📋 Danh sách", async (ctx) => {
    const userId = String(ctx.from.id);

    const records = await prisma.transaction.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    if (records.length === 0) {
      await ctx.reply("Bạn chưa có giao dịch nào.");
      return;
    }

    const text = records
      .map((record, index) => {
        const typeIcon = record.type === "EXPENSE" ? "➖" : "➕";
        const date = record.createdAt.toLocaleString("vi-VN");

        return `${index + 1}. ${typeIcon} ${formatMoney(record.amount)}
Danh mục: ${record.category}
Ghi chú: ${record.note || "Không có"}
Thời gian: ${date}`;
      })
      .join("\n\n");

    await ctx.reply(`📋 10 GIAO DỊCH GẦN NHẤT\n\n${text}`);
  });
}