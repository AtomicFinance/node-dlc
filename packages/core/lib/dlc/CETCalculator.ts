import HyperbolaPayoutCurve from './HyperbolaCurve';
import BigNumber from 'bignumber.js';
import BigIntMath from '../BigIntMath';

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
  console.log('num', num);
  console.log('base', base);
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

// x1 -> x2 == rounding
// [x1, round1], [x2, round2]
export interface RoundingInterval {
  beginInterval: bigint;
  roundingMod: bigint;
}

export type CETPayout = {
  indexFrom: bigint;
  indexTo: bigint;
  payout: bigint;
};

// Temporary optimized covered call range calculation
// Hyperbolas w/ b=c=0
export function splitIntoRanges(
  from: bigint,
  to: bigint,
  totalCollateral: bigint,
  curve: HyperbolaPayoutCurve,
  roundingIntervals: RoundingInterval[],
): CETPayout[] {
  const reversedIntervals = roundingIntervals.reverse();

  let firstValidOutcome: bigint;
  for (let i = from; i < to; i++) {
    const _payout = curve.getPayout(i).integerValue();
    if (!_payout.isFinite()) continue;
    const payout = BigInt(_payout.toString());

    if (payout >= 0n && payout <= totalCollateral) {
      firstValidOutcome = i;
      console.log('First valid outcome and payout', i, payout);
      break;
    }
  }

  if (firstValidOutcome === undefined)
    throw new Error('Cannot find a valid outcome');

  const result: CETPayout[] = [];

  let currentOutcome = firstValidOutcome;
  const clamp = (val: bigint) =>
    BigIntMath.max(0n, BigIntMath.min(val, totalCollateral));

  while (currentOutcome < to) {
    const roundingIndex = reversedIntervals.findIndex(
      (interval) => interval.beginInterval <= currentOutcome,
    );

    const rounding =
      roundingIndex !== -1 ? reversedIntervals[roundingIndex].roundingMod : 1n;

    const nextFirstRoundingOutcome =
      reversedIntervals[roundingIndex - 1]?.beginInterval || to;

    console.log(round(curve.getPayout(currentOutcome), rounding).toNumber());
    let currentPayout = round(curve.getPayout(currentOutcome), rounding);

    console.log('currentPayout', currentPayout.toNumber());
    console.log(firstValidOutcome);

    const isAscending = curve
      .getPayout(nextFirstRoundingOutcome)
      .gt(currentPayout);

    console.log(isAscending);

    let lastMidRoundingOutcome = currentOutcome;

    while (currentOutcome <= nextFirstRoundingOutcome) {
      const currentPayoutNext = currentPayout
        .integerValue()
        .plus(isAscending ? Number(rounding) : -Number(rounding));

      console.log(currentPayoutNext.toNumber());

      const currentPayoutNextBigInt = BigInt(
        currentPayoutNext.integerValue().toString(),
      );

      const currentPayoutNextMid = currentPayout.plus(
        isAscending ? Number(rounding / 2n) : -Number(rounding / 2n),
      );

      let nextMidRoundingOutcome = curve.getOutcomeForPayout(
        currentPayoutNextMid,
      );

      let nextOutcome = curve.getOutcomeForPayout(currentPayoutNext);
      if (nextOutcome < 0) nextOutcome = to - 1n;

      if (
        currentPayoutNextBigInt >= totalCollateral ||
        currentPayoutNextBigInt < 0 ||
        nextOutcome > to
      ) {
        result.push({
          payout: BigIntMath.max(
            0n,
            BigIntMath.min(
              totalCollateral,
              BigInt(currentPayout.integerValue().toString()),
            ),
          ),
          indexFrom: lastMidRoundingOutcome,
          indexTo: to,
        });
        return result;
      }

      if (nextOutcome >= nextFirstRoundingOutcome) {
        nextOutcome = nextFirstRoundingOutcome - 1n;
        nextMidRoundingOutcome = nextFirstRoundingOutcome;
      }

      result.push({
        payout: clamp(BigInt(currentPayout.integerValue().toString())),
        indexFrom: lastMidRoundingOutcome,
        indexTo: nextMidRoundingOutcome - 1n,
      });

      currentOutcome = nextOutcome + 1n;
      currentPayout = currentPayoutNext;

      lastMidRoundingOutcome = nextMidRoundingOutcome;
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
