import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(" ");
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function calculateBottleCost(
  checkins: number,
  bottlePrice: number,
  peoplePerBottle: number
): number {
  if (checkins === 0) return 0;
  const bottles = Math.ceil(checkins / peoplePerBottle);
  return (bottles * bottlePrice) / checkins;
}
