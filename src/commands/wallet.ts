import { Telegraf, Markup } from "telegraf";
import { cancelKeyboard, mainKeyboard } from "../keyboards/main.keyboard";
import { addWallet, listWallets, removeWallet } from "../services/wallet.service";
import { formatMoney, parseAmount } from "../utils/money";
import { isMainMenuText } from "../utils/menu";

const waitingForWalletName = new Set<number>();

function walletMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("➕ Thêm ví", "wallet_add"),
      Markup.button.callback("📋 Danh sách ví", "wallet_list"),
    ],
  ]);
}

async function sendWalletList(ctx: any) {
  const userId = String(ctx.from.id);
  const wallets = await listWallets(userId);

  if (wallets.length === 0) {
    await ctx.reply("Bạn chưa có ví nào.");
    return;
  }

  const text = wallets
    .map((wallet, index) => {
      return `${index + 1}. ${wallet.name}
Số dư: ${formatMoney(wallet.balance)}
Mã: ${wallet.id.slice(0, 8)}`;
    })
    .join("\n\n");

  const buttons = wallets.map((wallet, index) =>
    Markup.button.callback(`🗑 Xóa ví ${index + 1}`, `wallet_delete:${wallet.id}`)
  );

  await ctx.reply(
    `💳 DANH SÁCH VÍ

${text}`,
    Markup.inlineKeyboard(buttons, { columns: 1 })
  );
}

export function registerWalletCommand(bot: Telegraf) {
  bot.hears("💳 Quản lý ví", async (ctx) => {
    await ctx.reply("💳 Bạn muốn thao tác gì với ví?", walletMenuKeyboard());
  });

  bot.action("wallet_list", async (ctx) => {
    await ctx.answerCbQuery();
    await sendWalletList(ctx);
  });

  bot.action("wallet_add", async (ctx) => {
    waitingForWalletName.add(ctx.from.id);

    await ctx.answerCbQuery();

    await ctx.reply(
      `➕ THÊM VÍ

Bạn nhập theo mẫu:

Tiền mặt
MB Bank 500000
MoMo 1tr

Nếu không nhập số dư, bot sẽ mặc định là 0đ.`,
      cancelKeyboard()
    );
  });

  bot.action(/^wallet_delete:(.+)/, async (ctx) => {
    const id = ctx.match[1];
    const userId = String(ctx.from.id);

    const wallet = await removeWallet(userId, id);

    await ctx.answerCbQuery();

    if (!wallet) {
      await ctx.reply("Không tìm thấy ví này.");
      return;
    }

    await ctx.reply(
      `✅ ĐÃ XÓA VÍ

Tên ví: ${wallet.name}
Số dư: ${formatMoney(wallet.balance)}`,
      mainKeyboard()
    );
  });

  bot.on("text", async (ctx, next) => {
    const text = ctx.message.text.trim();

    if (!waitingForWalletName.has(ctx.from.id)) {
      return next();
    }

    if (isMainMenuText(text)) {
      waitingForWalletName.delete(ctx.from.id);
      return next();
    }

    if (text === "❌ Hủy thao tác") {
      waitingForWalletName.delete(ctx.from.id);
      await ctx.reply("Đã hủy thêm ví.", mainKeyboard());
      return;
    }

    const parts = text.split(" ");
    const lastPart = parts[parts.length - 1];
    const possibleBalance = parseAmount(lastPart);

    let name = text;
    let balance = 0;

    if (possibleBalance) {
      balance = possibleBalance;
      name = parts.slice(0, -1).join(" ").trim();
    }

    if (!name) {
      await ctx.reply("Tên ví không được để trống.");
      return;
    }

    const wallet = await addWallet({
      userId: String(ctx.from.id),
      name,
      balance,
    });

    waitingForWalletName.delete(ctx.from.id);

    await ctx.reply(
      `✅ ĐÃ THÊM VÍ

Tên ví: ${wallet.name}
Số dư: ${formatMoney(wallet.balance)}`,
      mainKeyboard()
    );
  });
}