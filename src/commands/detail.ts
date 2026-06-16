import { Telegraf } from "telegraf";
import { prisma } from "../database/prisma";
import { formatMoney } from "../utils/money";
import { cancelKeyboard, mainKeyboard } from "../keyboards/main.keyboard";

const waitingForDetailId = new Set<number>();

export function registerDetailCommand(bot: Telegraf) {
  bot.hears("🔍 Xem chi tiết", async (ctx) => {
    waitingForDetailId.add(ctx.from.id);

    await ctx.reply(
      `🔍 XEM CHI TIẾT GIAO DỊCH

Bạn nhập mã giao dịch cần xem.

Ví dụ:
a1b2c3d4

Bạn có thể bấm 📋 Danh sách để xem mã giao dịch.`,
      cancelKeyboard()
    );
  });

    bot.action(/^detail:(.+)/, async (ctx) => {
    const shortId = ctx.match[1];
    const userId = String(ctx.from.id);

    const record = await prisma.transaction.findFirst({
      where: {
        userId,
        id: {
          startsWith: shortId,
        },
      },
    });

    if (!record) {
      await ctx.answerCbQuery("Không tìm thấy giao dịch.");
      return;
    }

    await ctx.answerCbQuery();

    const typeText = record.type === "EXPENSE" ? "Khoản chi" : "Khoản thu";
    const typeIcon = record.type === "EXPENSE" ? "➖" : "➕";

    await ctx.reply(
      `🔍 CHI TIẾT GIAO DỊCH

Mã: ${record.id.slice(0, 8)}
Loại: ${typeIcon} ${typeText}
Số tiền: ${formatMoney(record.amount)}
Danh mục: ${record.category}
Ghi chú: ${record.note || "Không có"}
Thời gian: ${record.createdAt.toLocaleString("vi-VN")}`
    );
  });
  
  bot.on("text", async (ctx, next) => {
    if (!waitingForDetailId.has(ctx.from.id)) {
      return next();
    }

    const inputId = ctx.message.text.trim();

    if (inputId === "❌ Hủy thao tác") {
      waitingForDetailId.delete(ctx.from.id);
      await ctx.reply("Đã hủy thao tác.", mainKeyboard());
      return;
    }

    const userId = String(ctx.from.id);

    const record = await prisma.transaction.findFirst({
      where: {
        userId,
        id: {
          startsWith: inputId,
        },
      },
    });

    if (!record) {
      await ctx.reply("Không tìm thấy giao dịch này. Bạn kiểm tra lại mã nhé.");
      return;
    }

    waitingForDetailId.delete(ctx.from.id);

    const typeText = record.type === "EXPENSE" ? "Khoản chi" : "Khoản thu";
    const typeIcon = record.type === "EXPENSE" ? "➖" : "➕";

    await ctx.reply(
      `🔍 CHI TIẾT GIAO DỊCH

Mã: ${record.id.slice(0, 8)}
Loại: ${typeIcon} ${typeText}
Số tiền: ${formatMoney(record.amount)}
Danh mục: ${record.category}
Ghi chú: ${record.note || "Không có"}
Thời gian: ${record.createdAt.toLocaleString("vi-VN")}`,
      mainKeyboard()
    );
  });
}