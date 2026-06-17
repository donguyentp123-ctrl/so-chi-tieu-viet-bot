import { TransactionType } from "@prisma/client";
import { Telegraf, Markup } from "telegraf";
import { createUserTransaction } from "../services/transaction.service";
import { parseTransactionMessage } from "../services/parser.service";
import { upsertTelegramUser } from "../repositories/user.repository";
import { listWallets } from "../services/wallet.service";
import { formatMoney, parseAmount } from "../utils/money";
import { isMainMenuText } from "../utils/menu";
import { cancelKeyboard } from "../keyboards/main.keyboard";
import { checkBudgetAfterExpense } from "../services/budget-summary.service";

type PendingQuickAdd = {
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  createdAt: Date;
  walletId?: string;
  walletName?: string;
  editingField?: "amount" | "note" | "date";
};

const pendingQuickAdd = new Map<number, PendingQuickAdd>();

const expenseCategories = [
  ["eat", "🍜 Ăn uống", "Ăn uống"],
  ["plant", "🌱 Cây cảnh", "Cây cảnh"],
  ["move", "🚕 Di chuyển", "Di chuyển"],
  ["shop", "🛒 Mua sắm", "Mua sắm"],
  ["health", "💊 Y tế", "Y tế"],
  ["study", "📚 Học tập", "Học tập"],
  ["game", "🎮 Giải trí", "Giải trí"],
  ["other", "📦 Khác", "Khác"],
];

const incomeCategories = [
  ["salary", "💼 Lương", "Lương"],
  ["bonus", "🎁 Thưởng", "Thưởng"],
  ["refund", "↩️ Hoàn tiền", "Hoàn tiền"],
  ["side", "💸 Thu nhập phụ", "Thu nhập phụ"],
  ["other", "📦 Khác", "Khác"],
];

function getTypeText(type: TransactionType) {
  return type === TransactionType.EXPENSE ? "➖ Khoản chi" : "➕ Khoản thu";
}

function getCategoryByCode(type: TransactionType, code: string) {
  const source =
    type === TransactionType.EXPENSE ? expenseCategories : incomeCategories;

  const item = source.find(([itemCode]) => itemCode === code);

  return item?.[2] || null;
}

function quickAddConfirmKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("✅ Lưu", "quick_add_confirm"),
      Markup.button.callback("💳 Chọn ví", "quick_add_choose_wallet"),
    ],
    [
      Markup.button.callback("💰 Sửa tiền", "quick_add_edit_amount"),
      Markup.button.callback("🏷 Đổi danh mục", "quick_add_change_category"),
    ],
    [
      Markup.button.callback("📝 Sửa ghi chú", "quick_add_edit_note"),
      Markup.button.callback("🗓 Sửa thời gian", "quick_add_edit_date"),
    ],
    [Markup.button.callback("❌ Hủy", "quick_add_cancel")],
  ]);
}

function quickAddCategoryKeyboard(type: TransactionType) {
  const source =
    type === TransactionType.EXPENSE ? expenseCategories : incomeCategories;

  const buttons = source.map(([code, label]) =>
    Markup.button.callback(label, `quick_cat:${code}`)
  );

  return Markup.inlineKeyboard(buttons, { columns: 2 });
}

function quickAddWalletKeyboard(
  wallets: { id: string; name: string; balance: number }[]
) {
  const buttons = wallets.map((wallet) =>
    Markup.button.callback(
      `${wallet.name} (${formatMoney(wallet.balance)})`,
      `quick_wallet:${wallet.id}`
    )
  );

  return Markup.inlineKeyboard(buttons, { columns: 1 });
}

async function sendQuickAddPreview(ctx: any, data: PendingQuickAdd) {
  await ctx.reply(
    `🤖 Mình hiểu như sau:

Loại: ${getTypeText(data.type)}
Số tiền: ${formatMoney(data.amount)}
Danh mục: ${data.category}
Ví: ${data.walletName || "Chưa chọn"}
Ghi chú: ${data.note}
Thời gian: ${data.createdAt.toLocaleString("vi-VN")}

Bạn muốn lưu giao dịch này không?`,
    quickAddConfirmKeyboard()
  );
}

function parseManualDate(text: string) {
  const lower = text.toLowerCase().trim();
  const date = new Date();

  if (lower === "hôm nay") {
    return new Date();
  }

  if (lower === "hôm qua") {
    date.setDate(date.getDate() - 1);
    return date;
  }

  const dateMatch = lower.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);

  if (dateMatch) {
    const day = Number(dateMatch[1]);
    const month = Number(dateMatch[2]) - 1;
    const year = dateMatch[3] ? Number(dateMatch[3]) : new Date().getFullYear();

    const parsedDate = new Date(year, month, day, 12, 0, 0, 0);

    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }

  return null;
}

export function registerQuickAddCommand(bot: Telegraf) {
  bot.action("quick_add_choose_wallet", async (ctx) => {
    const pending = pendingQuickAdd.get(ctx.from.id);

    if (!pending) {
      await ctx.answerCbQuery("Không có giao dịch chờ sửa.");
      return;
    }

    const wallets = await listWallets(String(ctx.from.id));

    if (wallets.length === 0) {
      await ctx.answerCbQuery();
      await ctx.reply("Bạn chưa có ví nào. Vào 💳 Quản lý ví để thêm ví trước.");
      return;
    }

    await ctx.answerCbQuery();
    await ctx.reply(
      "Bạn chọn ví cho giao dịch này:",
      quickAddWalletKeyboard(wallets)
    );
  });

  bot.action(/^quick_wallet:(.+)/, async (ctx) => {
    const walletId = ctx.match[1];
    const pending = pendingQuickAdd.get(ctx.from.id);

    if (!pending) {
      await ctx.answerCbQuery("Không có giao dịch chờ sửa.");
      return;
    }

    const wallets = await listWallets(String(ctx.from.id));
    const wallet = wallets.find((item) => item.id === walletId);

    if (!wallet) {
      await ctx.answerCbQuery("Không tìm thấy ví.");
      return;
    }

    pending.walletId = wallet.id;
    pending.walletName = wallet.name;
    pendingQuickAdd.set(ctx.from.id, pending);

    await ctx.answerCbQuery("Đã chọn ví.");
    await sendQuickAddPreview(ctx, pending);
  });

  bot.action("quick_add_confirm", async (ctx) => {
    const pending = pendingQuickAdd.get(ctx.from.id);

    if (!pending) {
      await ctx.answerCbQuery("Không có giao dịch chờ lưu.");
      return;
    }

    if (!pending.walletId) {
      await ctx.answerCbQuery();
      await ctx.reply("Bạn cần chọn ví trước khi lưu giao dịch.");
      return;
    }

    const userId = String(ctx.from.id);

    await upsertTelegramUser({
      id: userId,
      firstName: ctx.from.first_name,
      username: ctx.from.username,
    });

    const record = await createUserTransaction({
      userId,
      walletId: pending.walletId,
      type: pending.type,
      amount: pending.amount,
      category: pending.category,
      note: pending.note,
      createdAt: pending.createdAt,
    });

    const budgetWarning =
  pending.type === TransactionType.EXPENSE
    ? await checkBudgetAfterExpense({
        userId,
        category: pending.category,
      })
    : null;

    pendingQuickAdd.delete(ctx.from.id);

    await ctx.answerCbQuery("Đã lưu.");

 await ctx.reply(
  `✅ ĐÃ LƯU NHANH

Mã: ${record.id.slice(0, 8)}
Loại: ${getTypeText(record.type)}
Số tiền: ${formatMoney(record.amount)}
Danh mục: ${record.category}
Ví: ${pending.walletName || "Không có"}
Ghi chú: ${record.note || "Không có"}
Thời gian: ${record.createdAt.toLocaleString("vi-VN")}${budgetWarning || ""}`
);
  });

  bot.action("quick_add_edit_amount", async (ctx) => {
    const pending = pendingQuickAdd.get(ctx.from.id);

    if (!pending) {
      await ctx.answerCbQuery("Không có giao dịch chờ sửa.");
      return;
    }

    pending.editingField = "amount";
    pendingQuickAdd.set(ctx.from.id, pending);

    await ctx.answerCbQuery();
    await ctx.reply(
      "Bạn nhập số tiền mới. Ví dụ: 50000, 850k, 1tr2",
      cancelKeyboard()
    );
  });

  bot.action("quick_add_edit_note", async (ctx) => {
    const pending = pendingQuickAdd.get(ctx.from.id);

    if (!pending) {
      await ctx.answerCbQuery("Không có giao dịch chờ sửa.");
      return;
    }

    pending.editingField = "note";
    pendingQuickAdd.set(ctx.from.id, pending);

    await ctx.answerCbQuery();
    await ctx.reply("Bạn nhập ghi chú mới.", cancelKeyboard());
  });

  bot.action("quick_add_edit_date", async (ctx) => {
    const pending = pendingQuickAdd.get(ctx.from.id);

    if (!pending) {
      await ctx.answerCbQuery("Không có giao dịch chờ sửa.");
      return;
    }

    pending.editingField = "date";
    pendingQuickAdd.set(ctx.from.id, pending);

    await ctx.answerCbQuery();
    await ctx.reply(
      `Bạn nhập thời gian mới.

Ví dụ:
hôm nay
hôm qua
16/06
16/06/2026`,
      cancelKeyboard()
    );
  });

  bot.action("quick_add_change_category", async (ctx) => {
    const pending = pendingQuickAdd.get(ctx.from.id);

    if (!pending) {
      await ctx.answerCbQuery("Không có giao dịch chờ sửa.");
      return;
    }

    await ctx.answerCbQuery();
    await ctx.reply(
      "Bạn chọn lại danh mục:",
      quickAddCategoryKeyboard(pending.type)
    );
  });

  bot.action(/^quick_cat:(.+)/, async (ctx) => {
    const code = ctx.match[1];
    const pending = pendingQuickAdd.get(ctx.from.id);

    if (!pending) {
      await ctx.answerCbQuery("Không có giao dịch chờ sửa.");
      return;
    }

    const category = getCategoryByCode(pending.type, code);

    if (!category) {
      await ctx.answerCbQuery("Danh mục không hợp lệ.");
      return;
    }

    pending.category = category;
    pending.editingField = undefined;
    pendingQuickAdd.set(ctx.from.id, pending);

    await ctx.answerCbQuery("Đã đổi danh mục.");
    await sendQuickAddPreview(ctx, pending);
  });

  bot.action("quick_add_cancel", async (ctx) => {
    pendingQuickAdd.delete(ctx.from.id);

    await ctx.answerCbQuery("Đã hủy.");
    await ctx.reply("Đã hủy lưu nhanh.");
  });

  bot.on("text", async (ctx, next) => {
    const text = ctx.message.text.trim();

    if (isMainMenuText(text)) {
      return next();
    }

    const pending = pendingQuickAdd.get(ctx.from.id);

    if (pending?.editingField === "amount") {
      if (text === "❌ Hủy thao tác") {
        pending.editingField = undefined;
        pendingQuickAdd.set(ctx.from.id, pending);
        await sendQuickAddPreview(ctx, pending);
        return;
      }

      const amount = parseAmount(text);

      if (!amount) {
        await ctx.reply("Số tiền chưa đúng. Ví dụ: 50000, 850k, 1tr2");
        return;
      }

      pending.amount = amount;
      pending.editingField = undefined;
      pendingQuickAdd.set(ctx.from.id, pending);

      await sendQuickAddPreview(ctx, pending);
      return;
    }

    if (pending?.editingField === "note") {
      if (text === "❌ Hủy thao tác") {
        pending.editingField = undefined;
        pendingQuickAdd.set(ctx.from.id, pending);
        await sendQuickAddPreview(ctx, pending);
        return;
      }

      pending.note = text;
      pending.editingField = undefined;
      pendingQuickAdd.set(ctx.from.id, pending);

      await sendQuickAddPreview(ctx, pending);
      return;
    }

    if (pending?.editingField === "date") {
      if (text === "❌ Hủy thao tác") {
        pending.editingField = undefined;
        pendingQuickAdd.set(ctx.from.id, pending);
        await sendQuickAddPreview(ctx, pending);
        return;
      }

      const createdAt = parseManualDate(text);

      if (!createdAt) {
        await ctx.reply(
          `Thời gian chưa đúng.

Ví dụ:
hôm nay
hôm qua
16/06
16/06/2026`
        );
        return;
      }

      pending.createdAt = createdAt;
      pending.editingField = undefined;
      pendingQuickAdd.set(ctx.from.id, pending);

      await sendQuickAddPreview(ctx, pending);
      return;
    }

    const parsed = parseTransactionMessage(text);

    if (!parsed) {
      return next();
    }

    pendingQuickAdd.set(ctx.from.id, parsed);

    await sendQuickAddPreview(ctx, parsed);
  });
}