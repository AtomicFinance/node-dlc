import HyperbolaPayoutCurve from './HyperbolaCurve';
import BigNumber from 'bignumber.js';

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

// x1 -> x2 == rounding
// [x1, round1], [x2, round2]
interface Interval {
  beginInterval: bigint;
  roundingMod: bigint;
}

type CETPayout = {
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
  roundingIntervals: Interval[],
) {
  const reversedIntervals = roundingIntervals.reverse();
  // let currentOutcome = from;
  // let currentValue = roundingIntervals[0]?.roundingMod || 1;

  // search for first valid outcome.
  let firstValidPayoutBN: BigNumber;
  let firstValidPayout: bigint;
  let firstValidOutcome: bigint;

  console.time('findFirstValidOutcome');
  for (let i = from; i < to; i++) {
    const _payout = curve.getPayout(i).integerValue();
    if (!_payout.isFinite()) continue;
    const payout = BigInt(_payout.toString());

    if (payout >= 0n && payout <= totalCollateral) {
      firstValidPayoutBN = _payout;
      firstValidPayout = payout;
      firstValidOutcome = i;
      break;
    }
  }
  console.timeEnd('findFirstValidOutcome');
  console.log(firstValidPayout);
  if (firstValidPayout === undefined) return;
  let currentOutcome = firstValidOutcome;
  console.log('First valid outcome', currentOutcome);
  const result: CETPayout[] = [];

  while (currentOutcome < to) {
    const roundingIndex = reversedIntervals.findIndex(
      (interval) => interval.beginInterval <= currentOutcome,
    );

    const rounding =
      roundingIndex !== -1 ? reversedIntervals[roundingIndex].roundingMod : 1n;

    const nextFirstRoundingOutcome =
      reversedIntervals[roundingIndex - 1]?.beginInterval || to;

    let currentPayout = curve.getPayout(currentOutcome);
    const isAscending = curve
      .getPayout(nextFirstRoundingOutcome)
      .gt(currentPayout);

    let lastCurrentOutcomeMid = currentOutcome;

    while (currentOutcome < nextFirstRoundingOutcome) {
      const currentPayoutNext = currentPayout
        .integerValue()
        .plus(isAscending ? Number(rounding) : -Number(rounding));

      const currentPayoutNextBigInt = BigInt(
        currentPayoutNext.integerValue().toString(),
      );

      const currentPayoutNextMid = currentPayout.plus(
        isAscending ? Number(rounding / 2n) : -Number(rounding / 2n),
      );

      const currentOutcomeNextMid = curve.getOutcomeForPayout(
        currentPayoutNextMid,
      );

      if (
        currentPayoutNextBigInt >= totalCollateral ||
        currentPayoutNextBigInt < 0n
      ) {
        result.push({
          payout:
            currentPayoutNextBigInt >= totalCollateral ? totalCollateral : 0n,
          indexFrom: currentOutcome,
          indexTo: to,
        });
        return;
      }

      let nextOutcome = curve.getOutcomeForPayout(currentPayoutNext);

      console.log('nextOutcome', nextOutcome);

      if (nextOutcome >= nextFirstRoundingOutcome) {
        nextOutcome = nextFirstRoundingOutcome;
      }

      result.push({
        payout: BigInt(currentPayout.integerValue().toString()),
        indexFrom: lastCurrentOutcomeMid,
        indexTo: currentOutcomeNextMid - 1n,
      });

      currentOutcome = nextOutcome + 1n;
      currentPayout = currentPayoutNext;

      lastCurrentOutcomeMid = currentOutcomeNextMid;
    }
  }
  return result;
}
// const hyperbola = new HyperbolaPayoutCurve(
//   new BigNumber(1), // a
//   new BigNumber(0), // b
//   new BigNumber(0), // c
//   new BigNumber(50), // d
//   new BigNumber(0), // f_1
//   new BigNumber(0), // f_2
//   true,
// );

const hyperbola = new HyperbolaPayoutCurve(
  new BigNumber(1), // a
  new BigNumber(0), // b
  new BigNumber(0), // c
  new BigNumber(5000000000000), // d
  new BigNumber(0), // f_1
  new BigNumber(0), // f_2
  true,
);
console.log(
  splitIntoRanges(0n, 999999n, 100000000n, hyperbola, [
    { beginInterval: 1n, roundingMod: 10000n },
    { beginInterval: 400n, roundingMod: 250000n },
    // { beginInterval: 50250n, roundingMod: 50000n },
  ]),
);
console.log(hyperbola.getOutcomeForPayout(new BigNumber(99875000)));
const test0 = BigInt(hyperbola.getPayout(50063n).integerValue().toNumber());
console.log(test0);
console.log(test0 - (test0 - (test0 % 250000n)));
console.log(test0 - (test0 - (test0 % 250000n) + 250000n));

console.log('---');
console.log(hyperbola.getOutcomeForPayout(new BigNumber(99625000)));
const test1 = BigInt(hyperbola.getPayout(57720n).integerValue().toNumber());
console.log(test1);
console.log(test1 - (test1 - (test1 % 250000n)));
console.log(test1 - (test1 - (test1 % 250000n) + 250000n));
