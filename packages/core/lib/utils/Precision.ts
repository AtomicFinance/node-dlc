import BigNumber from 'bignumber.js';

// Refer to https://github.com/discreetlogcontracts/dlcspecs/blob/master/PayoutCurve.md#version-0-payout_function

/**
 * Extract the precision of a number
 * @param num
 * @returns The precision of the number
 */
export const getPrecision = (num: BigNumber): number =>
  num.decimalPlaces(16).abs().modulo(1).shiftedBy(16).toNumber();

/**
 * Creates a precise number from a precision
 * @param precision
 * @returns The number with the given precision
 */
export const fromPrecision = (precision: number): BigNumber => {
  if (precision.toString().length > 16)
    throw new Error('Precision is too large');
  return new BigNumber(precision).shiftedBy(-16);
};
