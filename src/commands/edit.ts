import { TransactionType } from "@prisma/client";
import { Telegraf, Markup } from "telegraf";
import { prisma } from "../database/prisma";
import {
  cancelKeyboard,
  mainKeyboard,
} from "../keyboards/main.keyboard";
import {
  expenseCategoryKeyboard,
  incomeCategoryKeyboard,
} from "../keyboards/category.keyboard";
import { formatMoney, parseAmount } from "../utils/money";
import { isMainMenuText } from "../utils/menu";

type EditField = "amount" | "category" | "note";

type PendingEdit = {
  transactionId: string;
  type: TransactionType;
  field?: EditField;
};

const waitingForEditId = new Set<number>();
const waitingForEditInput = new Map<number, PendingEdit>();

function editMenuKeyboard(transactionId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("💰 Sửa số tiền", `edit_amount:${transactionId}`),
      Markup.button.callback(
        "🏷 Sửa danh mục",
        `edit_category:${transactionId}`
      ),
    ],
    [Markup.button.callback("📝 Sửa ghi chú", `edit_note:${transactionId}`)],
    [Markup.button.callback("❌ Hủy", "edit_cancel")],
  ]);
}

const expenseCategoryMap: Record<string, string> = {
  "🍜 Ăn uống": "Ăn uống",
  "🌱 Cây cảnh": "Cây cảnh",
  "🚕 Di chuyển": "Di chuyển",
  "🛒 Mua sắm": "Mua sắm",
  "💊 Y tế": "Y tế",
  "📚 Học tập": "Học tập",
  "🎮 Giải trí": "Giải trí",
  "📦 Khác": "Khác",
};

const incomeCategoryMap: Record<string, string> = {
  "💼 Lương": "Lương",
  "🎁 Thưởng": "Thưởng",
  "↩️ Hoàn tiền": "Hoàn tiền",
  "💸 Thu nhập phụ": "Thu nhập phụ",
  "📦 Khác": "Khác",
};

async function showEditMenu(ctx: any, transactionId: string) {
  const userId = String(ctx.from.id);

  const record = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      userId,
    },
  });

  if (!record) {
    await ctx.reply("Không tìm thấy giao dịch.");
    return;
  }

  await ctx.reply(
    `✏️ SỬA GIAO DỊCH

Mã: ${record.id.slice(0, 8)}
Loại: ${record.type === "EXPENSE" ? "➖ Khoản chi" : "➕ Khoản thu"}
Số tiền: ${formatMoney(record.amount)}
Danh mục: ${record.category}
Ghi chú: ${record.note || "Không có"}

Bạn muốn sửa thông tin nào?`,
    editMenuKeyboard(record.id)
  );
}

export function registerEditCommand(bot: Telegraf) {
  bot.hears("✏️ Sửa giao dịch", async (ctx) => {
    waitingForEditId.add(ctx.from.id);

    await ctx.reply(
      `✏️ SỬA GIAO DỊCH

Bạn nhập mã giao dịch cần sửa.

Bạn có thể bấm 📋 Danh sách để chọn giao dịch nhanh hơn.`,
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

    await ctx.answerCbQuery();
    await showEditMenu(ctx, record.id);
  });

  bot.action(/^edit_amount:(.+)/, async (ctx) => {
    const transactionId = ctx.match[1];

    const record = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: String(ctx.from.id),
      },
    });

    if (!record) {
      await ctx.answerCbQuery("Không tìm thấy giao dịch.");
      return;
    }

    waitingForEditInput.set(ctx.from.id, {
      transactionId: record.id,
      type: record.type,
      field: "amount",
    });

    await ctx.answerCbQuery();
    await ctx.reply(
      "Bạn nhập số tiền mới. Ví dụ: 50000, 850k, 1tr2",
      cancelKeyboard()
    );
  });

  bot.action(/^edit_note:(.+)/, async (ctx) => {
    const transactionId = ctx.match[1];

    const record = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: String(ctx.from.id),
      },
    });

    if (!record) {
      await ctx.answerCbQuery("Không tìm thấy giao dịch.");
      return;
    }

    waitingForEditInput.set(ctx.from.id, {
      transactionId: record.id,
      type: record.type,
      field: "note",
    });

    await ctx.answerCbQuery();
    await ctx.reply("Bạn nhập ghi chú mới.", cancelKeyboard());
  });

  bot.action(/^edit_category:(.+)/, async (ctx) => {
    const transactionId = ctx.match[1];

    const record = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: String(ctx.from.id),
      },
    });

    if (!record) {
      await ctx.answerCbQuery("Không tìm thấy giao dịch.");
      return;
    }

    waitingForEditInput.set(ctx.from.id, {
      transactionId: record.id,
      type: record.type,
      field: "category",
    });

    await ctx.answerCbQuery();

    if (record.type === "EXPENSE") {
      await ctx.reply(
        "Bạn chọn danh mục mới cho khoản chi:",
        expenseCategoryKeyboard()
      );
    } else {
      await ctx.reply(
        "Bạn chọn danh mục mới cho khoản thu:",
        incomeCategoryKeyboard()
      );
    }
  });

  bot.action("edit_cancel", async (ctx) => {
    waitingForEditId.delete(ctx.from.id);
    waitingForEditInput.delete(ctx.from.id);

    await ctx.answerCbQuery("Đã hủy.");
    await ctx.reply("Đã hủy sửa giao dịch.", mainKeyboard());
  });

  bot.on("text", async (ctx, next) => {
    const text = ctx.message.text.trim();
    const telegramUserId = ctx.from.id;
    const userId = String(telegramUserId);

    if (isMainMenuText(text)) {
      waitingForEditId.delete(telegramUserId);
      waitingForEditInput.delete(telegramUserId);
      return next();
    }

    if (text === "❌ Hủy thao tác") {
      waitingForEditId.delete(telegramUserId);
      waitingForEditInput.delete(telegramUserId);

      await ctx.reply("Đã hủy thao tác.", mainKeyboard());
      return;
    }

    if (waitingForEditInput.has(telegramUserId)) {
      const pending = waitingForEditInput.get(telegramUserId)!;

      if (pending.field === "amount") {
        const amount = parseAmount(text);

        if (!amount) {
          await ctx.reply("Số tiền chưa đúng. Ví dụ: 50000, 850k, 1tr2");
          return;
        }

        const updated = await prisma.transaction.update({
          where: {
            id: pending.transactionId,
          },
          data: {
            amount,
          },
        });

        waitingForEditInput.delete(telegramUserId);

        await ctx.reply(
          `✅ ĐÃ SỬA SỐ TIỀN

Mã: ${updated.id.slice(0, 8)}
Số tiền mới: ${formatMoney(updated.amount)}`,
          mainKeyboard()
        );

        return;
      }

      if (pending.field === "note") {
        const updated = await prisma.transaction.update({
          where: {
            id: pending.transactionId,
          },
          data: {
            note: text,
          },
        });

        waitingForEditInput.delete(telegramUserId);

        await ctx.reply(
          `✅ ĐÃ SỬA GHI CHÚ

Mã: ${updated.id.slice(0, 8)}
Ghi chú mới: ${updated.note || "Không có"}`,
          mainKeyboard()
        );

        return;
      }

      if (pending.field === "category") {
        const category =
          pending.type === "EXPENSE"
            ? expenseCategoryMap[text]
            : incomeCategoryMap[text];

        if (!category) {
          await ctx.reply("Bạn vui lòng chọn danh mục bằng nút bên dưới.");
          return;
        }

        const updated = await prisma.transaction.update({
          where: {
            id: pending.transactionId,
          },
          data: {
            category,
          },
        });

        waitingForEditInput.delete(telegramUserId);

        await ctx.reply(
          `✅ ĐÃ SỬA DANH MỤC

Mã: ${updated.id.slice(0, 8)}
Danh mục mới: ${updated.category}`,
          mainKeyboard()
        );

        return;
      }
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

    await showEditMenu(ctx, record.id);
  });
}