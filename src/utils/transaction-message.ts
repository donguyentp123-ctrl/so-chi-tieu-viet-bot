import { Transaction } from "@prisma/client";
import { formatMoney } from "./money";

export function formatTransactionListItem(params: {
  record: Transaction;
  number: number;
}) {
  const { record, number } = params;

  const typeIcon = record.type === "EXPENSE" ? "➖" : "➕";
  const note = record.note || "Không có";
  const shortNote = note.length > 22 ? note.slice(0, 22) + "..." : note;

  return `${number}. ${typeIcon} ${formatMoney(record.amount)} | ${record.category} | ${shortNote}`;
}

export function formatTransactionSummary(record: Transaction) {
  const typeText = record.type === "EXPENSE" ? "➖ Chi" : "➕ Thu";

  return `${typeText} | ${formatMoney(record.amount)}

Mã: ${record.id.slice(0, 8)}
Danh mục: ${record.category}
Ghi chú: ${record.note || "Không có"}
Thời gian: ${record.createdAt.toLocaleString("vi-VN")}`;
}

export function formatTransactionDetail(record: Transaction) {
  const typeText = record.type === "EXPENSE" ? "Khoản chi" : "Khoản thu";
  const typeIcon = record.type === "EXPENSE" ? "➖" : "➕";

  return `🔍 CHI TIẾT GIAO DỊCH

Mã: ${record.id.slice(0, 8)}
Loại: ${typeIcon} ${typeText}
Số tiền: ${formatMoney(record.amount)}
Danh mục: ${record.category}
Ghi chú: ${record.note || "Không có"}
Thời gian: ${record.createdAt.toLocaleString("vi-VN")}`;
}