import { Telegraf } from "telegraf";

import { registerTransactionFlowHandlers } from "../flows/transaction.flow";

import { registerStartCommand } from "../commands/start";
import { registerHelpCommand } from "../commands/help";
import { registerExpenseCommand } from "../commands/expense";
import { registerIncomeCommand } from "../commands/income";
import { registerListCommand } from "../commands/list";
import { registerStatisticsCommand } from "../commands/statistics";
import { registerDetailCommand } from "../commands/detail";
import { registerEditCommand } from "../commands/edit";
import { registerDeleteCommand } from "../commands/delete";
import { registerSearchCommand } from "../commands/search";
import { registerFilterCommand } from "../commands/filter";
import { registerQuickAddCommand } from "../commands/quick-add";
import { registerSettingsCommand } from "../commands/settings";
import { registerWalletCommand } from "../commands/wallet";

export function registerBotHandlers(bot: Telegraf) {
  registerStartCommand(bot);
  registerHelpCommand(bot);

  registerExpenseCommand(bot);
  registerIncomeCommand(bot);
  registerTransactionFlowHandlers(bot);

  registerListCommand(bot);
  registerStatisticsCommand(bot);
  registerDetailCommand(bot);
  registerEditCommand(bot);
  registerDeleteCommand(bot);
  registerSearchCommand(bot);
  registerFilterCommand(bot);

  registerWalletCommand(bot);
  registerQuickAddCommand(bot);
  registerSettingsCommand(bot);

  bot.on("text", async (ctx) => {
    await ctx.reply("Mình chưa hiểu nội dung này. Bạn bấm ❓ Trợ giúp nhé.");
  });
}