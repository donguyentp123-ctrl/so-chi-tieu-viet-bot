import { Markup } from "telegraf";

export function expenseCategoryKeyboard() {
  return Markup.keyboard([
    ["🍜 Ăn uống", "🌱 Cây cảnh"],
    ["🚕 Di chuyển", "🛒 Mua sắm"],
    ["💊 Y tế", "📚 Học tập"],
    ["🎮 Giải trí", "📦 Khác"],
    ["❌ Hủy thao tác"],
  ]).resize();
}

export function incomeCategoryKeyboard() {
  return Markup.keyboard([
    ["💼 Lương", "🎁 Thưởng"],
    ["↩️ Hoàn tiền", "💸 Thu nhập phụ"],
    ["📦 Khác"],
    ["❌ Hủy thao tác"],
  ]).resize();
}