const currencyFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

const creditsFormatter = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Madrid",
});

const monthFormatter = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export const FINANCE_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function formatCurrencyEUR(value: number): string {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatCredits(value: number): string {
  return creditsFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatFinanceDate(
  value: string | null | undefined,
): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date).replace(" de ", " ");
}

export function formatFinanceMonth(month: string): string {
  if (!FINANCE_MONTH_PATTERN.test(month)) return "—";
  const [year, monthNumber] = month.split("-").map(Number);
  const label = monthFormatter.format(
    new Date(Date.UTC(year, monthNumber - 1, 1)),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function getCurrentFinanceMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function shiftFinanceMonth(month: string, offset: number): string {
  if (!FINANCE_MONTH_PATTERN.test(month)) return getCurrentFinanceMonth();
  const [year, monthNumber] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return shifted.toISOString().slice(0, 7);
}
