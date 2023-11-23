import { Value } from '.';

/**
 * Represents bitcoin amount that can be converted to or from multiple
 * formats.
 *
 * The key difference between Amount and Value, is Amount can be negative
 *
 * Value should be used for Bitcoin transactions, Amount should only be used
 * for UI display, i.e. PnL
 */
export class Amount extends Value {
  /**
   * Creates a value object from amount in bitcoin, eg: 1.12345678
   * @param num
   */
  public static fromBitcoin(num: number): Amount {
    return Amount.fromSats(Math.round(num * 1e8));
  }

  /**
   * Creates a value instance from value in satoshis where 1 satoshis
   * equates to 0.00000001 bitcoin.
   * @param num
   */
  public static fromSats(num: bigint | number): Amount {
    return new Amount(BigInt(num) * BigInt(1e12));
  }

  /**
   * Creates a value instance from amount
   * @param value
   * @returns
   */
  public static fromValue(value: Value): Amount {
    return Amount.fromSats(value.sats);
  }

  /**
   * Gets the value in bitcoin
   */
  public get bitcoin(): number {
    return Number(this.sats) / 1e8;
  }

  private constructor(picoSats: bigint) {
    super(picoSats);
  }

  /**
   * Modifies the current instance by subtracting the other value
   * from our existing value. Since Amount is signed, the value can
   * be less than zero.
   * @param other
   */
  public sub(other: Value): this {
    this._picoSats -= other.psats;
    return this;
  }

  /**
   * Subtracts supplied value from the current value and returns a new
   * value instance. Since Amount is signed, the value can
   * be less than zero.
   * @param other
   */
  public subn(other: Value): Amount {
    return new Amount(this._picoSats - other.psats);
  }
}
