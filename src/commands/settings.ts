import { Telegraf, Markup } from "telegraf";
import { prisma } from "../database/prisma";
import { mainKeyboard } from "../keyboards/main.keyboard";
import { clearConversation } from "../states";

function settingsKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("👤 Hồ sơ", "settings_profile"),
      Markup.button.callback("ℹ️ Phiên bản", "settings_version"),
    ],
    [
      Markup.button.callback("🧪 Kiểm tra database", "settings_db_check"),
      Markup.button.callback("🧹 Xóa trạng thái", "settings_clear_state"),
    ],
  ]);
}

export function registerSettingsCommand(bot: Telegraf) {
  bot.hears("⚙️ Cài đặt", async (ctx) => {
    await ctx.reply(
      `⚙️ CÀI ĐẶT

Bạn muốn xem hoặc kiểm tra thông tin nào?`,
      settingsKeyboard()
    );
  });

  bot.action("settings_profile", async (ctx) => {
    const userId = String(ctx.from.id);

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    await ctx.answerCbQuery();

    await ctx.reply(
      `👤 HỒ SƠ TELEGRAM

ID: ${ctx.from.id}
Tên: ${ctx.from.first_name || "Không có"}
Username: ${ctx.from.username ? "@" + ctx.from.username : "Không có"}
Đã lưu DB: ${user ? "Có" : "Chưa"}`
    );
  });

  bot.action("settings_version", async (ctx) => {
    await ctx.answerCbQuery();

    await ctx.reply(
      `ℹ️ PHIÊN BẢN BOT

Tên: Sổ Chi Tiêu Việt
Phiên bản: 0.2.0
Nền tảng: Telegram Bot
Công nghệ: Node.js + TypeScript + Telegraf + Prisma + PostgreSQL

Chức năng chính:
✅ Thu/chi
✅ Tìm kiếm
✅ Bộ lọc
✅ Thống kê
✅ Quick Add thông minh
✅ Conversation State`
    );
  });

  bot.action("settings_db_check", async (ctx) => {
    await ctx.answerCbQuery();

    try {
      await prisma.$queryRaw`SELECT 1`;

      await ctx.reply(
        `🧪 KIỂM TRA DATABASE

Trạng thái: ✅ Kết nối thành công
Database: PostgreSQL
ORM: Prisma`
      );
    } catch (error) {
      console.error(error);

      await ctx.reply(
        `🧪 KIỂM TRA DATABASE

Trạng thái: ❌ Kết nối thất bại

Bạn kiểm tra lại DATABASE_URL trong file .env.`
      );
    }
  });

  bot.action("settings_clear_state", async (ctx) => {
    clearConversation(ctx.from.id);

    await ctx.answerCbQuery("Đã xóa trạng thái.");

    await ctx.reply(
      `🧹 ĐÃ XÓA TRẠNG THÁI THAO TÁC

Nếu bot bị kẹt ở một thao tác nào đó, bạn có thể dùng nút này để quay lại trạng thái bình thường.`,
      mainKeyboard()
    );
  });
}