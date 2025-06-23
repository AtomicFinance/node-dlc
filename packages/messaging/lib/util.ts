export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safely converts various input types to BigInt
 * @param value Value to convert to BigInt
 * @returns BigInt representation of the value, or BigInt(0) for null/undefined
 */
export function toBigInt(value: any): bigint {
  if (value === null || value === undefined) return BigInt(0);
  if (typeof value === 'bigint') return value;
  if (typeof value === 'string') return BigInt(value);
  if (typeof value === 'number') return BigInt(value);
  return BigInt(0);
}

/**
 * Safely converts BigInt to number, preserving precision for safe integers
 * @param value BigInt value to convert
 * @returns Number if within safe range, otherwise returns the BigInt as-is for JSON serialization
 */
export function bigIntToNumber(value: bigint): number | any {
  // For values within safe integer range, convert to number
  if (
    value <= BigInt(Number.MAX_SAFE_INTEGER) &&
    value >= BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    return Number(value);
  }
  // For larger values, preserve as BigInt (json-bigint will handle serialization)
  return value as any;
}
