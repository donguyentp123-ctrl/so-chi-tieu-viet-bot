import { Telegraf, Markup } from "telegraf";
import { prisma } from "../database/prisma";
import { cancelKeyboard, mainKeyboard } from "../keyboards/main.keyboard";
import { formatMoney } from "../utils/money";
import { isMainMenuText } from "../utils/menu";

const PAGE_SIZE = 5;
const waitingForSearchKeyword = new Set<number>();
const userSearchKeyword = new Map<number, string>();

async function sendSearchResults(ctx: any, keyword: string, page: number) {
  const userId = String(ctx.from.id);

  const where = {
    userId,
    OR: [
      {
        note: {
          contains: keyword,
          mode: "insensitive" as const,
        },
      },
      {
        category: {
          contains: keyword,
          mode: "insensitive" as const,
        },
      },
    ],
  };

  const total = await prisma.transaction.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  const skip = (page - 1) * PAGE_SIZE;

  const records = await prisma.transaction.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
    skip,
    take: PAGE_SIZE,
  });

  if (records.length === 0) {
    await ctx.reply(`Không tìm thấy giao dịch nào với từ khóa: ${keyword}`, mainKeyboard());
    return;
  }

  const text = records
    .map((record, index) => {
      const number = skip + index + 1;
      const typeIcon = record.type === "EXPENSE" ? "➖" : "➕";
      const note = record.note || "Không có";
      const shortNote = note.length > 22 ? note.slice(0, 22) + "..." : note;

      return `${number}. ${typeIcon} ${formatMoney(record.amount)} | ${
        record.category
      } | ${shortNote}`;
    })
    .join("\n");

  const transactionButtons = records.map((record, index) =>
    Markup.button.callback(String(skip + index + 1), `tx_menu:${record.id}`)
  );

  const pageButtons = [];

  if (page > 1) {
    pageButtons.push(Markup.button.callback("⬅️ Trang trước", `search_page:${page - 1}`));
  }

  if (page < totalPages) {
    pageButtons.push(Markup.button.callback("Trang sau ➡️", `search_page:${page + 1}`));
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
        if (isMainMenuText(text)) {
      waitingForSearchKeyword.delete(ctx.from.id);
      userSearchKeyword.delete(ctx.from.id);
      return next();
    }
    if (!waitingForSearchKeyword.has(ctx.from.id)) {
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