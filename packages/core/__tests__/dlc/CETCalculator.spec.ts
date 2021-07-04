import BigNumber from 'bignumber.js';
import { expect } from 'chai';

import {
  decompose,
  groupByIgnoringDigits,
  RoundingInterval,
  roundPayout,
  splitIntoRanges,
} from '../../lib/dlc/CETCalculator';
import { HyperbolaPayoutCurve } from '../../lib/dlc/HyperbolaPayoutCurve';
import { BigIntMath } from '../../lib/utils/BigIntUtils';

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
    startIndex: BigInt(123),
    endIndex: BigInt(123),
    base: 10,
    nbDigits: 3,
    expected: [[1, 2, 3]],
  },
  {
    startIndex: BigInt(171),
    endIndex: BigInt(210),
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
    startIndex: BigInt(73899),
    endIndex: BigInt(73938),
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
    startIndex: BigInt(1234),
    endIndex: BigInt(4321),
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
    startIndex: BigInt(1201234),
    endIndex: BigInt(1204321),
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
    startIndex: BigInt(2200),
    endIndex: BigInt(4999),
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
    startIndex: BigInt(0),
    endIndex: BigInt(99),
    base: 10,
    nbDigits: 2,
    expected: [[0], [1], [2], [3], [4], [5], [6], [7], [8], [9]],
  },
  {
    startIndex: BigInt(100),
    endIndex: BigInt(199),
    base: 10,
    nbDigits: 3,
    expected: [[1]],
  },
  {
    startIndex: BigInt(100),
    endIndex: BigInt(200),
    base: 10,
    nbDigits: 3,
    expected: [[1], [2, 0, 0]],
  },
  {
    startIndex: BigInt(11),
    endIndex: BigInt(18),
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
    startIndex: BigInt(11),
    endIndex: BigInt(23),
    base: 2,
    nbDigits: 5,
    expected: [
      [0, 1, 0, 1, 1],
      [0, 1, 1],
      [1, 0],
    ],
  },
  {
    startIndex: BigInt(5677),
    endIndex: BigInt(8621),
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
          beginInterval: BigInt(0),
          roundingMod: BigInt(10),
        },
      ];

      const totalCollateral = BigInt(100);
      const from = BigInt(0);
      const to = BigInt(999999);
      const fromPayout = totalCollateral;
      const toPayout = BigInt(0);

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
        { payout: BigInt(100), indexFrom: BigInt(0), indexTo: BigInt(5263) },
        { payout: BigInt(90), indexFrom: BigInt(5264), indexTo: BigInt(5882) },
        { payout: BigInt(80), indexFrom: BigInt(5883), indexTo: BigInt(6666) },
        { payout: BigInt(70), indexFrom: BigInt(6667), indexTo: BigInt(7692) },
        { payout: BigInt(60), indexFrom: BigInt(7693), indexTo: BigInt(9090) },
        { payout: BigInt(50), indexFrom: BigInt(9091), indexTo: BigInt(11111) },
        {
          payout: BigInt(40),
          indexFrom: BigInt(11112),
          indexTo: BigInt(14285),
        },
        {
          payout: BigInt(30),
          indexFrom: BigInt(14286),
          indexTo: BigInt(20000),
        },
        {
          payout: BigInt(20),
          indexFrom: BigInt(20001),
          indexTo: BigInt(33333),
        },
        {
          payout: BigInt(10),
          indexFrom: BigInt(33334),
          indexTo: BigInt(100000),
        },
        {
          payout: BigInt(0),
          indexFrom: BigInt(100001),
          indexTo: BigInt(999999),
        },
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
            : BigInt(1);

        const roundedPayout = BigIntMath.clamp(
          BigInt(0),
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
            : BigInt(1);

        const roundedPayout = BigIntMath.clamp(
          BigInt(0),
          roundPayout(payout, rounding),
          totalCollateral,
        );
        expect(roundedPayout).to.eq(range.payout);
      });
    });

    it('should properly split and round with non-even rounding mod', () => {
      const roundingIntervals: RoundingInterval[] = [
        {
          beginInterval: BigInt(0),
          roundingMod: BigInt(15),
        },
      ];

      const reversedIntervals = [...roundingIntervals].reverse();

      const totalCollateral = BigInt(100);
      const from = BigInt(0);
      const to = BigInt(999999);
      const fromPayout = totalCollateral;
      const toPayout = BigInt(0);

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
        { payout: BigInt(100), indexFrom: BigInt(0), indexTo: BigInt(5128) },
        { payout: BigInt(90), indexFrom: BigInt(5129), indexTo: BigInt(6060) },
        { payout: BigInt(75), indexFrom: BigInt(6061), indexTo: BigInt(7407) },
        { payout: BigInt(60), indexFrom: BigInt(7408), indexTo: BigInt(9523) },
        { payout: BigInt(45), indexFrom: BigInt(9524), indexTo: BigInt(13333) },
        {
          payout: BigInt(30),
          indexFrom: BigInt(13334),
          indexTo: BigInt(22222),
        },
        {
          payout: BigInt(15),
          indexFrom: BigInt(22223),
          indexTo: BigInt(66666),
        },
        {
          payout: BigInt(0),
          indexFrom: BigInt(66667),
          indexTo: BigInt(999999),
        },
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
            : BigInt(1);

        const roundedPayout = BigIntMath.clamp(
          BigInt(0),
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
            : BigInt(1);

        const roundedPayout = BigIntMath.clamp(
          BigInt(0),
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
          beginInterval: BigInt(0),
          roundingMod: BigInt(10),
        },
      ];
      const reversedIntervals = [...roundingIntervals].reverse();

      const totalCollateral = BigInt(100);
      const from = BigInt(0);
      const to = BigInt(999999);
      const fromPayout = BigInt(0);
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
        { payout: BigInt(0), indexFrom: BigInt(0), indexTo: BigInt(5263) },
        { payout: BigInt(10), indexFrom: BigInt(5264), indexTo: BigInt(5882) },
        { payout: BigInt(20), indexFrom: BigInt(5883), indexTo: BigInt(6666) },
        { payout: BigInt(30), indexFrom: BigInt(6667), indexTo: BigInt(7692) },
        { payout: BigInt(40), indexFrom: BigInt(7693), indexTo: BigInt(9090) },
        { payout: BigInt(50), indexFrom: BigInt(9091), indexTo: BigInt(11111) },
        {
          payout: BigInt(60),
          indexFrom: BigInt(11112),
          indexTo: BigInt(14285),
        },
        {
          payout: BigInt(70),
          indexFrom: BigInt(14286),
          indexTo: BigInt(19999),
        },
        {
          payout: BigInt(80),
          indexFrom: BigInt(20000),
          indexTo: BigInt(33333),
        },
        {
          payout: BigInt(90),
          indexFrom: BigInt(33334),
          indexTo: BigInt(99999),
        },
        {
          payout: BigInt(100),
          indexFrom: BigInt(100000),
          indexTo: BigInt(999999),
        },
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
            : BigInt(1);

        const roundedPayout = BigIntMath.clamp(
          BigInt(0),
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
            : BigInt(1);

        const roundedPayout = BigIntMath.clamp(
          BigInt(0),
          roundPayout(payout, rounding),
          totalCollateral,
        );
        expect(roundedPayout).to.eq(range.payout);
      });
    });

    it('should properly split and round with multiple rounding intervals', () => {
      const roundingIntervals: RoundingInterval[] = [
        {
          beginInterval: BigInt(0),
          roundingMod: BigInt(7),
        },
        { beginInterval: BigInt(5432), roundingMod: BigInt(12) },
        { beginInterval: BigInt(6432), roundingMod: BigInt(25) },
      ];
      const reversedIntervals = [...roundingIntervals].reverse();

      const totalCollateral = BigInt(100);
      const from = BigInt(0);
      const to = BigInt(999999);
      const fromPayout = BigInt(0);
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
        { payout: BigInt(0), indexFrom: BigInt(0), indexTo: BigInt(5181) },
        { payout: BigInt(7), indexFrom: BigInt(5182), indexTo: BigInt(5431) },
        { payout: BigInt(12), indexFrom: BigInt(5432), indexTo: BigInt(6097) },
        { payout: BigInt(24), indexFrom: BigInt(6098), indexTo: BigInt(6431) },
        { payout: BigInt(25), indexFrom: BigInt(6432), indexTo: BigInt(7999) },
        { payout: BigInt(50), indexFrom: BigInt(8000), indexTo: BigInt(13333) },
        {
          payout: BigInt(75),
          indexFrom: BigInt(13334),
          indexTo: BigInt(39999),
        },
        {
          payout: BigInt(100),
          indexFrom: BigInt(40000),
          indexTo: BigInt(999999),
        },
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
            : BigInt(1);

        const roundedPayout = BigIntMath.clamp(
          BigInt(0),
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
            : BigInt(1);

        const roundedPayout = BigIntMath.clamp(
          BigInt(0),
          roundPayout(payout, rounding),
          totalCollateral,
        );
        expect(roundedPayout).to.eq(range.payout);
      });
    });

    it('should properly split and round with non-even rounding mod', () => {
      const roundingIntervals: RoundingInterval[] = [
        {
          beginInterval: BigInt(0),
          roundingMod: BigInt(15),
        },
      ];
      const reversedIntervals = [...roundingIntervals].reverse();

      const totalCollateral = BigInt(100);
      const from = BigInt(0);
      const to = BigInt(999999);
      const fromPayout = BigInt(0);
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
        { payout: BigInt(0), indexFrom: BigInt(0), indexTo: BigInt(5405) },
        { payout: BigInt(15), indexFrom: BigInt(5406), indexTo: BigInt(6451) },
        { payout: BigInt(30), indexFrom: BigInt(6452), indexTo: BigInt(7999) },
        { payout: BigInt(45), indexFrom: BigInt(8000), indexTo: BigInt(10526) },
        {
          payout: BigInt(60),
          indexFrom: BigInt(10527),
          indexTo: BigInt(15384),
        },
        {
          payout: BigInt(75),
          indexFrom: BigInt(15385),
          indexTo: BigInt(28571),
        },
        {
          payout: BigInt(90),
          indexFrom: BigInt(28572),
          indexTo: BigInt(199999),
        },
        {
          payout: BigInt(100),
          indexFrom: BigInt(200000),
          indexTo: BigInt(999999),
        },
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
            : BigInt(1);

        const roundedPayout = BigIntMath.clamp(
          BigInt(0),
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
            : BigInt(1);

        const roundedPayout = BigIntMath.clamp(
          BigInt(0),
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
          beginInterval: BigInt(0),
          roundingMod: BigInt(100000),
        },
      ];
      const reversedIntervals = [...roundingIntervals].reverse();

      const totalCollateral = BigInt(100000000);
      const from = BigInt(0);
      const to = BigInt(999999);
      const fromPayout = totalCollateral;
      const toPayout = BigInt(0);

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
            : BigInt(1);

        const roundedPayout = BigIntMath.clamp(
          BigInt(0),
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
            : BigInt(1);

        const roundedPayout = BigIntMath.clamp(
          BigInt(0),
          roundPayout(payout, rounding),
          totalCollateral,
        );

        expect(roundedPayout).to.eq(range.payout);
      });
    });

    it('should properly split and round with non-even rounding mod', () => {
      const roundingIntervals: RoundingInterval[] = [
        {
          beginInterval: BigInt(0),
          roundingMod: BigInt(150000),
        },
      ];
      const reversedIntervals = [...roundingIntervals].reverse();

      const totalCollateral = BigInt(100000000);
      const from = BigInt(0);
      const to = BigInt(999999);
      const fromPayout = totalCollateral;
      const toPayout = BigInt(0);

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
            : BigInt(1);

        const roundedPayout = BigIntMath.clamp(
          BigInt(0),
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
            : BigInt(1);

        const roundedPayout = BigIntMath.clamp(
          BigInt(0),
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
          beginInterval: BigInt(0),
          roundingMod: BigInt(250000),
        },
      ];
      const reversedIntervals = [...roundingIntervals].reverse();

      const totalCollateral = BigInt(92499992);
      const from = BigInt(0);
      const to = BigInt(999999);
      const fromPayout = totalCollateral;
      const toPayout = BigInt(0);

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
            : BigInt(1);

        const roundedPayout = BigIntMath.clamp(
          BigInt(0),
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
            : BigInt(1);

        const roundedPayout = BigIntMath.clamp(
          BigInt(0),
          roundPayout(payout, rounding),
          totalCollateral,
        );
        expect(roundedPayout).to.eq(range.payout);
      });
    });
  });
});
