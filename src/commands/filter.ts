import { Prisma, TransactionType } from "@prisma/client";
import { Telegraf, Markup } from "telegraf";
import { getPagedTransactions } from "../services/transaction-query.service";
import { formatTransactionListItem } from "../utils/transaction-message";

function getStartOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function getStartOfMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function filterKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("📅 Hôm nay", "filter:today:1"),
      Markup.button.callback("📆 Tháng này", "filter:month:1"),
    ],
    [
      Markup.button.callback("➖ Khoản chi", "filter:expense:1"),
      Markup.button.callback("➕ Khoản thu", "filter:income:1"),
    ],
    [
      Markup.button.callback("🍜 Ăn uống", "filter_cat:Ăn uống:1"),
      Markup.button.callback("🌱 Cây cảnh", "filter_cat:Cây cảnh:1"),
    ],
    [
      Markup.button.callback("🚕 Di chuyển", "filter_cat:Di chuyển:1"),
      Markup.button.callback("🛒 Mua sắm", "filter_cat:Mua sắm:1"),
    ],
    [
      Markup.button.callback("💊 Y tế", "filter_cat:Y tế:1"),
      Markup.button.callback("📦 Khác", "filter_cat:Khác:1"),
    ],
  ]);
}

function getFilterConfig(filterType: string): {
  title: string;
  where: Prisma.TransactionWhereInput;
} | null {
  if (filterType === "today") {
    return {
      title: "📅 GIAO DỊCH HÔM NAY",
      where: {
        createdAt: {
          gte: getStartOfToday(),
        },
      },
    };
  }

  if (filterType === "month") {
    return {
      title: "📆 GIAO DỊCH THÁNG NÀY",
      where: {
        createdAt: {
          gte: getStartOfMonth(),
        },
      },
    };
  }

  if (filterType === "expense") {
    return {
      title: "➖ DANH SÁCH KHOẢN CHI",
      where: {
        type: TransactionType.EXPENSE,
      },
    };
  }

  if (filterType === "income") {
    return {
      title: "➕ DANH SÁCH KHOẢN THU",
      where: {
        type: TransactionType.INCOME,
      },
    };
  }

  return null;
}

async function sendFilteredList(
  ctx: any,
  title: string,
  where: Prisma.TransactionWhereInput,
  page: number,
  callbackPrefix: string
) {
  const userId = String(ctx.from.id);

  const result = await getPagedTransactions({
    userId,
    page,
    where,
  });

  const { records, totalPages, skip } = result;
  page = result.page;

  if (records.length === 0) {
    await ctx.reply(`${title}\n\nKhông có giao dịch phù hợp.`);
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
      Markup.button.callback("⬅️ Trang trước", `${callbackPrefix}:${page - 1}`)
    );
  }

  if (page < totalPages) {
    pageButtons.push(
      Markup.button.callback("Trang sau ➡️", `${callbackPrefix}:${page + 1}`)
    );
  }

  const keyboardRows = [transactionButtons];

  if (pageButtons.length > 0) {
    keyboardRows.push(pageButtons);
  }

  await ctx.reply(
    `${title}

Trang ${page}/${totalPages}

${text}

Bấm số bên dưới để xem/sửa/xóa giao dịch:`,
    Markup.inlineKeyboard(keyboardRows)
  );
}

export function registerFilterCommand(bot: Telegraf) {
  bot.hears("🧭 Bộ lọc", async (ctx) => {
    await ctx.reply(
      "🧭 Bạn muốn lọc giao dịch theo tiêu chí nào?",
      filterKeyboard()
    );
  });

  bot.action(/^filter:(today|month|expense|income):(\d+)/, async (ctx) => {
    const filterType = ctx.match[1];
    const page = Number(ctx.match[2]);
    const config = getFilterConfig(filterType);

    if (!config) {
      await ctx.answerCbQuery("Bộ lọc không hợp lệ.");
      return;
    }

    await ctx.answerCbQuery();

    await sendFilteredList(
      ctx,
      config.title,
      config.where,
      page,
      `filter:${filterType}`
    );
  });

  bot.action(/^filter_cat:(.+):(\d+)/, async (ctx) => {
    const category = ctx.match[1];
    const page = Number(ctx.match[2]);

    await ctx.answerCbQuery();

    await sendFilteredList(
      ctx,
      `🏷 GIAO DỊCH DANH MỤC: ${category}`,
      { category },
      page,
      `filter_cat:${category}`
    );
  });
}