import BigNumber from 'bignumber.js';

export class BigIntMath {
  static max(...values: bigint[]): bigint {
    if (values.length === 0) {
      return null;
    }

    if (values.length === 1) {
      return values[0];
    }

    let max = values[0];
    for (let i = 1; i < values.length; i++) {
      if (values[i] > max) {
        max = values[i];
      }
    }
    return max;
  }

  static min(...values: bigint[]): bigint {
    if (values.length === 0) {
      return null;
    }

    if (values.length === 1) {
      return values[0];
    }

    let min = values[0];
    for (let i = 1; i < values.length; i++) {
      if (values[i] < min) {
        min = values[i];
      }
    }
    return min;
  }

  static sign(value: bigint): bigint {
    if (value > 0n) {
      return 1n;
    }
    if (value < 0n) {
      return -1n;
    }
    return 0n;
  }

  static abs(value: bigint): bigint {
    if (this.sign(value) === -1n) {
      return -value;
    }
    return value;
  }

  static clamp(min: bigint, val: bigint, max: bigint): bigint {
    return this.max(min, this.min(val, max));
  }
}

export function toBigInt(num: BigNumber): bigint {
  return BigInt(num.integerValue().toString());
}
