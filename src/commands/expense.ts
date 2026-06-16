import { TransactionType } from "@prisma/client";
import { Telegraf } from "telegraf";
import { startAddTransactionFlow } from "../flows/transaction.flow";

export function registerExpenseCommand(bot: Telegraf) {
  bot.hears("➕ Thêm khoản chi", async (ctx) => {
    await startAddTransactionFlow(ctx, TransactionType.EXPENSE);
  });
}