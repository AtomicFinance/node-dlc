import { expect } from 'chai';

import {
  DEFAULT_MAX_WITNESS_LEN,
  DualFundingTxFinalizer,
  fundingInputWithWitnessLen,
  getFinalizerByCount,
  getMaxWitnessLen,
} from '../../lib';

describe('TxFinalizer', () => {
  describe('getFinalizerByCount', () => {
    it('should default synthetic inputs to p2wpkh witness length', () => {
      const defaultFinalizer = getFinalizerByCount(BigInt(1), 1, 1, 1);
      const explicitFinalizer = getFinalizerByCount(
        BigInt(1),
        1,
        1,
        1,
        DEFAULT_MAX_WITNESS_LEN,
        DEFAULT_MAX_WITNESS_LEN,
      );

      expect(defaultFinalizer.offerFundingFee).to.equal(
        explicitFinalizer.offerFundingFee,
      );
    });

    it('should calculate lower funding fees for p2tr synthetic inputs', () => {
      const feeRate = BigInt(10);
      const p2wpkhFinalizer = getFinalizerByCount(feeRate, 1, 1, 1);
      const p2trFinalizer = getFinalizerByCount(
        feeRate,
        1,
        1,
        1,
        getMaxWitnessLen('p2tr'),
        getMaxWitnessLen('p2tr'),
      );

      expect(
        p2trFinalizer.offerFundingFee < p2wpkhFinalizer.offerFundingFee,
      ).to.equal(true);
      expect(
        p2trFinalizer.acceptFundingFee < p2wpkhFinalizer.acceptFundingFee,
      ).to.equal(true);
    });

    it('should reject mismatched witness length arrays', () => {
      expect(() =>
        getFinalizerByCount(BigInt(1), 2, 1, 1, [getMaxWitnessLen('p2tr')]),
      ).to.throw('Expected 2 witness lengths, got 1');
    });
  });
  describe('acceptOverrideExtraLen', () => {
    const p2wpkh = Buffer.alloc(22);
    const inputs = () => [fundingInputWithWitnessLen(DEFAULT_MAX_WITNESS_LEN)];
    const finalizer = (acceptFunds: boolean, extraLen?: number) =>
      new DualFundingTxFinalizer(
        inputs(),
        p2wpkh,
        p2wpkh,
        acceptFunds ? inputs() : [],
        p2wpkh,
        p2wpkh,
        BigInt(2),
        1,
        extraLen,
      );

    it('has the accepter pay for the extra bytes when it funds', () => {
      // A 34-byte override for a 22-byte accept script: 12 extra vbytes,
      // ceil((249 + 4 * 34) / 4) = 97 against 85.
      expect(finalizer(true).acceptFutureFee).to.equal(BigInt(85 * 2));
      expect(finalizer(true, 12).acceptFutureFee).to.equal(BigInt(97 * 2));
      expect(finalizer(true, 12).offerFutureFee).to.equal(
        finalizer(true).offerFutureFee,
      );
    });

    it('has the offerer pay for them when the accepter funds nothing', () => {
      expect(finalizer(false, 12).offerFutureFee).to.equal(
        finalizer(false).offerFutureFee + BigInt(12 * 2),
      );
      expect(finalizer(false, 12).acceptFees).to.equal(BigInt(0));
    });

    it('rejects a negative or fractional length', () => {
      expect(() => finalizer(true, -1)).to.throw(/non-negative integer/);
      expect(() => finalizer(true, 1.5)).to.throw(/non-negative integer/);
    });
  });
});
