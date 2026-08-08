export function formatCurrency(value: number | string): string {
  const numeric = typeof value === "string" ? Number(value) : value;

  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 2
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

export function formatDateDisplay(value: Date | string | null | undefined): string {
  if (!value) {
    return "None";
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
}

export function formatMonthLabel(monthKey: Date | string): string {
  if (monthKey instanceof Date) {
    return new Intl.DateTimeFormat("en-ZA", {
      month: "long",
      year: "numeric"
    }).format(monthKey);
  }

  const [year, month] = monthKey.split("-").map(Number);

  if (!year || !month) {
    return monthKey;
  }

  return new Intl.DateTimeFormat("en-ZA", {
    month: "long",
    year: "numeric"
  }).format(new Date(year, month - 1, 1));
}
