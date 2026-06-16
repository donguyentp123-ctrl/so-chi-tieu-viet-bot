import { Telegraf } from "telegraf";
import { prisma } from "../database/prisma";
import { mainKeyboard } from "../keyboards/main.keyboard";

export function registerStartCommand(bot: Telegraf) {
  bot.start(async (ctx) => {
    const userId = String(ctx.from.id);

    await prisma.user.upsert({
      where: {
        id: userId,
      },
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

    await ctx.reply(
      `📒 SỔ CHI TIÊU VIỆT

Xin chào ${ctx.from.first_name || "bạn"} 👋

Mình đã ghi nhận tài khoản của bạn.

Bạn chọn chức năng bên dưới nhé.`,
      mainKeyboard()
    );
  });
}