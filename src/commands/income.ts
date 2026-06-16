import { TransactionType } from "@prisma/client";
import { Telegraf } from "telegraf";
import { startAddTransactionFlow } from "../flows/transaction.flow";

export function registerIncomeCommand(bot: Telegraf) {
  bot.hears("💰 Thêm khoản thu", async (ctx) => {
    await startAddTransactionFlow(ctx, TransactionType.INCOME);
  });
}