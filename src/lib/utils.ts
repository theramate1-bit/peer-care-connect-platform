import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Amount in major units (e.g. GBP pounds, not pence). */
export function formatCurrency(amountMajor: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(amountMajor);
}

export function formatCurrencyFromPence(
  pence: number,
  currency = "GBP",
): string {
  return formatCurrency(pence / 100, currency);
}
