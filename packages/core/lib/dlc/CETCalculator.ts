import { HyperbolaPayoutCurve } from './HyperbolaPayoutCurve';
import BigNumber from 'bignumber.js';
import BigIntMath from '../utils/BigIntMath';

export function zipWithIndex<T>(arr: T[]) {
  return arr.map((a, i) => [a, i]);
}

export function dropUntil<T>(data: T[], check: (T: any) => boolean): T[] {
  for (let i = 0; i < data.length; i++) {
    if (check(data[i])) {
      return data.slice(i);
    }
  }
  return [];
}

export function decompose(num: bigint, base: number, numDigits: number) {
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
) {
  const startDigits = decompose(start, base, numDigits);
  const endDigits = decompose(end, base, numDigits);

  const prefixDigits = [];
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
 * Performs optimized rounding for strictly monotonic hyperbolas on intervals (from, to)
 * e.g. hyperbolas with the form b = c = 0
 *
 * The next start of a payout range is determined by finding the outcome at the next mid-rounding payout.
 * Uses an inverse function of the hyperbola to find the outcome.
 *
 * Optimizes rounding from O(to - from) to O(totalCollateral / rounding)
 */
export function splitIntoRanges(
  from: bigint,
  to: bigint,
  totalCollateral: bigint,
  curve: HyperbolaPayoutCurve,
  roundingIntervals: RoundingInterval[],
): CETPayout[] {
  if (to - from <= 0) {
    throw new Error('`to` must be strictly greater than `from`');
  }
  if (roundingIntervals.length === 1) {
    throw new Error('Multiple rounding intervals are currently not supported');
  }

  const reversedIntervals = roundingIntervals.reverse();
  const clamp = (val: bigint) =>
    BigIntMath.max(0n, BigIntMath.min(val, totalCollateral));
  const result: CETPayout[] = [];

  let firstValidOutcome: bigint;

  for (let i = from; i < to; i++) {
    const _payout = curve.getPayout(i).integerValue();
    if (!_payout.isFinite()) continue;
    const payout = BigInt(_payout.toString());

    if (payout >= 0n && payout <= totalCollateral) {
      firstValidOutcome = i;
      break;
    }
  }

  if (firstValidOutcome === undefined)
    throw new Error('Cannot find a valid outcome');

  let currentOutcome = firstValidOutcome;
  while (currentOutcome < to) {
    const roundingIndex = reversedIntervals.findIndex(
      (interval) => interval.beginInterval <= currentOutcome,
    );

    const rounding =
      roundingIndex !== -1 ? reversedIntervals[roundingIndex].roundingMod : 1n;

    const nextFirstRoundingOutcome =
      reversedIntervals[roundingIndex - 1]?.beginInterval || to;

    let currentPayout = round(curve.getPayout(currentOutcome), rounding);
    let currentMidRoundedOutcome = currentOutcome;

    const isAscending = curve
      .getPayout(nextFirstRoundingOutcome)
      .gt(currentPayout);

    while (currentOutcome <= nextFirstRoundingOutcome) {
      const nextRoundedPayout = currentPayout
        .integerValue()
        .plus(isAscending ? Number(rounding) : -Number(rounding));

      const nextRoundedPayoutBigInt = BigInt(
        nextRoundedPayout.integerValue().toString(),
      );

      const nextMidRoundedPayout = currentPayout.plus(
        isAscending ? Number(rounding) / 2 : -Number(rounding) / 2,
      );

      let nextMidRoundedOutcome = curve.getOutcomeForPayout(
        nextMidRoundedPayout,
      );

      let nextOutcome = curve.getOutcomeForPayout(nextRoundedPayout);
      if (nextOutcome < 0) nextOutcome = to;

      if (
        (!isAscending &&
          curve.getPayout(nextMidRoundedOutcome).lt(nextMidRoundedPayout)) ||
        (isAscending &&
          curve.getPayout(nextMidRoundedOutcome).gte(nextMidRoundedPayout))
      ) {
        nextMidRoundedOutcome = nextMidRoundedOutcome - 1n;
      }

      if (
        nextRoundedPayoutBigInt > totalCollateral ||
        nextRoundedPayoutBigInt < 0 ||
        nextOutcome >= to
      ) {
        result.push(
          {
            payout: clamp(BigInt(currentPayout.integerValue().toString())),
            indexFrom: currentMidRoundedOutcome,
            indexTo: nextMidRoundedOutcome,
          },
          {
            payout: clamp(BigInt(nextRoundedPayout.integerValue().toString())),
            indexFrom: nextMidRoundedOutcome + 1n,
            indexTo: to,
          },
        );

        return result;
      }

      // next rounding interval
      if (nextOutcome >= nextFirstRoundingOutcome) {
        nextOutcome = nextFirstRoundingOutcome - 1n;
        nextMidRoundedOutcome = nextFirstRoundingOutcome;
      }

      result.push({
        payout: clamp(BigInt(currentPayout.integerValue().toString())),
        indexFrom: currentMidRoundedOutcome,
        indexTo: nextMidRoundedOutcome,
      });

      currentOutcome = nextOutcome + 1n;
      currentPayout = nextRoundedPayout;

      currentMidRoundedOutcome = nextMidRoundedOutcome + 1n;
    }
  }
  return result;
}

const round = (payout: BigNumber, rounding: bigint) => {
  const low = payout.minus(payout.mod(rounding.toString()));
  const hi = low.plus(rounding.toString());

  const low_diff = payout.minus(low).abs();
  const hi_diff = payout.minus(hi).abs();

  if (hi_diff.lte(low_diff)) return hi;
  return low;
};
