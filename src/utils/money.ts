export function formatMoney(amount: number) {
  return amount.toLocaleString("vi-VN") + "đ";
}

export function parseAmount(text: string) {
  const cleaned = text
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/,/g, "")
    .replace("k", "000")
    .replace("nghìn", "000")
    .replace("ngàn", "000")
    .replace("tr", "000000")
    .replace("triệu", "000000");

  const amount = Number(cleaned);

  if (!amount || amount <= 0) {
    return null;
  }

  return amount;
}