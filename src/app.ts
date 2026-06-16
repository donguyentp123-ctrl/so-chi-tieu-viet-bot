import "dotenv/config";
import { Telegraf, Markup } from "telegraf";

const token = process.env.BOT_TOKEN;

if (!token) {
  console.error("Thiếu BOT_TOKEN trong file .env");
  process.exit(1);
}

const bot = new Telegraf(token);

function menuChinh() {
  return Markup.keyboard([
    ["➕ Thêm khoản chi", "💰 Thêm khoản thu"],
    ["📊 Thống kê", "📋 Danh sách"],
    ["⚙️ Cài đặt", "❓ Trợ giúp"],
  ]).resize();
}

bot.start((ctx) => {
  ctx.reply(
    `📒 SỔ CHI TIÊU VIỆT

Xin chào ${ctx.from.first_name || "bạn"} 👋

Mình sẽ giúp bạn quản lý thu chi hằng ngày.

Bạn chọn chức năng bên dưới nhé.`,
    menuChinh()
  );
});

bot.hears("➕ Thêm khoản chi", (ctx) => {
  ctx.reply("Bạn vừa chọn: ➕ Thêm khoản chi");
});

bot.hears("💰 Thêm khoản thu", (ctx) => {
  ctx.reply("Bạn vừa chọn: 💰 Thêm khoản thu");
});

bot.hears("📊 Thống kê", (ctx) => {
  ctx.reply("Bạn vừa chọn: 📊 Thống kê");
});

bot.hears("📋 Danh sách", (ctx) => {
  ctx.reply("Bạn vừa chọn: 📋 Danh sách");
});

bot.hears("⚙️ Cài đặt", (ctx) => {
  ctx.reply("Bạn vừa chọn: ⚙️ Cài đặt");
});

bot.hears("❓ Trợ giúp", (ctx) => {
  ctx.reply(
    `📌 HƯỚNG DẪN

Các chức năng sẽ làm tiếp:
➕ Ghi khoản chi
💰 Ghi khoản thu
📊 Thống kê ngày/tháng
🤖 AI tự hiểu tin nhắn
☁️ Deploy chạy 24/7`
  );
});

bot.on("text", (ctx) => {
  ctx.reply("Mình chưa hiểu nội dung này. Bạn bấm ❓ Trợ giúp nhé.");
});

bot.launch();

console.log("Bot Sổ Chi Tiêu Việt đang chạy...");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));