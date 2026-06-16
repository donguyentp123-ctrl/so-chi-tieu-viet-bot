import { TransactionType } from "@prisma/client";
import { Telegraf } from "telegraf";
import { prisma } from "../database/prisma";
import { cancelKeyboard, mainKeyboard } from "../keyboards/main.keyboard";
import { detectCategory } from "../utils/category";
import { formatMoney, parseAmount } from "../utils/money";

type PendingEdit = {
  transactionId: string;
  type: TransactionType;
};

const waitingForEditId = new Set<number>();
const waitingForEditContent = new Map<number, PendingEdit>();

export function registerEditCommand(bot: Telegraf) {
  bot.hears("✏️ Sửa giao dịch", async (ctx) => {
    waitingForEditId.add(ctx.from.id);

    await ctx.reply(
      `✏️ SỬA GIAO DỊCH

Bạn nhập mã giao dịch cần sửa.

Ví dụ:
a1b2c3d4

Bạn có thể bấm 📋 Danh sách để xem mã giao dịch.`,
      cancelKeyboard()
    );
  });

    bot.action(/^edit:(.+)/, async (ctx) => {
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

    waitingForEditContent.set(ctx.from.id, {
      transactionId: record.id,
      type: record.type,
    });

    await ctx.answerCbQuery();

    await ctx.reply(
      `✏️ SỬA GIAO DỊCH

Giao dịch hiện tại:

Mã: ${record.id.slice(0, 8)}
Loại: ${record.type === "EXPENSE" ? "Khoản chi" : "Khoản thu"}
Số tiền: ${formatMoney(record.amount)}
Danh mục: ${record.category}
Ghi chú: ${record.note || "Không có"}

Bạn nhập nội dung mới theo mẫu:

50000 ăn sáng
850k mua cây Anthurium`,
      cancelKeyboard()
    );
  });

  bot.on("text", async (ctx, next) => {
    const text = ctx.message.text.trim();
    const telegramUserId = ctx.from.id;
    const userId = String(telegramUserId);

    if (text === "❌ Hủy thao tác") {
      waitingForEditId.delete(telegramUserId);
      waitingForEditContent.delete(telegramUserId);

      await ctx.reply("Đã hủy thao tác.", mainKeyboard());
      return;
    }

    if (waitingForEditContent.has(telegramUserId)) {
      const pending = waitingForEditContent.get(telegramUserId)!;

      const [amountText, ...noteParts] = text.split(" ");
      const amount = parseAmount(amountText);
      const note = noteParts.join(" ").trim();

      if (!amount || !note) {
        await ctx.reply(
          `Bạn nhập chưa đúng.

Ví dụ:
50000 ăn sáng
850k mua cây Anthurium`
        );
        return;
      }

      const category = detectCategory(note, pending.type);

      const updated = await prisma.transaction.update({
        where: {
          id: pending.transactionId,
        },
        data: {
          amount,
          note,
          category,
        },
      });

      waitingForEditContent.delete(telegramUserId);

      await ctx.reply(
        `✅ ĐÃ SỬA GIAO DỊCH

Mã: ${updated.id.slice(0, 8)}
Số tiền mới: ${formatMoney(updated.amount)}
Danh mục mới: ${updated.category}
Ghi chú mới: ${updated.note || "Không có"}`,
        mainKeyboard()
      );

      return;
    }

    if (!waitingForEditId.has(telegramUserId)) {
      return next();
    }

    const record = await prisma.transaction.findFirst({
      where: {
        userId,
        id: {
          startsWith: text,
        },
      },
    });

    if (!record) {
      await ctx.reply("Không tìm thấy giao dịch này. Bạn kiểm tra lại mã nhé.");
      return;
    }

    waitingForEditId.delete(telegramUserId);
    waitingForEditContent.set(telegramUserId, {
      transactionId: record.id,
      type: record.type,
    });

    await ctx.reply(
      `Giao dịch hiện tại:

Mã: ${record.id.slice(0, 8)}
Loại: ${record.type === "EXPENSE" ? "Khoản chi" : "Khoản thu"}
Số tiền: ${formatMoney(record.amount)}
Danh mục: ${record.category}
Ghi chú: ${record.note || "Không có"}

Bạn nhập nội dung mới theo mẫu:

50000 ăn sáng
850k mua cây Anthurium`,
      cancelKeyboard()
    );
  });
}