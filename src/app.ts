import "dotenv/config";
import { Telegraf } from "telegraf";
import { prisma } from "./database/prisma";
import { registerBotHandlers } from "./bot/register";

const token = process.env.BOT_TOKEN;

if (!token) {
  console.error("Thiếu BOT_TOKEN trong file .env");
  process.exit(1);
}

const bot = new Telegraf(token);

registerBotHandlers(bot);

bot.launch();

console.log("Bot Sổ Chi Tiêu Việt đang chạy...");

process.once("SIGINT", async () => {
  await prisma.$disconnect();
  bot.stop("SIGINT");
});

process.once("SIGTERM", async () => {
  await prisma.$disconnect();
  bot.stop("SIGTERM");
});