/**
 * Returns the number of bytes for a VarInt
 * @param val
 */
export function varIntBytes(val: number | BigInt): number {
  const numVal = Number(val);
  if (numVal < 0) throw new Error('Invalid varint');
  if (numVal < 0xfd) return 1;
  if (numVal <= 0xffff) return 3;
  if (numVal <= 0xffffffff) return 5;
  if (numVal <= 0xffffffffffffffff) return 9;
  throw new Error('Invalid varint');
}
