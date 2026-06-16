import { Telegraf } from "telegraf";
import { prisma } from "../database/prisma";
import { formatMoney, parseAmount } from "../utils/money";
import { detectCategory } from "../utils/category";

const waitingForExpense = new Set<number>();

export function registerExpenseCommand(bot: Telegraf) {
  bot.hears("➕ Thêm khoản chi", async (ctx) => {
    waitingForExpense.add(ctx.from.id);

    await ctx.reply(
      `➕ THÊM KHOẢN CHI

Bạn nhập theo mẫu:

50000 ăn sáng
850k mua cây Anthurium
1tr2 mua đồ

Hiện tại danh mục mặc định là: Khác`
    );
  });

  bot.on("text", async (ctx, next) => {
    if (!waitingForExpense.has(ctx.from.id)) {
      return next();
    }

    const text = ctx.message.text.trim();
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

    const userId = String(ctx.from.id);

    await prisma.user.upsert({
      where: {
        id: userId,
      },
      update: {
        firstName: ctx.from.first_name,
        username: ctx.from.username,
      },
      create: {
        id: userId,
        firstName: ctx.from.first_name,
        username: ctx.from.username,
      },
    });

    const category = detectCategory(note, "EXPENSE");
    const record = await prisma.transaction.create({
    data: {
        userId,
        type: "EXPENSE",
        amount,
        category,
        note,
    },
    });

    waitingForExpense.delete(ctx.from.id);

    await ctx.reply(
      `✅ ĐÃ LƯU KHOẢN CHI

Mã: ${record.id}
Số tiền: ${formatMoney(amount)}
Danh mục: ${category}
Ghi chú: ${note}`
    );
  });
}