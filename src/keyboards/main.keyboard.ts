import { Markup } from "telegraf";

export function mainKeyboard() {
  return Markup.keyboard([
    ["➕ Thêm khoản chi", "💰 Thêm khoản thu"],
    ["📊 Thống kê", "📋 Danh sách"],
    ["🔍 Xem chi tiết", "🗑 Xóa giao dịch"],
    ["⚙️ Cài đặt", "❓ Trợ giúp"],
  ]).resize();
}

export function cancelKeyboard() {
  return Markup.keyboard([["❌ Hủy thao tác"]]).resize();
}