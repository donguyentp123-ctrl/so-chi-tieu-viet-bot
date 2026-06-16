export function formatMoney(amount: number) {
  return amount.toLocaleString("vi-VN") + "đ";
}

export function parseAmount(text: string) {
  const raw = text.toLowerCase().trim();

  const compact = raw
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(/,/g, "");

  const millionMatch = compact.match(/^(\d+)(tr|triệu)(\d+)?$/);

  if (millionMatch) {
    const millionPart = Number(millionMatch[1]);
    const decimalPart = millionMatch[3]
      ? Number(millionMatch[3]) * 100000
      : 0;

    return millionPart * 1000000 + decimalPart;
  }

  const thousandMatch = compact.match(/^(\d+)(k|nghìn|ngàn)$/);

  if (thousandMatch) {
    return Number(thousandMatch[1]) * 1000;
  }

  const amount = Number(compact);

  if (!amount || amount <= 0) {
    return null;
  }

  return amount;
}

export function parseAmountAndNote(text: string) {
  const raw = text.trim();

  const match = raw.match(
    /^(\d[\d.,\s]*\s*(?:k|nghìn|ngàn|tr|triệu)?\s*\d*)\s+(.+)$/i
  );

  if (!match) {
    return null;
  }

  const amount = parseAmount(match[1]);
  const note = match[2].trim();

  if (!amount || !note) {
    return null;
  }

  return {
    amount,
    note,
  };
}