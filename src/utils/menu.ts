export const MAIN_MENU_TEXTS = [
  "➕ Thêm khoản chi",
  "💰 Thêm khoản thu",
  "📊 Thống kê",
  "📋 Danh sách",
  "🔎 Tìm kiếm",
  "🧭 Bộ lọc",
  "🔍 Xem chi tiết",
  "✏️ Sửa giao dịch",
  "🗑 Xóa giao dịch",
  "⚙️ Cài đặt",
  "❓ Trợ giúp",
  "/start",
];

export function isMainMenuText(text: string) {
  return MAIN_MENU_TEXTS.includes(text);
}