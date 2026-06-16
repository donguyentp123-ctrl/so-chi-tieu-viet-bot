import { Telegraf } from "telegraf";
import { prisma } from "../database/prisma";
import { formatMoney, parseAmount } from "../utils/money";
import { detectCategory } from "../utils/category";
import { incomeCategoryKeyboard } from "../keyboards/category.keyboard";
import { cancelKeyboard, mainKeyboard } from "../keyboards/main.keyboard";

type PendingIncome = {
  amount: number;
  note: string;
  suggestedCategory: string;
};

const waitingForIncome = new Set<number>();
const waitingForIncomeCategory = new Map<number, PendingIncome>();

const categoryMap: Record<string, string> = {
  "💼 Lương": "Lương",
  "🎁 Thưởng": "Thưởng",
  "↩️ Hoàn tiền": "Hoàn tiền",
  "💸 Thu nhập phụ": "Thu nhập phụ",
  "📦 Khác": "Khác",
};

export function registerIncomeCommand(bot: Telegraf) {
  bot.hears("💰 Thêm khoản thu", async (ctx) => {
    waitingForIncome.add(ctx.from.id);

    await ctx.reply(
      `💰 THÊM KHOẢN THU

Bạn nhập theo mẫu:

500000 lương phụ
12tr lương tháng
200k được hoàn tiền`,
      cancelKeyboard()
    );
  });

  bot.on("text", async (ctx, next) => {
    const text = ctx.message.text.trim();
        if (text === "❌ Hủy thao tác") {
      waitingForIncome.delete(ctx.from.id);
      waitingForIncomeCategory.delete(ctx.from.id);

      await ctx.reply("Đã hủy thao tác.", mainKeyboard());
      return;
    }
    if (text === "📋 Danh sách" || text === "📊 Thống kê" || text === "➕ Thêm khoản chi" || text === "💰 Thêm khoản thu" || text === "🔍 Xem chi tiết" || text === "🗑 Xóa giao dịch" || text === "⚙️ Cài đặt" || text === "❓ Trợ giúp" || text === "/start") {
  waitingForIncome.delete(ctx.from.id);
  waitingForIncomeCategory.delete(ctx.from.id);
  return next();
}

    if (waitingForIncomeCategory.has(ctx.from.id)) {
      const selectedCategory = categoryMap[text];

      if (!selectedCategory) {
        await ctx.reply("Bạn vui lòng chọn danh mục bằng nút bên dưới.");
        return;
      }

      const pending = waitingForIncomeCategory.get(ctx.from.id)!;
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

      const record = await prisma.transaction.create({
        data: {
          userId,
          type: "INCOME",
          amount: pending.amount,
          category: selectedCategory,
          note: pending.note,
        },
      });

      waitingForIncomeCategory.delete(ctx.from.id);

      await ctx.reply(
        `✅ ĐÃ LƯU KHOẢN THU

Mã: ${record.id.slice(0, 8)}
Số tiền: ${formatMoney(pending.amount)}
Danh mục: ${selectedCategory}
Ghi chú: ${pending.note}`,
        mainKeyboard()
      );

      return;
    }

    if (!waitingForIncome.has(ctx.from.id)) {
      return next();
    }

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

    const suggestedCategory = detectCategory(note, "INCOME");

    waitingForIncome.delete(ctx.from.id);
    waitingForIncomeCategory.set(ctx.from.id, {
      amount,
      note,
      suggestedCategory,
    });

    await ctx.reply(
      `Mình đoán danh mục là: ${suggestedCategory}

Bạn chọn danh mục để lưu khoản thu nhé:`,
      incomeCategoryKeyboard()
    );
  });
}