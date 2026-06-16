import { Telegraf } from "telegraf";

export function registerHelpCommand(bot: Telegraf) {
  bot.hears("❓ Trợ giúp", async (ctx) => {
    await ctx.reply(
      `📌 HƯỚNG DẪN SỔ CHI TIÊU

Các chức năng hiện có:

➕ Thêm khoản chi
Ví dụ:
50000 ăn sáng
850k mua Anthurium King
1tr2 mua giá thể

💰 Thêm khoản thu
Ví dụ:
12tr lương tháng
200k được hoàn tiền

📊 Thống kê
Xem tổng thu, tổng chi hôm nay và tháng này.

📋 Danh sách
Xem 10 giao dịch gần nhất.

🗑 Xóa giao dịch
Xóa giao dịch theo mã ID.

Lưu ý:
- Có thể nhập 50000, 50k, 1tr, 1tr2
- Bot sẽ tự phân loại danh mục cơ bản.
- AI thông minh sẽ được thêm ở bước sau.`
    );
  });
}