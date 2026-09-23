import { expect } from 'chai';

import {
  DEFAULT_MAX_WITNESS_LEN,
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

  describe('single-funded', () => {
    const feeRate = BigInt(10);

    it('should charge the sole funder full fund tx and CET base weights (matches ddk-dlc)', () => {
      const finalizer = getFinalizerByCount(feeRate, 1, 0, 1);
      // fund: 214 base + 272 p2wpkh input + 88 change spk + 36 = 610 wu -> 153 vB
      expect(finalizer.offerFundingFee).to.equal(BigInt(1530));
      // cet: 500 base + 88 payout spk = 588 wu -> 147 vB
      expect(finalizer.offerFutureFee).to.equal(BigInt(1470));
      expect(finalizer.offerFees).to.equal(BigInt(3000));
      expect(finalizer.acceptFees).to.equal(BigInt(0));
    });

    it('should be symmetric when the accepter is the sole funder', () => {
      const finalizer = getFinalizerByCount(feeRate, 0, 1, 1);
      expect(finalizer.acceptFees).to.equal(BigInt(3000));
      expect(finalizer.offerFees).to.equal(BigInt(0));
    });

    it('should keep the half split for dual-funded contracts', () => {
      const finalizer = getFinalizerByCount(feeRate, 1, 1, 1);
      // fund: 107 half base + 272 + 88 + 36 = 503 wu -> 126 vB
      expect(finalizer.offerFundingFee).to.equal(BigInt(1260));
      // cet: 249 half base + 88 = 337 wu -> 85 vB
      expect(finalizer.offerFutureFee).to.equal(BigInt(850));
    });
  });
});
