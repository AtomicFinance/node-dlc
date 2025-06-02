import { bigToBufBE } from '@node-dlc/bufio';

/**
 * Returns a tuple containing the quotient and remainder when the divident (num) is
 * divided by the divisor (mod).
 * @param num divident
 * @param mod divisor
 */
export function divmod(num: bigint, mod: bigint): [bigint, bigint] {
  return [num / mod, num % mod];
}

/**
 * Base58 encoding and decoding utility
 */
export class Base58 {
  public static alphabet =
    '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

  /**
   * Encodes a buffer into a base58 string
   */
  public static encode(buf: Buffer): string {
    let n = BigInt('0x' + buf.toString('hex'));

    // encode into base58
    let str = '';
    while (n > BigInt(0)) {
      const mod = n % BigInt(58);
      str = Base58.alphabet[Number(mod)] + str;
      n = n / BigInt(58);
    }

    // add leading zeros
    for (const val of buf) {
      if (val !== 0) break;
      str = '1' + str;
    }

    return str;
  }

  /**
   * Decodes the base58 string into a buffer
   */
  public static decode(str: string): Buffer {
    // determine leading zero bytes which will be prepended
    let prefix = 0;
    for (let i = 0; i < str.length; i++) {
      if (str[i] === '1') prefix += 1;
      else break;
    }

    // decode from base58
    let n = BigInt(0);
    for (const char of str) {
      n *= BigInt(58);
      n += BigInt(Base58.alphabet.indexOf(char));
    }

    return Buffer.concat([Buffer.alloc(prefix), bigToBufBE(n)]);
  }
}
