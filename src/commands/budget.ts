import { Telegraf, Markup } from "telegraf";
import { addBudget, listBudgets, removeBudget } from "../services/budget.service";
import {
  getBudgetSummaries,
  renderProgressBar,
} from "../services/budget-summary.service";
import { cancelKeyboard, mainKeyboard } from "../keyboards/main.keyboard";
import { formatMoney, parseAmount } from "../utils/money";
import { isMainMenuText } from "../utils/menu";

const waitingForBudget = new Set<number>();

function budgetMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("➕ Thêm ngân sách", "budget_add"),
      Markup.button.callback("📋 Danh sách", "budget_list"),
    ],
    [Markup.button.callback("📈 Tiến độ", "budget_progress")],
  ]);
}

async function sendBudgetList(ctx: any) {
  const userId = String(ctx.from.id);
  const budgets = await listBudgets(userId);

  if (budgets.length === 0) {
    await ctx.reply("Bạn chưa có ngân sách nào.");
    return;
  }

  const text = budgets
    .map((budget, index) => {
      return `${index + 1}. ${budget.category}
Ngân sách: ${formatMoney(budget.amount)}
Mã: ${budget.id.slice(0, 8)}`;
    })
    .join("\n\n");

  const buttons = budgets.map((budget, index) =>
    Markup.button.callback(
      `🗑 Xóa ngân sách ${index + 1}`,
      `budget_delete:${budget.id}`
    )
  );

  await ctx.reply(
    `🎯 DANH SÁCH NGÂN SÁCH

${text}`,
    Markup.inlineKeyboard(buttons, { columns: 1 })
  );
}

async function sendBudgetProgress(ctx: any) {
  const userId = String(ctx.from.id);
  const summaries = await getBudgetSummaries(userId);

  if (summaries.length === 0) {
    await ctx.reply("Bạn chưa có ngân sách nào.");
    return;
  }

  const text = summaries
    .map((item, index) => {
      const progressBar = renderProgressBar(item.percent);

      if (item.isOverBudget) {
        return `${index + 1}. ${item.category}

${progressBar} ${item.percent}%

Ngân sách: ${formatMoney(item.amount)}
Đã chi: ${formatMoney(item.spent)}
⚠️ Vượt: ${formatMoney(Math.abs(item.remaining))}`;
      }

      return `${index + 1}. ${item.category}

${progressBar} ${item.percent}%

Ngân sách: ${formatMoney(item.amount)}
Đã chi: ${formatMoney(item.spent)}
Còn lại: ${formatMoney(item.remaining)}`;
    })
    .join("\n\n");

  await ctx.reply(`📈 TIẾN ĐỘ NGÂN SÁCH THÁNG NÀY

${text}`);
}

export function registerBudgetCommand(bot: Telegraf) {
  bot.hears("🎯 Ngân sách", async (ctx) => {
    await ctx.reply("🎯 Bạn muốn thao tác gì với ngân sách?", budgetMenuKeyboard());
  });

  bot.action("budget_list", async (ctx) => {
    await ctx.answerCbQuery();
    await sendBudgetList(ctx);
  });

  bot.action("budget_progress", async (ctx) => {
    await ctx.answerCbQuery();
    await sendBudgetProgress(ctx);
  });

  bot.action("budget_add", async (ctx) => {
    waitingForBudget.add(ctx.from.id);

    await ctx.answerCbQuery();

    await ctx.reply(
      `➕ THÊM NGÂN SÁCH

Bạn nhập theo mẫu:

Ăn uống 3tr
Cây cảnh 5tr
Di chuyển 1tr

Bot sẽ theo dõi chi tiêu theo danh mục trong tháng.`,
      cancelKeyboard()
    );
  });

  bot.action(/^budget_delete:(.+)/, async (ctx) => {
    const id = ctx.match[1];

    const budget = await removeBudget(id);

    await ctx.answerCbQuery();

    await ctx.reply(
      `✅ ĐÃ XÓA NGÂN SÁCH

Danh mục: ${budget.category}
Số tiền: ${formatMoney(budget.amount)}`,
      mainKeyboard()
    );
  });

  bot.on("text", async (ctx, next) => {
    const text = ctx.message.text.trim();

    if (!waitingForBudget.has(ctx.from.id)) {
      return next();
    }

    if (isMainMenuText(text)) {
      waitingForBudget.delete(ctx.from.id);
      return next();
    }

    if (text === "❌ Hủy thao tác") {
      waitingForBudget.delete(ctx.from.id);
      await ctx.reply("Đã hủy thêm ngân sách.", mainKeyboard());
      return;
    }

    const parts = text.split(" ");
    const amountText = parts[parts.length - 1];
    const amount = parseAmount(amountText);
    const category = parts.slice(0, -1).join(" ").trim();

    if (!amount || !category) {
      await ctx.reply(
        `Bạn nhập chưa đúng.

Ví dụ:
Ăn uống 3tr
Cây cảnh 5tr`
      );
      return;
    }

    const budget = await addBudget({
      userId: String(ctx.from.id),
      category,
      amount,
    });

    waitingForBudget.delete(ctx.from.id);

    await ctx.reply(
      `✅ ĐÃ THÊM NGÂN SÁCH

Danh mục: ${budget.category}
Số tiền: ${formatMoney(budget.amount)}`,
      mainKeyboard()
    );
  });
}