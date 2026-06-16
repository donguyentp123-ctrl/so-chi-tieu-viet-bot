import { TransactionType } from "@prisma/client";

export function detectCategory(note: string, type: TransactionType) {
  const text = note.toLowerCase();

  if (type === "INCOME") {
    if (text.includes("lương")) return "Lương";
    if (text.includes("thưởng")) return "Thưởng";
    if (text.includes("hoàn tiền")) return "Hoàn tiền";
    return "Khác";
  }

  if (
    text.includes("ăn") ||
    text.includes("cơm") ||
    text.includes("bún") ||
    text.includes("phở") ||
    text.includes("trà sữa") ||
    text.includes("cafe") ||
    text.includes("cà phê")
  ) {
    return "Ăn uống";
  }

  if (
    text.includes("xăng") ||
    text.includes("grab") ||
    text.includes("xe") ||
    text.includes("taxi")
  ) {
    return "Di chuyển";
  }

  if (
    text.includes("cây") ||
    text.includes("anthurium") ||
    text.includes("alocasia") ||
    text.includes("begonia") ||
    text.includes("giá thể") ||
    text.includes("chậu") ||
    text.includes("phân")
  ) {
    return "Cây cảnh";
  }

  if (
    text.includes("thuốc") ||
    text.includes("khám") ||
    text.includes("bệnh viện")
  ) {
    return "Y tế";
  }

  if (
    text.includes("áo") ||
    text.includes("quần") ||
    text.includes("shopee") ||
    text.includes("mua sắm")
  ) {
    return "Mua sắm";
  }

  if (
    text.includes("sách") ||
    text.includes("học") ||
    text.includes("khóa học")
  ) {
    return "Học tập";
  }

  return "Khác";
}