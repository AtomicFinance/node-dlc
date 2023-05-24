import { expect } from 'chai';

import { RoundingIntervals } from '../../lib';

describe('RoundingIntervals', () => {
  describe('serialize', () => {
    it('serializes', () => {
      const instance = new RoundingIntervals();

      const intervals = [
        { beginInterval: 1n, roundingMod: 2n },
        { beginInterval: 3n, roundingMod: 4n },
      ];
      instance.intervals = intervals;

      expect(instance.serialize().toString("hex")).to.equal(
        '02' + // array_length
        '0000000000000001' + // begin_interval
        '0000000000000002' + // rounding_mod
        '0000000000000003' + // begin_interval
        '0000000000000004'   // rounding_mod
      ); // prettier-ignore
    });
  });

  describe('deserialize', () => {
    it('deserializes', () => {
      const buf =  Buffer.from(
        '02' + // array_length
        '0000000000000001' + // begin_interval
        '0000000000000002' + // rounding_mod
        '0000000000000003' + // begin_interval
        '0000000000000004'   // rounding_mod
      , 'hex'); // prettier-ignore

      const instance = RoundingIntervals.deserialize(buf);

      expect(instance.intervals[0].beginInterval).to.eq(1n);
      expect(instance.intervals[0].roundingMod).to.eq(2n);
      expect(instance.intervals[1].beginInterval).to.eq(3n);
      expect(instance.intervals[1].roundingMod).to.eq(4n);
    });
  });

  describe('validate', () => {
    const instance = new RoundingIntervals();

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
