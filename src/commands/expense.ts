import { Telegraf } from "telegraf";
import { prisma } from "../database/prisma";
import { formatMoney, parseAmount } from "../utils/money";
import { detectCategory } from "../utils/category";
import { expenseCategoryKeyboard } from "../keyboards/category.keyboard";
import { cancelKeyboard, mainKeyboard } from "../keyboards/main.keyboard";
type PendingExpense = {
  amount: number;
  note: string;
  suggestedCategory: string;
};

const waitingForExpense = new Set<number>();
const waitingForExpenseCategory = new Map<number, PendingExpense>();

const categoryMap: Record<string, string> = {
  "🍜 Ăn uống": "Ăn uống",
  "🌱 Cây cảnh": "Cây cảnh",
  "🚕 Di chuyển": "Di chuyển",
  "🛒 Mua sắm": "Mua sắm",
  "💊 Y tế": "Y tế",
  "📚 Học tập": "Học tập",
  "🎮 Giải trí": "Giải trí",
  "📦 Khác": "Khác",
};

export function registerExpenseCommand(bot: Telegraf) {
  bot.hears("➕ Thêm khoản chi", async (ctx) => {
    waitingForExpense.add(ctx.from.id);

    await ctx.reply(
      `➕ THÊM KHOẢN CHI

Bạn nhập theo mẫu:

50000 ăn sáng
850k mua cây Anthurium
1tr2 mua đồ`,
      cancelKeyboard()
    );
  });

  bot.on("text", async (ctx, next) => {
    const text = ctx.message.text.trim();
        if (text === "❌ Hủy thao tác") {
      waitingForExpense.delete(ctx.from.id);
      waitingForExpenseCategory.delete(ctx.from.id);

      await ctx.reply("Đã hủy thao tác.", mainKeyboard());
      return;
    }

    if (waitingForExpenseCategory.has(ctx.from.id)) {
      const selectedCategory = categoryMap[text];
      if (text === "📋 Danh sách" || text === "📊 Thống kê" || text === "➕ Thêm khoản chi" || text === "💰 Thêm khoản thu" || text === "🔍 Xem chi tiết" || text === "🗑 Xóa giao dịch" || text === "⚙️ Cài đặt" || text === "❓ Trợ giúp" || text === "/start") {
  waitingForExpense.delete(ctx.from.id);
  waitingForExpenseCategory.delete(ctx.from.id);
  return next();
}  
      if (!selectedCategory) {
        await ctx.reply("Bạn vui lòng chọn danh mục bằng nút bên dưới.");
        return;
      }

      const pending = waitingForExpenseCategory.get(ctx.from.id)!;
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
          type: "EXPENSE",
          amount: pending.amount,
          category: selectedCategory,
          note: pending.note,
        },
      });

      waitingForExpenseCategory.delete(ctx.from.id);

      await ctx.reply(
        `✅ ĐÃ LƯU KHOẢN CHI

Mã: ${record.id.slice(0, 8)}
Số tiền: ${formatMoney(pending.amount)}
Danh mục: ${selectedCategory}
Ghi chú: ${pending.note}`,
        mainKeyboard()
      );

      return;
    }

    if (!waitingForExpense.has(ctx.from.id)) {
      return next();
    }

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

    const suggestedCategory = detectCategory(note, "EXPENSE");

    waitingForExpense.delete(ctx.from.id);
    waitingForExpenseCategory.set(ctx.from.id, {
      amount,
      note,
      suggestedCategory,
    });

    await ctx.reply(
      `Mình đoán danh mục là: ${suggestedCategory}

Bạn chọn danh mục để lưu khoản chi nhé:`,
      expenseCategoryKeyboard()
    );
  });
}