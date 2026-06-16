import { Telegraf, Markup } from "telegraf";
import { prisma } from "../database/prisma";
import { formatMoney } from "../utils/money";

export function registerListCommand(bot: Telegraf) {
  bot.hears("📋 Danh sách", async (ctx) => {
    const userId = String(ctx.from.id);

    const records = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    if (records.length === 0) {
      await ctx.reply("Bạn chưa có giao dịch nào.");
      return;
    }

    const text = records
      .map((record, index) => {
        const typeIcon = record.type === "EXPENSE" ? "➖" : "➕";
        const note = record.note || "Không có";
        const shortNote = note.length > 20 ? note.slice(0, 20) + "..." : note;

        return `${index + 1}. ${typeIcon} ${formatMoney(record.amount)} | ${
          record.category
        } | ${shortNote}`;
      })
      .join("\n");

    const buttons = records.map((record, index) =>
      Markup.button.callback(String(index + 1), `tx_menu:${record.id}`)
    );

    await ctx.reply(
      `📋 10 GIAO DỊCH GẦN NHẤT

${text}

Bấm số bên dưới để xem/sửa/xóa giao dịch:`,
      Markup.inlineKeyboard(buttons, {
        columns: 5,
      })
    );
  });

  bot.action(/^tx_menu:(.+)/, async (ctx) => {
    const id = ctx.match[1];
    const userId = String(ctx.from.id);

    const record = await prisma.transaction.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!record) {
      await ctx.answerCbQuery("Không tìm thấy giao dịch.");
      return;
    }

    await ctx.answerCbQuery();

    const typeText = record.type === "EXPENSE" ? "➖ Chi" : "➕ Thu";

    await ctx.reply(
      `${typeText} | ${formatMoney(record.amount)}

Mã: ${record.id.slice(0, 8)}
Danh mục: ${record.category}
Ghi chú: ${record.note || "Không có"}
Thời gian: ${record.createdAt.toLocaleString("vi-VN")}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("🔍 Xem", `detail:${record.id.slice(0, 8)}`),
          Markup.button.callback("✏️ Sửa", `edit:${record.id.slice(0, 8)}`),
          Markup.button.callback("🗑 Xóa", `delete:${record.id.slice(0, 8)}`),
        ],
      ])
    );
  });
}