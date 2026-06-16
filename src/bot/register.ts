import { Telegraf } from "telegraf";
import { registerStartCommand } from "../commands/start";
import { registerHelpCommand } from "../commands/help";
import { registerExpenseCommand } from "../commands/expense";
import { registerListCommand } from "../commands/list";
import { registerStatisticsCommand } from "../commands/statistics";
import { registerIncomeCommand } from "../commands/income";
import { registerDeleteCommand } from "../commands/delete";
import { registerDetailCommand } from "../commands/detail";
import { registerEditCommand } from "../commands/edit";
import { registerSearchCommand } from "../commands/search";
import { registerFilterCommand } from "../commands/filter";

export function registerBotHandlers(bot: Telegraf) {
    registerStartCommand(bot);
    registerHelpCommand(bot);
    registerExpenseCommand(bot);
    registerIncomeCommand(bot);
    registerListCommand(bot);
    registerStatisticsCommand(bot);
    registerDetailCommand(bot);
    registerEditCommand(bot);
    registerDeleteCommand(bot);
    registerSearchCommand(bot);
    registerFilterCommand(bot);
  bot.hears("➕ Thêm khoản chi", async (ctx) => {
    await ctx.reply("Bạn vừa chọn: ➕ Thêm khoản chi");
  });

  bot.hears("⚙️ Cài đặt", async (ctx) => {
    await ctx.reply("Bạn vừa chọn: ⚙️ Cài đặt");
  });

  bot.on("text", async (ctx) => {
    await ctx.reply("Mình chưa hiểu nội dung này. Bạn bấm ❓ Trợ giúp nhé.");
  });
}