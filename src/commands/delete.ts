import { Telegraf } from "telegraf";
import { prisma } from "../database/prisma";
import { formatMoney } from "../utils/money";

const waitingForDeleteId = new Set<number>();

export function registerDeleteCommand(bot: Telegraf) {
  bot.hears("🗑 Xóa giao dịch", async (ctx) => {
    waitingForDeleteId.add(ctx.from.id);

    await ctx.reply(
      `🗑 XÓA GIAO DỊCH

Bạn nhập mã giao dịch cần xóa.

Bạn có thể bấm 📋 Danh sách để xem mã giao dịch.`
    );
  });

  bot.on("text", async (ctx, next) => {
    if (!waitingForDeleteId.has(ctx.from.id)) {
      return next();
    }

    const id = ctx.message.text.trim();
    const userId = String(ctx.from.id);

    const record = await prisma.transaction.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!record) {
      await ctx.reply("Không tìm thấy giao dịch này.");
      return;
    }

    await prisma.transaction.delete({
      where: {
        id,
      },
    });

    waitingForDeleteId.delete(ctx.from.id);

    await ctx.reply(
      `✅ ĐÃ XÓA GIAO DỊCH

Số tiền: ${formatMoney(record.amount)}
Danh mục: ${record.category}
Ghi chú: ${record.note || "Không có"}`
    );
  });
}