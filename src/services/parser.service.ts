import { TransactionType } from "@prisma/client";
import { detectCategory } from "../utils/category";
import { parseAmount } from "../utils/money";

export type ParsedTransaction = {
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  createdAt: Date;
};

function detectTransactionType(text: string): TransactionType {
  const lower = text.toLowerCase().trim();

  if (
    lower.startsWith("+") ||
    lower.includes("lương") ||
    lower.includes("thưởng") ||
    lower.includes("hoàn tiền") ||
    lower.includes("được hoàn") ||
    lower.includes("thu nhập") ||
    lower.includes("được chuyển") ||
    lower.includes("nhận được")
  ) {
    return TransactionType.INCOME;
  }

  return TransactionType.EXPENSE;
}

function extractAmount(text: string) {
  const amountRegex =
    /(\d[\d.,\s]*\s*(?:k|nghìn|ngàn|tr|triệu)?\s*\d*)/i;

  const match = text.match(amountRegex);

  if (!match) return null;

  const amountText = match[1];
  const amount = parseAmount(amountText);

  if (!amount) return null;

  return {
    amount,
    amountText,
  };
}

function getStartOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function detectCreatedAt(text: string) {
  const lower = text.toLowerCase();

  const date = new Date();

  if (lower.includes("hôm qua") || lower.includes("tối qua")) {
    date.setDate(date.getDate() - 1);
  }

  if (lower.includes("sáng")) {
    date.setHours(8, 0, 0, 0);
    return date;
  }

  if (lower.includes("trưa")) {
    date.setHours(12, 0, 0, 0);
    return date;
  }

  if (lower.includes("chiều")) {
    date.setHours(16, 0, 0, 0);
    return date;
  }

  if (lower.includes("tối")) {
    date.setHours(20, 0, 0, 0);
    return date;
  }

  if (lower.includes("hôm qua")) {
    date.setHours(20, 0, 0, 0);
    return date;
  }

  if (lower.includes("hôm nay")) {
    return new Date();
  }

  return new Date();
}

function cleanNote(text: string, amountText: string) {
  return text
    .replace(amountText, "")
    .replace(/^\+/, "")
    .replace(/^-/, "")
    .replace(/hôm nay/gi, "")
    .replace(/hôm qua/gi, "")
    .replace(/sáng nay/gi, "")
    .replace(/trưa nay/gi, "")
    .replace(/chiều nay/gi, "")
    .replace(/tối nay/gi, "")
    .replace(/sáng qua/gi, "")
    .replace(/trưa qua/gi, "")
    .replace(/chiều qua/gi, "")
    .replace(/tối qua/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseTransactionMessage(text: string): ParsedTransaction | null {
  const amountResult = extractAmount(text);

  if (!amountResult) return null;

  const type = detectTransactionType(text);
  const note = cleanNote(text, amountResult.amountText);

  if (!note) return null;

  const category = detectCategory(note, type);
  const createdAt = detectCreatedAt(text);

  return {
    type,
    amount: amountResult.amount,
    category,
    note,
    createdAt,
  };
}