import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
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

/** Calcula barris de chopp necessarios.
 *  - 4L por pessoa
 *  - Barris de 30L ou 50L
 *  - Pode arredondar para baixo ate 20% da quantidade necessaria
 */
export function calcChopp(people: number) {
  const needed = people * 4;
  const minAcceptable = needed * 0.8;

  let best = { barrels30: 0, barrels50: 0, total: 0, waste: Infinity };

  for (let b50 = 0; b50 <= 5; b50++) {
    for (let b30 = 0; b30 <= 5; b30++) {
      const total = b50 * 50 + b30 * 30;
      if (total >= minAcceptable) {
        const waste = total - needed;
        if (
          Math.abs(waste) < Math.abs(best.waste) ||
          (Math.abs(waste) === Math.abs(best.waste) && b50 + b30 < best.barrels50 + best.barrels30)
        ) {
          best = { barrels30: b30, barrels50: b50, total, waste };
        }
      }
    }
  }

  return best;
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
