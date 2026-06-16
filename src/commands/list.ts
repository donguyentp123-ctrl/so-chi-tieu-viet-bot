import { Telegraf, Markup } from "telegraf";
import { getPagedTransactions } from "../services/transaction-query.service";
import { getTransactionById } from "../services/transaction.service";
import {
  formatTransactionListItem,
  formatTransactionSummary,
} from "../utils/transaction-message";

async function sendTransactionList(ctx: any, page: number) {
  const userId = String(ctx.from.id);

  const result = await getPagedTransactions({
    userId,
    page,
  });

  const { records, totalPages, skip } = result;
  page = result.page;

  if (records.length === 0) {
    await ctx.reply("Bạn chưa có giao dịch nào.");
    return;
  }

  const text = records
    .map((record, index) =>
      formatTransactionListItem({
        record,
        number: skip + index + 1,
      })
    )
    .join("\n");

  const transactionButtons = records.map((record, index) =>
    Markup.button.callback(String(skip + index + 1), `tx_menu:${record.id}`)
  );

  const pageButtons = [];

  if (page > 1) {
    pageButtons.push(
      Markup.button.callback("⬅️ Trang trước", `tx_page:${page - 1}`)
    );
  }

  if (page < totalPages) {
    pageButtons.push(
      Markup.button.callback("Trang sau ➡️", `tx_page:${page + 1}`)
    );
  }

  const keyboardRows = [transactionButtons];

  if (pageButtons.length > 0) {
    keyboardRows.push(pageButtons);
  }

  await ctx.reply(
    `📋 DANH SÁCH GIAO DỊCH

Trang ${page}/${totalPages}

${text}

Bấm số bên dưới để xem/sửa/xóa giao dịch:`,
    Markup.inlineKeyboard(keyboardRows)
  );
}

export function registerListCommand(bot: Telegraf) {
  bot.hears("📋 Danh sách", async (ctx) => {
    await sendTransactionList(ctx, 1);
  });

  bot.action(/^tx_page:(\d+)/, async (ctx) => {
    const page = Number(ctx.match[1]);

    await ctx.answerCbQuery();
    await sendTransactionList(ctx, page);
  });

  bot.action(/^tx_menu:(.+)/, async (ctx) => {
    const id = ctx.match[1];
    const userId = String(ctx.from.id);

    const record = await getTransactionById(userId, id);

    if (!record) {
      await ctx.answerCbQuery("Không tìm thấy giao dịch.");
      return;
    }

    await ctx.answerCbQuery();

    await ctx.reply(
      formatTransactionSummary(record),
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