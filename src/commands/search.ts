import { Prisma } from "@prisma/client";
import { Telegraf, Markup } from "telegraf";
import { getPagedTransactions } from "../services/transaction-query.service";
import { cancelKeyboard, mainKeyboard } from "../keyboards/main.keyboard";
import { formatTransactionListItem } from "../utils/transaction-message";
import { isMainMenuText } from "../utils/menu";

const waitingForSearchKeyword = new Set<number>();
const userSearchKeyword = new Map<number, string>();

function getSearchWhere(keyword: string): Prisma.TransactionWhereInput {
  return {
    OR: [
      {
        note: {
          contains: keyword,
          mode: "insensitive",
        },
      },
      {
        category: {
          contains: keyword,
          mode: "insensitive",
        },
      },
    ],
  };
}

async function sendSearchResults(ctx: any, keyword: string, page: number) {
  const userId = String(ctx.from.id);

  const result = await getPagedTransactions({
    userId,
    page,
    where: getSearchWhere(keyword),
  });

  const { records, totalPages, skip } = result;
  page = result.page;

  if (records.length === 0) {
    await ctx.reply(
      `Không tìm thấy giao dịch nào với từ khóa: ${keyword}`,
      mainKeyboard()
    );
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
      Markup.button.callback("⬅️ Trang trước", `search_page:${page - 1}`)
    );
  }

  if (page < totalPages) {
    pageButtons.push(
      Markup.button.callback("Trang sau ➡️", `search_page:${page + 1}`)
    );
  }

  const keyboardRows = [transactionButtons];

  if (pageButtons.length > 0) {
    keyboardRows.push(pageButtons);
  }

  await ctx.reply(
    `🔎 KẾT QUẢ TÌM KIẾM

Từ khóa: ${keyword}
Trang ${page}/${totalPages}

${text}

Bấm số bên dưới để xem/sửa/xóa giao dịch:`,
    Markup.inlineKeyboard(keyboardRows)
  );
}

export function registerSearchCommand(bot: Telegraf) {
  bot.hears("🔎 Tìm kiếm", async (ctx) => {
    waitingForSearchKeyword.add(ctx.from.id);

    await ctx.reply(
      `🔎 TÌM KIẾM GIAO DỊCH

Bạn nhập từ khóa cần tìm.

Ví dụ:
ăn sáng
Anthurium
lương
cafe`,
      cancelKeyboard()
    );
  });

  bot.action(/^search_page:(\d+)/, async (ctx) => {
    const page = Number(ctx.match[1]);
    const keyword = userSearchKeyword.get(ctx.from.id);

    if (!keyword) {
      await ctx.answerCbQuery("Không tìm thấy từ khóa tìm kiếm.");
      return;
    }

    await ctx.answerCbQuery();
    await sendSearchResults(ctx, keyword, page);
  });

  bot.on("text", async (ctx, next) => {
    const text = ctx.message.text.trim();

    if (!waitingForSearchKeyword.has(ctx.from.id)) {
      return next();
    }

    if (isMainMenuText(text)) {
      waitingForSearchKeyword.delete(ctx.from.id);
      userSearchKeyword.delete(ctx.from.id);
      return next();
    }

    if (text === "❌ Hủy thao tác") {
      waitingForSearchKeyword.delete(ctx.from.id);
      userSearchKeyword.delete(ctx.from.id);

      await ctx.reply("Đã hủy tìm kiếm.", mainKeyboard());
      return;
    }

    waitingForSearchKeyword.delete(ctx.from.id);
    userSearchKeyword.set(ctx.from.id, text);

    await sendSearchResults(ctx, text, 1);
    await ctx.reply("Đã tìm kiếm xong.", mainKeyboard());
  });
}