import BigNumber from 'bignumber.js';

import { BigIntMath, toBigInt } from '../utils/BigIntUtils';
import { HyperbolaPayoutCurve } from './HyperbolaPayoutCurve';

export function zipWithIndex<T>(arr: T[]): [T, number][] {
  return arr.map((a, i) => [a, i]);
}

export function dropUntil<T>(data: T[], check: (_: T) => boolean): T[] {
  for (let i = 0; i < data.length; i++) {
    if (check(data[i])) {
      return data.slice(i);
    }
  }
  return [];
}

export function decompose(
  num: bigint,
  base: number,
  numDigits: number,
): number[] {
  let currentNumber = num;
  const digits = [];
  while (numDigits > 0) {
    digits.push(Number(currentNumber % BigInt(base)));
    currentNumber = currentNumber / BigInt(base);
    numDigits--;
  }
  return digits.reverse();
}

export function separatePrefix(
  start: bigint,
  end: bigint,
  base: number,
  numDigits: number,
): {
  prefixDigits: number[];
  startDigits: number[];
  endDigits: number[];
} {
  const startDigits = decompose(start, base, numDigits);
  const endDigits = decompose(end, base, numDigits);

  const prefixDigits: number[] = [];
  for (let i = 0; i < startDigits.length; i++) {
    if (startDigits[i] === endDigits[i]) {
      prefixDigits.push(startDigits[i]);
    } else break;
  }

  return {
    prefixDigits,
    startDigits: startDigits.splice(prefixDigits.length),
    endDigits: endDigits.splice(prefixDigits.length),
  };
}

export function frontGroupings(digits: number[], base: number): number[][] {
  const digitsReversed = Array.from(digits).reverse();
  const nonZeroDigits = dropUntil(
    zipWithIndex(digitsReversed),
    (a) => a[0] !== 0,
  );

  if (nonZeroDigits.length === 0) {
    return [[0]];
  }
  const fromFront = nonZeroDigits
    .filter((_, i) => i !== nonZeroDigits.length - 1)
    .flatMap(([d, i]) => {
      const fixedDigits = Array.from(digits);
      fixedDigits.length = fixedDigits.length - (i + 1);

      const result: number[][] = [];
      for (let n = d + 1; n < base; n++) {
        result.push([...Array.from(fixedDigits), n]);
      }
      return result;
    });

  return [nonZeroDigits.map((a) => a[0]).reverse(), ...fromFront];
}

export function backGroupings(digits: number[], base: number): number[][] {
  const digitsReversed = Array.from(digits).reverse();
  const nonMaxDigits = dropUntil(
    zipWithIndex(digitsReversed),
    (a) => a[0] !== base - 1,
  );

  if (nonMaxDigits.length === 0) {
    return [[base - 1]];
  }

  const fromBack = nonMaxDigits
    .filter((_, i) => i !== nonMaxDigits.length - 1)
    .flatMap(([d, i]) => {
      const fixedDigits = Array.from(digits);
      fixedDigits.length = fixedDigits.length - (i + 1);

      const result: number[][] = [];
      for (let n = d - 1; n >= 0; n--) {
        result.push([...Array.from(fixedDigits), n]);
      }

      return result;
    });

  return [...fromBack.reverse(), nonMaxDigits.map((a) => a[0]).reverse()];
}

export function middleGroupings(
  firstDigitStart: number,
  firstDigitEnd: number,
): number[][] {
  const result = [];
  while (++firstDigitStart < firstDigitEnd) {
    result.push([firstDigitStart]);
  }
  return result;
}

export function groupByIgnoringDigits(
  start: bigint,
  end: bigint,
  base: number,
  numDigits: number,
): number[][] {
  const { prefixDigits, startDigits, endDigits } = separatePrefix(
    start,
    end,
    base,
    numDigits,
  );

  if (
    start === end ||
    (startDigits.every((n) => n === 0) &&
      endDigits.every((n) => n === base - 1) &&
      prefixDigits.length !== 0)
  ) {
    return [prefixDigits];
  } else if (prefixDigits.length === numDigits - 1) {
    const result = [];
    for (
      let i = startDigits[startDigits.length - 1];
      i <= endDigits[endDigits.length - 1];
      i++
    ) {
      result.push([...prefixDigits, i]);
    }

    return result;
  } else {
    const front = frontGroupings(startDigits, base);
    const middle = middleGroupings(startDigits[0], endDigits[0]);
    const back = backGroupings(endDigits, base);

    const groupings = [...front, ...middle, ...back];

    return groupings.map((g) => [...prefixDigits, ...g]);
  }
}

export interface RoundingInterval {
  beginInterval: bigint;
  roundingMod: bigint;
}

export type CETPayout = {
  indexFrom: bigint;
  indexTo: bigint;
  payout: bigint;
};

/**
 * Performs optimized evaluation and rounding for strictly monotonic hyperbolas on intervals (from, to)
 * e.g. hyperbolas with the form b = c = 0
 *
 * The next start of a payout range is determined by finding the outcome at the next mid-rounding payout.
 * Uses an inverse function of the hyperbola to find the outcome.
 *
 * Optimizes rounding from O(to - from) to O(totalCollateral / rounding)
 *
 *
 * Evaluates and rounds a payout_function equivalent to:
 *
 *   payout_function_v0
 *    num_pieces: 1
 *    endpoint_0: from
 *    endpoint_payout_0: fromPayout
 *    extra_precision_0: 0
 *    payout_curve_piece: HyperbolaPayoutCurve
 *    endpoint_1: to
 *    endpoint_payout_1: toPayout
 */
export function splitIntoRanges(
  from: bigint,
  to: bigint,
  fromPayout: bigint, // endpoint_payout
  toPayout: bigint, // endpoint_payout
  totalCollateral: bigint,
  curve: HyperbolaPayoutCurve,
  roundingIntervals: RoundingInterval[],
): CETPayout[] {
  if (to - from <= 0) {
    throw new Error('`to` must be strictly greater than `from`');
  }

  const reversedIntervals = [...roundingIntervals].reverse();

  const getRoundingForOutcome = (outcome: BigInt): [bigint, number] => {
    const roundingIndex = reversedIntervals.findIndex(
      (interval) => interval.beginInterval <= outcome,
    );

    return [
      roundingIndex !== -1
        ? reversedIntervals[roundingIndex].roundingMod
        : BigInt(1),
      roundingIndex,
    ];
  };

  const clamp = (val: bigint) =>
    BigIntMath.clamp(BigInt(0), val, totalCollateral);

  const totalCollateralBN = new BigNumber(totalCollateral.toString());
  const clampBN = (val: BigNumber) =>
    BigNumber.max(0, BigNumber.min(val, totalCollateralBN));

  const result: CETPayout[] = [];

  // outcome = endpoint_0
  result.push({
    payout: fromPayout,
    indexFrom: from,
    indexTo: from,
  });

  let currentOutcome = from + BigInt(1);

  while (currentOutcome < to) {
    const [rounding, roundingIndex] = getRoundingForOutcome(currentOutcome);

    const nextFirstRoundingOutcome =
      reversedIntervals[roundingIndex - 1]?.beginInterval || to;

    let currentPayout = new BigNumber(
      roundPayout(
        clampBN(curve.getPayout(currentOutcome)),
        rounding,
      ).toString(),
    );

    let currentMidRoundedOutcome = currentOutcome;

    const isAscending = curve
      .getPayout(nextFirstRoundingOutcome)
      .gt(currentPayout);

    while (currentMidRoundedOutcome < nextFirstRoundingOutcome) {
      const nextRoundedPayout = currentPayout
        .integerValue()
        .plus(isAscending ? Number(rounding) : -Number(rounding));

      const nextRoundedPayoutBigInt = toBigInt(nextRoundedPayout);

      const nextMidRoundedPayout = currentPayout.plus(
        isAscending ? Number(rounding) / 2 : -Number(rounding) / 2,
      );

      let nextMidRoundedOutcome = curve.getOutcomeForPayout(
        nextMidRoundedPayout,
      );

      if (
        (!isAscending &&
          curve.getPayout(nextMidRoundedOutcome).lt(nextMidRoundedPayout)) ||
        (isAscending &&
          curve.getPayout(nextMidRoundedOutcome).gte(nextMidRoundedPayout))
      ) {
        nextMidRoundedOutcome = nextMidRoundedOutcome - BigInt(1);
      }

      const nextOutcome = curve.getOutcomeForPayout(nextRoundedPayout);

      if (
        nextRoundedPayoutBigInt > totalCollateral ||
        nextRoundedPayoutBigInt < 0 ||
        nextOutcome >= to ||
        nextOutcome < 0 // undefined on curve
      ) {
        if (nextMidRoundedOutcome < from || nextMidRoundedOutcome > to) {
          result.push({
            payout: clamp(toBigInt(currentPayout)),
            indexFrom: currentMidRoundedOutcome,
            indexTo: to,
          });
        } else {
          result.push(
            {
              payout: clamp(toBigInt(currentPayout)),
              indexFrom: currentMidRoundedOutcome,
              indexTo: nextMidRoundedOutcome,
            },
            {
              payout: clamp(nextRoundedPayoutBigInt),
              indexFrom: nextMidRoundedOutcome + BigInt(1),
              indexTo: to - BigInt(1),
            },
          );
        }

        currentOutcome = to;
        break;
      }

      if (nextMidRoundedOutcome >= nextFirstRoundingOutcome) {
        result.push({
          payout: clamp(toBigInt(currentPayout)),
          indexFrom: currentMidRoundedOutcome,
          indexTo: nextFirstRoundingOutcome - BigInt(1),
        });

        currentOutcome = nextFirstRoundingOutcome;
        break;
      }

      result.push({
        payout: clamp(toBigInt(currentPayout)),
        indexFrom: currentMidRoundedOutcome,
        indexTo: nextMidRoundedOutcome,
      });

      currentOutcome = nextOutcome + BigInt(1);
      currentPayout = nextRoundedPayout;

      currentMidRoundedOutcome = nextMidRoundedOutcome + BigInt(1);
    }
  }

  // outcome = endpoint_1
  result.push({
    payout: toPayout,
    indexFrom: to,
    indexTo: to,
  });

  // merge neighbouring ranges with same payout
  return result.reduce((acc: CETPayout[], range) => {
    const prev = acc[acc.length - 1];
    if (prev) {
      if (
        (prev.indexTo === range.indexFrom ||
          prev.indexTo + BigInt(1) === range.indexFrom) &&
        prev.payout === range.payout
      ) {
        prev.indexTo = range.indexTo;
        return acc;
      }
    }

    return [...acc, range];
  }, []);
}

export function roundPayout(payout: BigNumber, rounding: bigint): bigint {
  const roundingBN = new BigNumber(rounding.toString());
  const mod = payout.gte(0)
    ? payout.mod(roundingBN)
    : payout.mod(roundingBN).plus(roundingBN);

  const roundedPayout = mod.gte(roundingBN.dividedBy(2))
    ? payout.plus(roundingBN).minus(mod)
    : payout.minus(mod);

  return toBigInt(roundedPayout);
}
