export function formatCurrency(value: number | string): string {
  const numeric = typeof value === "string" ? Number(value) : value;

  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 2
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);

  if (!year || !month) {
    return monthKey;
  }

  return new Intl.DateTimeFormat("en-ZA", {
    month: "long",
    year: "numeric"
  }).format(new Date(year, month - 1, 1));
}
