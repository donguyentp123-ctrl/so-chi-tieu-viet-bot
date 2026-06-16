import { Telegraf } from "telegraf";
import { prisma } from "../database/prisma";
import { formatMoney, parseAmount } from "../utils/money";
import { detectCategory } from "../utils/category";

const waitingForIncome = new Set<number>();

export function registerIncomeCommand(bot: Telegraf) {
  bot.hears("💰 Thêm khoản thu", async (ctx) => {
    waitingForIncome.add(ctx.from.id);

    await ctx.reply(
      `💰 THÊM KHOẢN THU

Bạn nhập theo mẫu:

500000 lương phụ
12tr lương tháng
200k được hoàn tiền

Hiện tại danh mục mặc định là: Khác`
    );
  });

  bot.on("text", async (ctx, next) => {
    if (!waitingForIncome.has(ctx.from.id)) {
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
500000 lương phụ
12tr lương tháng`
      );
      return;
    }

    const userId = String(ctx.from.id);

    await prisma.user.upsert({
      where: { id: userId },
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

    const category = detectCategory(note, "INCOME");
    const record = await prisma.transaction.create({
    data: {
        userId,
        type: "INCOME",
        amount,
        category,
        note,
    },
    });

    waitingForIncome.delete(ctx.from.id);

    await ctx.reply(
      `✅ ĐÃ LƯU KHOẢN THU

Mã: ${record.id}
Số tiền: ${formatMoney(amount)}
Danh mục: ${category}
Ghi chú: ${note}`
    );
  });
}