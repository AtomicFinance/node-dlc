import { expect } from 'chai';

import { RoundingIntervalsV0 } from '../../lib';

describe('RoundingIntervalsV0', () => {
  describe('serialize', () => {
    it('serializes', () => {
      const instance = new RoundingIntervalsV0();

      const intervals = [
        { beginInterval: 1n, roundingMod: 2n },
        { beginInterval: 3n, roundingMod: 4n },
      ];
      instance.intervals = intervals;

      expect(instance.serialize().toString("hex")).to.equal(
        '02' + // number of intervals (bigsize)
        '0000000000000001' + // begin_interval (u64)
        '0000000000000002' + // rounding_mod (u64)
        '0000000000000003' + // begin_interval (u64)
        '0000000000000004'   // rounding_mod (u64)
      ); // prettier-ignore
    });
  });

  describe('deserialize', () => {
    it('deserializes', () => {
      const buf = Buffer.from(
        '02' + // number of intervals (bigsize)
        '0000000000000001' + // begin_interval (u64)
        '0000000000000002' + // rounding_mod (u64)
        '0000000000000003' + // begin_interval (u64)
        '0000000000000004'   // rounding_mod (u64)
      , 'hex'); // prettier-ignore

      const instance = RoundingIntervalsV0.deserialize(buf);

      expect(instance.intervals.length).to.eq(2); // Check number of intervals instead of instance.length
      expect(instance.intervals[0].beginInterval).to.eq(1n);
      expect(instance.intervals[0].roundingMod).to.eq(2n);
      expect(instance.intervals[1].beginInterval).to.eq(3n);
      expect(instance.intervals[1].roundingMod).to.eq(4n);
    });
  });

  describe('validate', () => {
    const instance = new RoundingIntervalsV0();

    beforeEach(() => {
      const intervals = [
        { beginInterval: 1n, roundingMod: 2n },
        { beginInterval: 3n, roundingMod: 4n },
      ];
      instance.intervals = intervals;
    });

    it('should not throw error', () => {
      expect(() => instance.validate()).to.not.throw();
    });

    it('should throw error if negative intervals', () => {
      instance.intervals[0].beginInterval = -1n;
      expect(() => instance.validate()).to.throw(
        'beginInterval must be non-negative',
      );
    });

    it('should throw error if non-increasing intervals', () => {
      instance.intervals[1].beginInterval = 0n;
      expect(() => instance.validate()).to.throw(
        'Intervals must be strictly increasing',
      );
    });
  });
});
