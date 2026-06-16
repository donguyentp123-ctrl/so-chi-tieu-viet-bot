import { Markup } from "telegraf";

export function mainKeyboard() {
  return Markup.keyboard([
    ["➕ Thêm khoản chi", "💰 Thêm khoản thu"],
    ["📊 Thống kê", "📋 Danh sách"],
    ["🗑 Xóa giao dịch", "⚙️ Cài đặt"],
    ["❓ Trợ giúp"],
  ]).resize();
}