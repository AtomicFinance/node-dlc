import BigNumber from 'bignumber.js';
import { expect } from 'chai';
import { BigIntMath } from '../../lib/utils/BigIntUtils';
import {
  decompose,
  groupByIgnoringDigits,
  RoundingInterval,
  splitIntoRanges,
  roundPayout,
} from '../../lib/dlc/CETCalculator';
import { HyperbolaPayoutCurve } from '../../lib/dlc/HyperbolaPayoutCurve';

const decompositionTestCases: {
  decomposed: number[];
  composed: string;
  base: number;
  nbDigits: number;
}[] = [
  {
    composed: '123456789',
    decomposed: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    base: 10,
    nbDigits: 9,
  },
  {
    composed: '4321',
    decomposed: [1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1],
    base: 2,
    nbDigits: 13,
  },
  {
    composed: '0',
    decomposed: [0, 0, 0, 0],
    base: 8,
    nbDigits: 4,
  },
  {
    composed: '2',
    decomposed: [0, 2],
    base: 10,
    nbDigits: 2,
  },
  {
    composed: '1',
    decomposed: [1],
    base: 2,
    nbDigits: 1,
  },
];

const groupingTestCases: {
  startIndex: bigint;
  endIndex: bigint;
  base: number;
  nbDigits: number;
  expected: number[][];
}[] = [
  {
    startIndex: 123n,
    endIndex: 123n,
    base: 10,
    nbDigits: 3,
    expected: [[1, 2, 3]],
  },
  {
    startIndex: 171n,
    endIndex: 210n,
    base: 16,
    nbDigits: 2,
    expected: [
      [10, 11],
      [10, 12],
      [10, 13],
      [10, 14],
      [10, 15],
      [11],
      [12],
      [13, 0],
      [13, 1],
      [13, 2],
    ],
  },
  {
    startIndex: 73899n,
    endIndex: 73938n,
    base: 16,
    nbDigits: 6,
    expected: [
      [0, 1, 2, 0, 10, 11],
      [0, 1, 2, 0, 10, 12],
      [0, 1, 2, 0, 10, 13],
      [0, 1, 2, 0, 10, 14],
      [0, 1, 2, 0, 10, 15],
      [0, 1, 2, 0, 11],
      [0, 1, 2, 0, 12],
      [0, 1, 2, 0, 13, 0],
      [0, 1, 2, 0, 13, 1],
      [0, 1, 2, 0, 13, 2],
    ],
  },
  {
    startIndex: 1234n,
    endIndex: 4321n,
    base: 10,
    nbDigits: 4,
    expected: [
      [1, 2, 3, 4],
      [1, 2, 3, 5],
      [1, 2, 3, 6],
      [1, 2, 3, 7],
      [1, 2, 3, 8],
      [1, 2, 3, 9],
      [1, 2, 4],
      [1, 2, 5],
      [1, 2, 6],
      [1, 2, 7],
      [1, 2, 8],
      [1, 2, 9],
      [1, 3],
      [1, 4],
      [1, 5],
      [1, 6],
      [1, 7],
      [1, 8],
      [1, 9],
      [2],
      [3],
      [4, 0],
      [4, 1],
      [4, 2],
      [4, 3, 0],
      [4, 3, 1],
      [4, 3, 2, 0],
      [4, 3, 2, 1],
    ],
  },
  {
    startIndex: 1201234n,
    endIndex: 1204321n,
    base: 10,
    nbDigits: 8,
    expected: [
      [0, 1, 2, 0, 1, 2, 3, 4],
      [0, 1, 2, 0, 1, 2, 3, 5],
      [0, 1, 2, 0, 1, 2, 3, 6],
      [0, 1, 2, 0, 1, 2, 3, 7],
      [0, 1, 2, 0, 1, 2, 3, 8],
      [0, 1, 2, 0, 1, 2, 3, 9],
      [0, 1, 2, 0, 1, 2, 4],
      [0, 1, 2, 0, 1, 2, 5],
      [0, 1, 2, 0, 1, 2, 6],
      [0, 1, 2, 0, 1, 2, 7],
      [0, 1, 2, 0, 1, 2, 8],
      [0, 1, 2, 0, 1, 2, 9],
      [0, 1, 2, 0, 1, 3],
      [0, 1, 2, 0, 1, 4],
      [0, 1, 2, 0, 1, 5],
      [0, 1, 2, 0, 1, 6],
      [0, 1, 2, 0, 1, 7],
      [0, 1, 2, 0, 1, 8],
      [0, 1, 2, 0, 1, 9],
      [0, 1, 2, 0, 2],
      [0, 1, 2, 0, 3],
      [0, 1, 2, 0, 4, 0],
      [0, 1, 2, 0, 4, 1],
      [0, 1, 2, 0, 4, 2],
      [0, 1, 2, 0, 4, 3, 0],
      [0, 1, 2, 0, 4, 3, 1],
      [0, 1, 2, 0, 4, 3, 2, 0],
      [0, 1, 2, 0, 4, 3, 2, 1],
    ],
  },
  {
    startIndex: 2200n,
    endIndex: 4999n,
    base: 10,
    nbDigits: 4,
    expected: [
      [2, 2],
      [2, 3],
      [2, 4],
      [2, 5],
      [2, 6],
      [2, 7],
      [2, 8],
      [2, 9],
      [3],
      [4],
    ],
  },
  {
    startIndex: 0n,
    endIndex: 99n,
    base: 10,
    nbDigits: 2,
    expected: [[0], [1], [2], [3], [4], [5], [6], [7], [8], [9]],
  },
  {
    startIndex: 100n,
    endIndex: 199n,
    base: 10,
    nbDigits: 3,
    expected: [[1]],
  },
  {
    startIndex: 100n,
    endIndex: 200n,
    base: 10,
    nbDigits: 3,
    expected: [[1], [2, 0, 0]],
  },
  {
    startIndex: 11n,
    endIndex: 18n,
    base: 10,
    nbDigits: 2,
    expected: [
      [1, 1],
      [1, 2],
      [1, 3],
      [1, 4],
      [1, 5],
      [1, 6],
      [1, 7],
      [1, 8],
    ],
  },
  {
    startIndex: 11n,
    endIndex: 23n,
    base: 2,
    nbDigits: 5,
    expected: [
      [0, 1, 0, 1, 1],
      [0, 1, 1],
      [1, 0],
    ],
  },
  {
    startIndex: 5677n,
    endIndex: 8621n,
    base: 2,
    nbDigits: 14,
    expected: [
      [0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1],
      [0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1],
      [0, 1, 0, 1, 1, 0, 0, 0, 1, 1],
      [0, 1, 0, 1, 1, 0, 0, 1],
      [0, 1, 0, 1, 1, 0, 1],
      [0, 1, 0, 1, 1, 1],
      [0, 1, 1],
      [1, 0, 0, 0, 0, 0],
      [1, 0, 0, 0, 0, 1, 0],
      [1, 0, 0, 0, 0, 1, 1, 0, 0],
      [1, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0],
      [1, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0],
      [1, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0],
    ],
  },
];

describe('CETCalculator', () => {
  describe('outcome decomposition tests', () => {
    it('should properly decompose values', () => {
      for (const test of decompositionTestCases) {
        expect(
          decompose(BigInt(parseInt(test.composed)), test.base, test.nbDigits),
        ).deep.equal(test.decomposed);
      }
    });
  });

  describe('grouping tests', () => {
    it('should properly compute all groupings', () => {
      for (const test of groupingTestCases) {
        expect(
          groupByIgnoringDigits(
            test.startIndex,
            test.endIndex,
            test.base,
            test.nbDigits,
          ),
        ).deep.equal(test.expected);
      }
    });
  });

  describe('descending hyperbola a=1 d=5000 tests', () => {
    const hyperbola = new HyperbolaPayoutCurve(
      new BigNumber(1),
      new BigNumber(0),
      new BigNumber(0),
      new BigNumber(500000),
      new BigNumber(0),
      new BigNumber(0),
      true,
    );

    it('should properly split and round with one interval', () => {
      const roundingIntervals: RoundingInterval[] = [
        {
          beginInterval: 0n,
          roundingMod: 10n,
        },
      ];

      const totalCollateral = 100n;
      const from = 0n;
      const to = 999999n;
      const fromPayout = totalCollateral;
      const toPayout = 0n;

      const ranges = splitIntoRanges(
        from,
        to,
        fromPayout,
        toPayout,
        totalCollateral,
        hyperbola,
        roundingIntervals,
      );

      const reversedIntervals = [...roundingIntervals].reverse();

      expect(ranges).deep.equal([
        { payout: 100n, indexFrom: 0n, indexTo: 5263n },
        { payout: 90n, indexFrom: 5264n, indexTo: 5882n },
        { payout: 80n, indexFrom: 5883n, indexTo: 6666n },
        { payout: 70n, indexFrom: 6667n, indexTo: 7692n },
        { payout: 60n, indexFrom: 7693n, indexTo: 9090n },
        { payout: 50n, indexFrom: 9091n, indexTo: 11111n },
        { payout: 40n, indexFrom: 11112n, indexTo: 14285n },
        { payout: 30n, indexFrom: 14286n, indexTo: 20000n },
        { payout: 20n, indexFrom: 20001n, indexTo: 33333n },
        { payout: 10n, indexFrom: 33334n, indexTo: 100000n },
        { payout: 0n, indexFrom: 100001n, indexTo: 999999n },
      ]);
      // for each rounded payout at indexTo, expect to be equal to range payout
      ranges.forEach((range) => {
        if (range.indexFrom === from || range.indexTo === from)
          return expect(range.payout).to.be.eq(fromPayout);

        if (range.indexFrom === to || range.indexTo === to)
          return expect(range.payout).to.be.eq(toPayout);

        const payout = hyperbola.getPayout(range.indexTo);

        const roundingIndex = reversedIntervals.findIndex(
          (interval) => interval.beginInterval <= range.indexTo,
        );

        const rounding =
          roundingIndex !== -1
            ? reversedIntervals[roundingIndex].roundingMod
            : 1n;

        const roundedPayout = BigIntMath.clamp(
          0n,
          roundPayout(payout, rounding),
          totalCollateral,
        );
        expect(roundedPayout).to.eq(range.payout);
      });

      // for each rounded payout at indexFrom, expect to be equal to range payout
      ranges.forEach((range) => {
        if (range.indexFrom === from || range.indexTo === from)
          return expect(range.payout).to.be.eq(fromPayout);

        if (range.indexFrom === to || range.indexTo === to)
          return expect(range.payout).to.be.eq(toPayout);

        const payout = hyperbola.getPayout(range.indexFrom);

        const roundingIndex = reversedIntervals.findIndex(
          (interval) => interval.beginInterval <= range.indexTo,
        );

        const rounding =
          roundingIndex !== -1
            ? reversedIntervals[roundingIndex].roundingMod
            : 1n;

        const roundedPayout = BigIntMath.clamp(
          0n,
          roundPayout(payout, rounding),
          totalCollateral,
        );
        expect(roundedPayout).to.eq(range.payout);
      });
    });

    it('should properly split and round with non-even rounding mod', () => {
      const roundingIntervals: RoundingInterval[] = [
        {
          beginInterval: 0n,
          roundingMod: 15n,
        },
      ];

      const reversedIntervals = [...roundingIntervals].reverse();

      const totalCollateral = 100n;
      const from = 0n;
      const to = 999999n;
      const fromPayout = totalCollateral;
      const toPayout = 0n;

      const ranges = splitIntoRanges(
        from,
        to,
        fromPayout,
        toPayout,
        totalCollateral,
        hyperbola,
        roundingIntervals,
      );

      expect(ranges).to.deep.equal([
        { payout: 100n, indexFrom: 0n, indexTo: 5128n },
        { payout: 90n, indexFrom: 5129n, indexTo: 6060n },
        { payout: 75n, indexFrom: 6061n, indexTo: 7407n },
        { payout: 60n, indexFrom: 7408n, indexTo: 9523n },
        { payout: 45n, indexFrom: 9524n, indexTo: 13333n },
        { payout: 30n, indexFrom: 13334n, indexTo: 22222n },
        { payout: 15n, indexFrom: 22223n, indexTo: 66666n },
        { payout: 0n, indexFrom: 66667n, indexTo: 999999n },
      ]);
      // for each rounded payout at indexTo, expect to be equal to range payout
      ranges.forEach((range) => {
        if (range.indexFrom === from || range.indexTo === from)
          return expect(range.payout).to.be.eq(fromPayout);

        if (range.indexFrom === to || range.indexTo === to)
          return expect(range.payout).to.be.eq(toPayout);

        const payout = hyperbola.getPayout(range.indexTo);

        const roundingIndex = reversedIntervals.findIndex(
          (interval) => interval.beginInterval <= range.indexTo,
        );

        const rounding =
          roundingIndex !== -1
            ? reversedIntervals[roundingIndex].roundingMod
            : 1n;

        const roundedPayout = BigIntMath.clamp(
          0n,
          roundPayout(payout, rounding),
          totalCollateral,
        );
        expect(roundedPayout).to.eq(range.payout);
      });

      // for each rounded payout at indexFrom, expect to be equal to range payout
      ranges.forEach((range) => {
        if (range.indexFrom === from || range.indexTo === from)
          return expect(range.payout).to.be.eq(fromPayout);

        if (range.indexFrom === to || range.indexTo === to)
          return expect(range.payout).to.be.eq(toPayout);

        const payout = hyperbola.getPayout(range.indexFrom);

        const roundingIndex = reversedIntervals.findIndex(
          (interval) => interval.beginInterval <= range.indexTo,
        );

        const rounding =
          roundingIndex !== -1
            ? reversedIntervals[roundingIndex].roundingMod
            : 1n;

        const roundedPayout = BigIntMath.clamp(
          0n,
          roundPayout(payout, rounding),
          totalCollateral,
        );
        expect(roundedPayout).to.eq(range.payout);
      });
    });
  });

  describe('ascending hyperbola a=-1 d=500000 f2=100 tests', () => {
    const hyperbola = new HyperbolaPayoutCurve(
      new BigNumber(-1),
      new BigNumber(0),
      new BigNumber(0),
      new BigNumber(500000),
      new BigNumber(0),
      new BigNumber(100),
      true,
    );

    it('should properly split and round with one interval', () => {
      const roundingIntervals: RoundingInterval[] = [
        {
          beginInterval: 0n,
          roundingMod: 10n,
        },
      ];
      const reversedIntervals = [...roundingIntervals].reverse();

      const totalCollateral = 100n;
      const from = 0n;
      const to = 999999n;
      const fromPayout = 0n;
      const toPayout = totalCollateral;

      const ranges = splitIntoRanges(
        from,
        to,
        fromPayout,
        toPayout,
        totalCollateral,
        hyperbola,
        roundingIntervals,
      );

      expect(ranges).to.deep.equal([
        { payout: 0n, indexFrom: 0n, indexTo: 5263n },
        { payout: 10n, indexFrom: 5264n, indexTo: 5882n },
        { payout: 20n, indexFrom: 5883n, indexTo: 6666n },
        { payout: 30n, indexFrom: 6667n, indexTo: 7692n },
        { payout: 40n, indexFrom: 7693n, indexTo: 9090n },
        { payout: 50n, indexFrom: 9091n, indexTo: 11111n },
        { payout: 60n, indexFrom: 11112n, indexTo: 14285n },
        { payout: 70n, indexFrom: 14286n, indexTo: 19999n },
        { payout: 80n, indexFrom: 20000n, indexTo: 33333n },
        { payout: 90n, indexFrom: 33334n, indexTo: 99999n },
        { payout: 100n, indexFrom: 100000n, indexTo: 999999n },
      ]);
      // for each rounded payout at indexTo, expect to be equal to range payout
      ranges.forEach((range) => {
        if (range.indexFrom === from || range.indexTo === from)
          return expect(range.payout).to.be.eq(fromPayout);

        if (range.indexFrom === to || range.indexTo === to)
          return expect(range.payout).to.be.eq(toPayout);

        const payout = hyperbola.getPayout(range.indexTo);

        const roundingIndex = reversedIntervals.findIndex(
          (interval) => interval.beginInterval <= range.indexTo,
        );

        const rounding =
          roundingIndex !== -1
            ? reversedIntervals[roundingIndex].roundingMod
            : 1n;

        const roundedPayout = BigIntMath.clamp(
          0n,
          roundPayout(payout, rounding),
          totalCollateral,
        );
        expect(roundedPayout).to.eq(range.payout);
      });

      // for each rounded payout at indexFrom, expect to be equal to range payout
      ranges.forEach((range) => {
        if (range.indexFrom === from || range.indexTo === from)
          return expect(range.payout).to.be.eq(fromPayout);

        if (range.indexFrom === to || range.indexTo === to)
          return expect(range.payout).to.be.eq(toPayout);

        const payout = hyperbola.getPayout(range.indexFrom);

        const roundingIndex = reversedIntervals.findIndex(
          (interval) => interval.beginInterval <= range.indexTo,
        );

        const rounding =
          roundingIndex !== -1
            ? reversedIntervals[roundingIndex].roundingMod
            : 1n;

        const roundedPayout = BigIntMath.clamp(
          0n,
          roundPayout(payout, rounding),
          totalCollateral,
        );
        expect(roundedPayout).to.eq(range.payout);
      });
    });

    it('should properly split and round with multiple rounding intervals', () => {
      const roundingIntervals: RoundingInterval[] = [
        {
          beginInterval: 0n,
          roundingMod: 7n,
        },
        { beginInterval: 5432n, roundingMod: 12n },
        { beginInterval: 6432n, roundingMod: 25n },
      ];
      const reversedIntervals = [...roundingIntervals].reverse();

      const totalCollateral = 100n;
      const from = 0n;
      const to = 999999n;
      const fromPayout = 0n;
      const toPayout = totalCollateral;

      const ranges = splitIntoRanges(
        from,
        to,
        fromPayout,
        toPayout,
        totalCollateral,
        hyperbola,
        roundingIntervals,
      );

      expect(ranges).to.deep.equal([
        { payout: 0n, indexFrom: 0n, indexTo: 5181n },
        { payout: 7n, indexFrom: 5182n, indexTo: 5431n },
        { payout: 12n, indexFrom: 5432n, indexTo: 6097n },
        { payout: 24n, indexFrom: 6098n, indexTo: 6431n },
        { payout: 25n, indexFrom: 6432n, indexTo: 7999n },
        { payout: 50n, indexFrom: 8000n, indexTo: 13333n },
        { payout: 75n, indexFrom: 13334n, indexTo: 39999n },
        { payout: 100n, indexFrom: 40000n, indexTo: 999999n },
      ]);
      // for each rounded payout at indexTo, expect to be equal to range payout
      ranges.forEach((range) => {
        if (range.indexFrom === from || range.indexTo === from)
          return expect(range.payout).to.be.eq(fromPayout);

        if (range.indexFrom === to || range.indexTo === to)
          return expect(range.payout).to.be.eq(toPayout);

        const payout = hyperbola.getPayout(range.indexTo);

        const roundingIndex = reversedIntervals.findIndex(
          (interval) => interval.beginInterval <= range.indexTo,
        );

        const rounding =
          roundingIndex !== -1
            ? reversedIntervals[roundingIndex].roundingMod
            : 1n;

        const roundedPayout = BigIntMath.clamp(
          0n,
          roundPayout(payout, rounding),
          totalCollateral,
        );
        expect(roundedPayout).to.eq(range.payout);
      });

      // for each rounded payout at indexFrom, expect to be equal to range payout
      ranges.forEach((range) => {
        if (range.indexFrom === from || range.indexTo === from)
          return expect(range.payout).to.be.eq(fromPayout);

        if (range.indexFrom === to || range.indexTo === to)
          return expect(range.payout).to.be.eq(toPayout);

        const payout = hyperbola.getPayout(range.indexFrom);

        const roundingIndex = reversedIntervals.findIndex(
          (interval) => interval.beginInterval <= range.indexTo,
        );

        const rounding =
          roundingIndex !== -1
            ? reversedIntervals[roundingIndex].roundingMod
            : 1n;

        const roundedPayout = BigIntMath.clamp(
          0n,
          roundPayout(payout, rounding),
          totalCollateral,
        );
        expect(roundedPayout).to.eq(range.payout);
      });
    });

    it('should properly split and round with non-even rounding mod', () => {
      const roundingIntervals: RoundingInterval[] = [
        {
          beginInterval: 0n,
          roundingMod: 15n,
        },
      ];
      const reversedIntervals = [...roundingIntervals].reverse();

      const totalCollateral = 100n;
      const from = 0n;
      const to = 999999n;
      const fromPayout = 0n;
      const toPayout = totalCollateral;

      const ranges = splitIntoRanges(
        from,
        to,
        fromPayout,
        toPayout,
        totalCollateral,
        hyperbola,
        roundingIntervals,
      );

      expect(ranges).to.deep.equal([
        { payout: 0n, indexFrom: 0n, indexTo: 5405n },
        { payout: 15n, indexFrom: 5406n, indexTo: 6451n },
        { payout: 30n, indexFrom: 6452n, indexTo: 7999n },
        { payout: 45n, indexFrom: 8000n, indexTo: 10526n },
        { payout: 60n, indexFrom: 10527n, indexTo: 15384n },
        { payout: 75n, indexFrom: 15385n, indexTo: 28571n },
        { payout: 90n, indexFrom: 28572n, indexTo: 199999n },
        { payout: 100n, indexFrom: 200000n, indexTo: 999999n },
      ]);

      // for each rounded payout at indexTo, expect to be equal to range payout
      ranges.forEach((range) => {
        if (range.indexFrom === from || range.indexTo === from)
          return expect(range.payout).to.be.eq(fromPayout);

        if (range.indexFrom === to || range.indexTo === to)
          return expect(range.payout).to.be.eq(toPayout);

        const payout = hyperbola.getPayout(range.indexTo);

        const roundingIndex = reversedIntervals.findIndex(
          (interval) => interval.beginInterval <= range.indexTo,
        );

        const rounding =
          roundingIndex !== -1
            ? reversedIntervals[roundingIndex].roundingMod
            : 1n;

        const roundedPayout = BigIntMath.clamp(
          0n,
          roundPayout(payout, rounding),
          totalCollateral,
        );
        expect(roundedPayout).to.eq(range.payout);
      });

      // for each rounded payout at indexFrom, expect to be equal to range payout
      ranges.forEach((range) => {
        if (range.indexFrom === from || range.indexTo === from)
          return expect(range.payout).to.be.eq(fromPayout);

        if (range.indexFrom === to || range.indexTo === to)
          return expect(range.payout).to.be.eq(toPayout);

        const payout = hyperbola.getPayout(range.indexFrom);

        const roundingIndex = reversedIntervals.findIndex(
          (interval) => interval.beginInterval <= range.indexTo,
        );

        const rounding =
          roundingIndex !== -1
            ? reversedIntervals[roundingIndex].roundingMod
            : 1n;

        const roundedPayout = BigIntMath.clamp(
          0n,
          roundPayout(payout, rounding),
          totalCollateral,
        );
        expect(roundedPayout).to.eq(range.payout);
      });
    });
  });

  describe('large descending hyperbola a=1 d=5000000000000 tests (50k 1BTC covered call)', () => {
    const hyperbola = new HyperbolaPayoutCurve(
      new BigNumber(1),
      new BigNumber(0),
      new BigNumber(0),
      new BigNumber(5000000000000),
      new BigNumber(0),
      new BigNumber(0),
      true,
    );

    it('should properly split and round with one interval', () => {
      const roundingIntervals: RoundingInterval[] = [
        {
          beginInterval: 0n,
          roundingMod: 100000n,
        },
      ];
      const reversedIntervals = [...roundingIntervals].reverse();

      const totalCollateral = 100000000n;
      const from = 0n;
      const to = 999999n;
      const fromPayout = totalCollateral;
      const toPayout = 0n;

      const ranges = splitIntoRanges(
        from,
        to,
        fromPayout,
        toPayout,
        totalCollateral,
        hyperbola,
        roundingIntervals,
      );

      // for each rounded payout at indexTo, expect to be equal to range payout
      ranges.forEach((range) => {
        if (range.indexFrom === from || range.indexTo === from)
          return expect(range.payout).to.be.eq(fromPayout);

        if (range.indexFrom === to || range.indexTo === to)
          return expect(range.payout).to.be.eq(toPayout);

        const payout = hyperbola.getPayout(range.indexTo);

        const roundingIndex = reversedIntervals.findIndex(
          (interval) => interval.beginInterval <= range.indexTo,
        );

        const rounding =
          roundingIndex !== -1
            ? reversedIntervals[roundingIndex].roundingMod
            : 1n;

        const roundedPayout = BigIntMath.clamp(
          0n,
          roundPayout(payout, rounding),
          totalCollateral,
        );
        expect(roundedPayout).to.eq(range.payout);
      });

      // for each rounded payout at indexFrom, expect to be equal to range payout
      ranges.forEach((range) => {
        if (range.indexFrom === from || range.indexTo === from)
          return expect(range.payout).to.be.eq(fromPayout);

        if (range.indexFrom === to || range.indexTo === to)
          return expect(range.payout).to.be.eq(toPayout);

        const payout = hyperbola.getPayout(range.indexFrom);

        const roundingIndex = reversedIntervals.findIndex(
          (interval) => interval.beginInterval <= range.indexTo,
        );

        const rounding =
          roundingIndex !== -1
            ? reversedIntervals[roundingIndex].roundingMod
            : 1n;

        const roundedPayout = BigIntMath.clamp(
          0n,
          roundPayout(payout, rounding),
          totalCollateral,
        );

        expect(roundedPayout).to.eq(range.payout);
      });
    });

    it('should properly split and round with non-even rounding mod', () => {
      const roundingIntervals: RoundingInterval[] = [
        {
          beginInterval: 0n,
          roundingMod: 150000n,
        },
      ];
      const reversedIntervals = [...roundingIntervals].reverse();

      const totalCollateral = 100000000n;
      const from = 0n;
      const to = 999999n;
      const fromPayout = totalCollateral;
      const toPayout = 0n;

      const ranges = splitIntoRanges(
        from,
        to,
        fromPayout,
        toPayout,
        totalCollateral,
        hyperbola,
        roundingIntervals,
      );

      // for each rounded payout at indexTo, expect to be equal to range payout
      ranges.forEach((range) => {
        if (range.indexFrom === from || range.indexTo === from)
          return expect(range.payout).to.be.eq(fromPayout);

        if (range.indexFrom === to || range.indexTo === to)
          return expect(range.payout).to.be.eq(toPayout);

        const payout = hyperbola.getPayout(range.indexTo);

        const roundingIndex = reversedIntervals.findIndex(
          (interval) => interval.beginInterval <= range.indexTo,
        );

        const rounding =
          roundingIndex !== -1
            ? reversedIntervals[roundingIndex].roundingMod
            : 1n;

        const roundedPayout = BigIntMath.clamp(
          0n,
          roundPayout(payout, rounding),
          totalCollateral,
        );
        expect(roundedPayout).to.eq(range.payout);
      });

      // for each rounded payout at indexFrom, expect to be equal to range payout
      ranges.forEach((range) => {
        if (range.indexFrom === from || range.indexTo === from)
          return expect(range.payout).to.be.eq(fromPayout);

        if (range.indexFrom === to || range.indexTo === to)
          return expect(range.payout).to.be.eq(toPayout);

        const payout = hyperbola.getPayout(range.indexFrom);

        const roundingIndex = reversedIntervals.findIndex(
          (interval) => interval.beginInterval <= range.indexTo,
        );

        const rounding =
          roundingIndex !== -1
            ? reversedIntervals[roundingIndex].roundingMod
            : 1n;

        const roundedPayout = BigIntMath.clamp(
          0n,
          roundPayout(payout, rounding),
          totalCollateral,
        );
        expect(roundedPayout).to.eq(range.payout);
      });
    });
  });

  describe('descending hyperbola a=1 d=7500000000000 f2=-7500000 tests', () => {
    const hyperbola = new HyperbolaPayoutCurve(
      new BigNumber(1),
      new BigNumber(0),
      new BigNumber(0),
      new BigNumber(7500000000000),
      new BigNumber(0),
      new BigNumber(-7500008),
      true,
    );

    it('should properly split and round with one interval', () => {
      const roundingIntervals: RoundingInterval[] = [
        {
          beginInterval: 0n,
          roundingMod: 250000n,
        },
      ];
      const reversedIntervals = [...roundingIntervals].reverse();

      const totalCollateral = 92499992n;
      const from = 0n;
      const to = 999999n;
      const fromPayout = totalCollateral;
      const toPayout = 0n;

      const ranges = splitIntoRanges(
        from,
        to,
        fromPayout,
        toPayout,
        totalCollateral,
        hyperbola,
        roundingIntervals,
      );

      // for each rounded payout at indexTo, expect to be equal to range payout
      ranges.forEach((range) => {
        if (range.indexFrom === from || range.indexTo === from)
          return expect(range.payout).to.be.eq(fromPayout);

        if (range.indexFrom === to || range.indexTo === to)
          return expect(range.payout).to.be.eq(toPayout);

        const payout = hyperbola.getPayout(range.indexTo);

        const roundingIndex = reversedIntervals.findIndex(
          (interval) => interval.beginInterval <= range.indexTo,
        );

        const rounding =
          roundingIndex !== -1
            ? reversedIntervals[roundingIndex].roundingMod
            : 1n;

        const roundedPayout = BigIntMath.clamp(
          0n,
          roundPayout(payout, rounding),
          totalCollateral,
        );
        expect(roundedPayout).to.eq(range.payout);
      });

      // for each rounded payout at indexFrom, expect to be equal to range payout
      ranges.forEach((range) => {
        if (range.indexFrom === from || range.indexTo === from)
          return expect(range.payout).to.be.eq(fromPayout);

        if (range.indexFrom === to || range.indexTo === to)
          return expect(range.payout).to.be.eq(toPayout);

        const payout = hyperbola.getPayout(range.indexFrom);

        const roundingIndex = reversedIntervals.findIndex(
          (interval) => interval.beginInterval <= range.indexTo,
        );

        const rounding =
          roundingIndex !== -1
            ? reversedIntervals[roundingIndex].roundingMod
            : 1n;

        const roundedPayout = BigIntMath.clamp(
          0n,
          roundPayout(payout, rounding),
          totalCollateral,
        );
        expect(roundedPayout).to.eq(range.payout);
      });
    });
  });
});
