import { Telegraf, Markup } from "telegraf";
import { cancelKeyboard, mainKeyboard } from "../keyboards/main.keyboard";
import {
  getTransactionById,
  getTransactionByShortId,
  removeTransaction,
} from "../services/transaction.service";
import { formatMoney } from "../utils/money";
import { isMainMenuText } from "../utils/menu";

const waitingForDeleteId = new Set<number>();

async function askDeleteConfirm(ctx: any, shortId: string) {
  const userId = String(ctx.from.id);
  const record = await getTransactionByShortId(userId, shortId);

  if (!record) {
    await ctx.reply("Không tìm thấy giao dịch này. Bạn kiểm tra lại mã nhé.");
    return;
  }

  await ctx.reply(
    `⚠️ XÁC NHẬN XÓA

Bạn có chắc muốn xóa giao dịch này không?

Mã: ${record.id.slice(0, 8)}
Số tiền: ${formatMoney(record.amount)}
Danh mục: ${record.category}
Ghi chú: ${record.note || "Không có"}`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("✅ Đồng ý xóa", `delete_confirm:${record.id}`),
        Markup.button.callback("❌ Hủy", "delete_cancel"),
      ],
    ])
  );
}

export function registerDeleteCommand(bot: Telegraf) {
  bot.hears("🗑 Xóa giao dịch", async (ctx) => {
    waitingForDeleteId.add(ctx.from.id);

    await ctx.reply(
      `🗑 XÓA GIAO DỊCH

Bạn nhập mã giao dịch cần xóa.`,
      cancelKeyboard()
    );
  });

  bot.action(/^delete:(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await askDeleteConfirm(ctx, ctx.match[1]);
  });

  bot.action(/^delete_confirm:(.+)/, async (ctx) => {
    const id = ctx.match[1];
    const userId = String(ctx.from.id);

    const record = await getTransactionById(userId, id);

    if (!record) {
      await ctx.answerCbQuery("Không tìm thấy giao dịch.");
      return;
    }

    await removeTransaction(record.id);
    await ctx.answerCbQuery("Đã xóa.");

    await ctx.reply(
      `✅ ĐÃ XÓA GIAO DỊCH

Số tiền: ${formatMoney(record.amount)}
Danh mục: ${record.category}
Ghi chú: ${record.note || "Không có"}`,
      mainKeyboard()
    );
  });

  bot.action("delete_cancel", async (ctx) => {
    await ctx.answerCbQuery("Đã hủy.");
    await ctx.reply("Đã hủy xóa giao dịch.", mainKeyboard());
  });

  bot.on("text", async (ctx, next) => {
    const inputId = ctx.message.text.trim();

    if (isMainMenuText(inputId)) {
      waitingForDeleteId.delete(ctx.from.id);
      return next();
    }

    if (!waitingForDeleteId.has(ctx.from.id)) {
      return next();
    }

    if (inputId === "❌ Hủy thao tác") {
      waitingForDeleteId.delete(ctx.from.id);
      await ctx.reply("Đã hủy thao tác.", mainKeyboard());
      return;
    }

    waitingForDeleteId.delete(ctx.from.id);
    await askDeleteConfirm(ctx, inputId);
  });
}