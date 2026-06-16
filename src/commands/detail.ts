import { Telegraf } from "telegraf";
import { cancelKeyboard, mainKeyboard } from "../keyboards/main.keyboard";
import { getTransactionByShortId } from "../services/transaction.service";
import { formatTransactionDetail } from "../utils/transaction-message";
import { isMainMenuText } from "../utils/menu";

const waitingForDetailId = new Set<number>();

async function sendDetail(ctx: any, shortId: string) {
  const userId = String(ctx.from.id);
  const record = await getTransactionByShortId(userId, shortId);

  if (!record) {
    await ctx.reply("Không tìm thấy giao dịch này. Bạn kiểm tra lại mã nhé.");
    return;
  }

  await ctx.reply(formatTransactionDetail(record), mainKeyboard());
}

export function registerDetailCommand(bot: Telegraf) {
  bot.hears("🔍 Xem chi tiết", async (ctx) => {
    waitingForDetailId.add(ctx.from.id);

    await ctx.reply(
      `🔍 XEM CHI TIẾT GIAO DỊCH

Bạn nhập mã giao dịch cần xem.`,
      cancelKeyboard()
    );
  });

  bot.action(/^detail:(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await sendDetail(ctx, ctx.match[1]);
  });

  bot.on("text", async (ctx, next) => {
    const inputId = ctx.message.text.trim();

    if (isMainMenuText(inputId)) {
      waitingForDetailId.delete(ctx.from.id);
      return next();
    }

    if (!waitingForDetailId.has(ctx.from.id)) {
      return next();
    }

    if (inputId === "❌ Hủy thao tác") {
      waitingForDetailId.delete(ctx.from.id);
      await ctx.reply("Đã hủy thao tác.", mainKeyboard());
      return;
    }

    waitingForDetailId.delete(ctx.from.id);
    await sendDetail(ctx, inputId);
  });
}