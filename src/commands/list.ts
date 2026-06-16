import { Telegraf, Markup } from "telegraf";
import { getTransactions, countTransactions } from "../repositories/transaction.repository";
import { formatMoney } from "../utils/money";

const PAGE_SIZE = 5;

async function sendTransactionList(ctx: any, page: number) {
  const userId = String(ctx.from.id);

  const total = await countTransactions({ userId });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  const skip = (page - 1) * PAGE_SIZE;

  const records = await getTransactions({
    userId,
    skip,
    take: PAGE_SIZE,
  });

  if (records.length === 0) {
    await ctx.reply("Bạn chưa có giao dịch nào.");
    return;
  }

  const text = records
    .map((record, index) => {
      const number = skip + index + 1;
      const typeIcon = record.type === "EXPENSE" ? "➖" : "➕";
      const note = record.note || "Không có";
      const shortNote = note.length > 20 ? note.slice(0, 20) + "..." : note;

      return `${number}. ${typeIcon} ${formatMoney(record.amount)} | ${record.category} | ${shortNote}`;
    })
    .join("\n");

  const transactionButtons = records.map((record, index) =>
    Markup.button.callback(String(skip + index + 1), `tx_menu:${record.id}`)
  );

  const pageButtons = [];

  if (page > 1) {
    pageButtons.push(Markup.button.callback("⬅️ Trang trước", `tx_page:${page - 1}`));
  }

  if (page < totalPages) {
    pageButtons.push(Markup.button.callback("Trang sau ➡️", `tx_page:${page + 1}`));
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

    const records = await getTransactions({
      userId,
      where: { id },
      take: 1,
    });

    const record = records[0];

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