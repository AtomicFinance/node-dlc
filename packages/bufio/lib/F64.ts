import Decimal from 'decimal.js';

/**
 * IEEE 754 double-precision floating-point number implementation
 *
 * Format: 1 bit sign + 11 bits exponent + 52 bits mantissa
 *
 * This class works directly with the binary representation to avoid
 * precision loss when serializing/deserializing f64 values to/from buffers.
 */
export class F64 {
  private _buffer: Buffer; // 8 bytes storing the IEEE 754 representation

  /**
   * Create an F64 from raw bytes (IEEE 754 format)
   */
  constructor(buffer?: Buffer) {
    if (buffer) {
      if (buffer.length !== 8) {
        throw new Error('F64 buffer must be exactly 8 bytes');
      }
      this._buffer = Buffer.from(buffer);
    } else {
      this._buffer = Buffer.alloc(8);
    }
  }

  /**
   * Create F64 from JavaScript number
   */
  static fromNumber(num: number): F64 {
    const buffer = Buffer.alloc(8);
    buffer.writeDoubleBE(num, 0);
    return new F64(buffer);
  }

  /**
   * Create F64 from Decimal.js value
   * Uses the most precise conversion possible
   */
  static fromDecimal(decimal: Decimal): F64 {
    // Convert to number and let IEEE 754 handle the precision
    const num = decimal.toNumber();
    return F64.fromNumber(num);
  }

  /**
   * Create F64 from string representation
   * Uses Decimal.js to parse the string without precision loss from JavaScript Number
   */
  static fromString(str: string): F64 {
    // Parse string using Decimal.js to avoid JavaScript Number precision loss
    const decimal = new Decimal(str);
    return F64.fromDecimal(decimal);
  }

  /**
   * Create F64 from bigint (treating as integer value)
   */
  static fromBigInt(bigint: bigint): F64 {
    const num = Number(bigint);
    return F64.fromNumber(num);
  }

  /**
   * Create F64 representing zero (static method for API compatibility)
   */
  static zero(): F64 {
    return F64.fromNumber(0);
  }

  /**
   * Create F64 with specific IEEE 754 components
   */
  static fromComponents(
    sign: boolean,
    exponent: number,
    mantissa: bigint,
  ): F64 {
    if (exponent < 0 || exponent > 2047) {
      throw new Error('Exponent must be between 0 and 2047');
    }
    if (mantissa < BigInt(0) || mantissa >= BigInt(1) << BigInt(52)) {
      throw new Error('Mantissa must be between 0 and 2^52-1');
    }

    const buffer = Buffer.alloc(8);

    // Pack into 64-bit big-endian format
    // Bit layout: SEEEEEEE EEEEMMMM MMMMMMMM MMMMMMMM MMMMMMMM MMMMMMMM MMMMMMMM MMMMMMMM
    const signBit = sign ? BigInt(1) : BigInt(0);
    const expBits = BigInt(exponent);
    const mantissaBits = mantissa;

    const ieee754Bits =
      (signBit << BigInt(63)) | (expBits << BigInt(52)) | mantissaBits;

    // Write as big-endian bytes
    for (let i = 0; i < 8; i++) {
      const byteValue = Number(
        (ieee754Bits >> BigInt(56 - i * 8)) & BigInt(0xff),
      );
      buffer.writeUInt8(byteValue, i);
    }

    return new F64(buffer);
  }

  /**
   * Get the raw buffer containing IEEE 754 representation
   */
  getBuffer(): Buffer {
    return Buffer.from(this._buffer);
  }

  /**
   * Serialize to buffer (big-endian)
   */
  serialize(): Buffer {
    return this.getBuffer();
  }

  /**
   * Deserialize from buffer (big-endian)
   */
  static deserialize(buffer: Buffer): F64 {
    return new F64(buffer);
  }

  /**
   * Write to BufferWriter
   */
  writeTo(writer: any): void {
    writer.writeBytes(this._buffer);
  }

  /**
   * Read from BufferReader
   */
  static readFrom(reader: any): F64 {
    const buffer = reader.readBytes(8);
    return new F64(buffer);
  }

  /**
   * Convert to JavaScript number
   * This may lose precision for very large or very precise values
   */
  toNumber(): number {
    return this._buffer.readDoubleBE(0);
  }

  /**
   * Convert to Decimal.js for arbitrary precision
   */
  toDecimal(): Decimal {
    return new Decimal(this.toNumber());
  }

  /**
   * Extract IEEE 754 components
   */
  getComponents(): { sign: boolean; exponent: number; mantissa: bigint } {
    // Read as big-endian 64-bit integer
    let ieee754Bits = BigInt(0);
    for (let i = 0; i < 8; i++) {
      ieee754Bits =
        (ieee754Bits << BigInt(8)) | BigInt(this._buffer.readUInt8(i));
    }

    const sign = (ieee754Bits & (BigInt(1) << BigInt(63))) !== BigInt(0);
    const exponent = Number((ieee754Bits >> BigInt(52)) & BigInt(0x7ff));
    const mantissa = ieee754Bits & ((BigInt(1) << BigInt(52)) - BigInt(1));

    return { sign, exponent, mantissa };
  }

  /**
   * Check if the value is finite
   */
  isFinite(): boolean {
    const { exponent } = this.getComponents();
    return exponent !== 2047; // NaN and Infinity have exponent = 2047
  }

  /**
   * Check if the value is NaN
   */
  isNaN(): boolean {
    const { exponent, mantissa } = this.getComponents();
    return exponent === 2047 && mantissa !== BigInt(0);
  }

  /**
   * Check if the value is infinite
   */
  isInfinite(): boolean {
    const { exponent, mantissa } = this.getComponents();
    return exponent === 2047 && mantissa === BigInt(0);
  }

  /**
   * Check if the value is zero
   */
  isZero(): boolean {
    const { exponent, mantissa } = this.getComponents();
    return exponent === 0 && mantissa === BigInt(0);
  }

  /**
   * Get string representation
   */
  toString(): string {
    return this.toNumber().toString();
  }

  /**
   * Convert to JSON-safe value: number if within safe range, string if too large
   * This preserves precision for very large numbers that exceed JavaScript's MAX_SAFE_INTEGER
   */
  toJSONValue(): number | string {
    const num = this.toNumber();

    // Check if the number is within JavaScript's safe integer range
    if (num <= Number.MAX_SAFE_INTEGER && num >= Number.MIN_SAFE_INTEGER) {
      return num;
    }

    // For very large numbers, return as string to preserve precision
    return num.toString();
  }

  /**
   * Create F64 from JSON value (handles both number and string inputs)
   */
  static fromJSONValue(value: number | string): F64 {
    if (typeof value === 'string') {
      return F64.fromString(value);
    } else {
      return F64.fromNumber(value);
    }
  }

  /**
   * Get hex representation of the raw bytes
   */
  toHex(): string {
    return this._buffer.toString('hex');
  }

  /**
   * Create F64 from hex string
   */
  static fromHex(hex: string): F64 {
    const buffer = Buffer.from(hex, 'hex');
    if (buffer.length !== 8) {
      throw new Error('Hex string must represent exactly 8 bytes');
    }
    return new F64(buffer);
  }

  /**
   * Compare with another F64
   */
  equals(other: F64): boolean {
    return this._buffer.equals(other._buffer);
  }

  /**
   * Equality comparison (alias for equals, for API compatibility)
   */
  eq(other: F64 | number): boolean {
    if (typeof other === 'number') {
      return this.toNumber() === other;
    }
    return this.equals(other);
  }

  /**
   * Greater than comparison
   */
  gt(other: F64 | number): boolean {
    if (typeof other === 'number') {
      return this.toNumber() > other;
    }
    return this.toNumber() > other.toNumber();
  }

  /**
   * Less than comparison
   */
  lt(other: F64 | number): boolean {
    if (typeof other === 'number') {
      return this.toNumber() < other;
    }
    return this.toNumber() < other.toNumber();
  }

  /**
   * Greater than or equal comparison
   */
  gte(other: F64 | number): boolean {
    if (typeof other === 'number') {
      return this.toNumber() >= other;
    }
    return this.toNumber() >= other.toNumber();
  }

  /**
   * Less than or equal comparison
   */
  lte(other: F64 | number): boolean {
    if (typeof other === 'number') {
      return this.toNumber() <= other;
    }
    return this.toNumber() <= other.toNumber();
  }

  /**
   * Create a copy
   */
  clone(): F64 {
    return new F64(this._buffer);
  }

  /**
   * Constants
   */
  static get ZERO(): F64 {
    return F64.fromNumber(0);
  }

  static get ONE(): F64 {
    return F64.fromNumber(1);
  }

  static get NEGATIVE_ONE(): F64 {
    return F64.fromNumber(-1);
  }

  static get INFINITY(): F64 {
    return F64.fromNumber(Number.POSITIVE_INFINITY);
  }

  static get NEGATIVE_INFINITY(): F64 {
    return F64.fromNumber(Number.NEGATIVE_INFINITY);
  }

  static get NaN(): F64 {
    return F64.fromNumber(Number.NaN);
  }
}
