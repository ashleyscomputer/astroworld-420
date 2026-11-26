const MAX_STOCK_HALF_UNITS = 10_000_000;

export function parseGramsToHalfUnits(raw: string): number {
  const value = raw.trim().replace(",", ".");
  if (!/^\d+(?:\.5)?$/.test(value)) {
    throw new Error("Enter a whole number of grams or a half-gram value, such as 2 or 2.5.");
  }

  const [whole, fraction] = value.split(".");
  const halfUnits = BigInt(whole) * 2n + (fraction ? 1n : 0n);
  if (halfUnits > BigInt(MAX_STOCK_HALF_UNITS)) {
    throw new Error("That stock quantity is above the allowed limit.");
  }
  return Number(halfUnits);
}

export function formatHalfUnitsAsGrams(halfUnits: number): string {
  if (!Number.isSafeInteger(halfUnits) || halfUnits < 0) {
    throw new Error("Stock must be a non-negative integer number of half-gram units.");
  }
  const whole = Math.floor(halfUnits / 2);
  return halfUnits % 2 === 0 ? String(whole) : String(whole) + ".5";
}

export function isNetworkError(message: string): boolean {
  return /network request failed|failed to fetch|fetch failed|networkerror|timeout|offline|connection lost/i.test(message);
}
