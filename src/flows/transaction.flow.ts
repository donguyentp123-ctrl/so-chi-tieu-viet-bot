import { TransactionType } from "@prisma/client";
import { Telegraf, Markup } from "telegraf";
import {
  expenseCategoryKeyboard,
  incomeCategoryKeyboard,
} from "../keyboards/category.keyboard";
import { cancelKeyboard, mainKeyboard } from "../keyboards/main.keyboard";
import { upsertTelegramUser } from "../repositories/user.repository";
import { createUserTransaction } from "../services/transaction.service";
import { listWallets } from "../services/wallet.service";
import {
  clearConversation,
  getConversation,
  setConversation,
} from "../states";
import { detectCategory } from "../utils/category";
import { isMainMenuText } from "../utils/menu";
import { formatMoney, parseAmountAndNote } from "../utils/money";

const expenseCategoryMap: Record<string, string> = {
  "🍜 Ăn uống": "Ăn uống",
  "🌱 Cây cảnh": "Cây cảnh",
  "🚕 Di chuyển": "Di chuyển",
  "🛒 Mua sắm": "Mua sắm",
  "💊 Y tế": "Y tế",
  "📚 Học tập": "Học tập",
  "🎮 Giải trí": "Giải trí",
  "📦 Khác": "Khác",
};

const incomeCategoryMap: Record<string, string> = {
  "💼 Lương": "Lương",
  "🎁 Thưởng": "Thưởng",
  "↩️ Hoàn tiền": "Hoàn tiền",
  "💸 Thu nhập phụ": "Thu nhập phụ",
  "📦 Khác": "Khác",
};

function getTypeFromAction(action: string) {
  if (action === "ADD_EXPENSE") return TransactionType.EXPENSE;
  if (action === "ADD_INCOME") return TransactionType.INCOME;
  return null;
}

function getCategoryMap(type: TransactionType) {
  return type === TransactionType.EXPENSE
    ? expenseCategoryMap
    : incomeCategoryMap;
}

function getCategoryKeyboard(type: TransactionType) {
  return type === TransactionType.EXPENSE
    ? expenseCategoryKeyboard()
    : incomeCategoryKeyboard();
}

function getTransactionLabel(type: TransactionType) {
  return type === TransactionType.EXPENSE ? "KHOẢN CHI" : "KHOẢN THU";
}

function walletKeyboard(wallets: { id: string; name: string; balance: number }[]) {
  const buttons = wallets.map((wallet) =>
    Markup.button.callback(
      `${wallet.name} (${formatMoney(wallet.balance)})`,
      `select_wallet:${wallet.id}`
    )
  );

  return Markup.inlineKeyboard(buttons, { columns: 1 });
}

export async function startAddTransactionFlow(
  ctx: any,
  type: TransactionType
) {
  setConversation(ctx.from.id, {
    action: type === TransactionType.EXPENSE ? "ADD_EXPENSE" : "ADD_INCOME",
    step: "INPUT_AMOUNT_NOTE",
  });

  await ctx.reply(
    `${type === TransactionType.EXPENSE ? "➕" : "💰"} THÊM ${getTransactionLabel(
      type
    )}

Bạn nhập theo mẫu:

50000 ăn sáng
850k mua cây Anthurium
1tr2 lương tháng
1 tr tiền test`,
    cancelKeyboard()
  );
}

export function registerTransactionFlowHandlers(bot: Telegraf) {
  bot.action(/^select_wallet:(.+)/, async (ctx) => {
    const walletId = ctx.match[1];
    const telegramUserId = ctx.from.id;
    const userId = String(telegramUserId);

    const state = getConversation(telegramUserId);

    if (
      !state ||
      (state.action !== "ADD_EXPENSE" && state.action !== "ADD_INCOME") ||
      state.step !== "SELECT_WALLET"
    ) {
      await ctx.answerCbQuery("Không có giao dịch đang chờ chọn ví.");
      return;
    }

    const type = getTypeFromAction(state.action);

    if (!type) {
      clearConversation(telegramUserId);
      await ctx.answerCbQuery("Dữ liệu không hợp lệ.");
      return;
    }

    const amount = Number(state.data?.amount);
    const note = String(state.data?.note || "");
    const category = String(state.data?.category || "");

    if (!amount || !note || !category) {
      clearConversation(telegramUserId);
      await ctx.answerCbQuery("Dữ liệu bị thiếu.");
      await ctx.reply("Bạn vui lòng thực hiện lại.", mainKeyboard());
      return;
    }

    await upsertTelegramUser({
      id: userId,
      firstName: ctx.from.first_name,
      username: ctx.from.username,
    });

    const record = await createUserTransaction({
      userId,
      walletId,
      type,
      amount,
      category,
      note,
    });

    clearConversation(telegramUserId);

    await ctx.answerCbQuery("Đã lưu.");

    await ctx.reply(
      `✅ ĐÃ LƯU ${getTransactionLabel(type)}

Mã: ${record.id.slice(0, 8)}
Số tiền: ${formatMoney(amount)}
Danh mục: ${category}
Ghi chú: ${note}`,
      mainKeyboard()
    );
  });

  bot.on("text", async (ctx, next) => {
    const text = ctx.message.text.trim();
    const telegramUserId = ctx.from.id;
    const userId = String(telegramUserId);

    const state = getConversation(telegramUserId);

    if (
      !state ||
      (state.action !== "ADD_EXPENSE" && state.action !== "ADD_INCOME")
    ) {
      return next();
    }

    if (isMainMenuText(text)) {
      clearConversation(telegramUserId);
      return next();
    }

    if (text === "❌ Hủy thao tác") {
      clearConversation(telegramUserId);
      await ctx.reply("Đã hủy thao tác.", mainKeyboard());
      return;
    }

    const type = getTypeFromAction(state.action);

    if (!type) {
      clearConversation(telegramUserId);
      return next();
    }

    if (state.step === "INPUT_AMOUNT_NOTE") {
      const parsed = parseAmountAndNote(text);

      if (!parsed) {
        await ctx.reply(
          `Bạn nhập chưa đúng.

Ví dụ:
50000 ăn sáng
850k mua cây Anthurium
1 tr tiền test`
        );
        return;
      }

      const suggestedCategory = detectCategory(parsed.note, type);

      setConversation(telegramUserId, {
        action: state.action,
        step: "SELECT_CATEGORY",
        data: {
          amount: parsed.amount,
          note: parsed.note,
          suggestedCategory,
        },
      });

      await ctx.reply(
        `Mình đoán danh mục là: ${suggestedCategory}

Bạn chọn danh mục để lưu nhé:`,
        getCategoryKeyboard(type)
      );

      return;
    }

    if (state.step === "SELECT_CATEGORY") {
      const categoryMap = getCategoryMap(type);
      const selectedCategory = categoryMap[text];

      if (!selectedCategory) {
        await ctx.reply("Bạn vui lòng chọn danh mục bằng nút bên dưới.");
        return;
      }

      const amount = Number(state.data?.amount);
      const note = String(state.data?.note || "");

      if (!amount || !note) {
        clearConversation(telegramUserId);
        await ctx.reply(
          "Dữ liệu thao tác bị thiếu. Bạn vui lòng thực hiện lại.",
          mainKeyboard()
        );
        return;
      }

      const wallets = await listWallets(userId);

      setConversation(telegramUserId, {
        action: state.action,
        step: "SELECT_WALLET",
        data: {
          amount,
          note,
          category: selectedCategory,
        },
      });

      if (wallets.length === 0) {
        await ctx.reply(
          `Bạn chưa có ví nào.

Vui lòng vào 💳 Quản lý ví để thêm ví trước khi lưu giao dịch.`,
          mainKeyboard()
        );
        return;
      }

      await ctx.reply("Bạn chọn ví cho giao dịch này:", walletKeyboard(wallets));
      return;
    }

    return next();
  });
}