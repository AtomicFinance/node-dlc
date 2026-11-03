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
  describe('acceptPayoutScriptLen', () => {
    const p2wpkh = Buffer.alloc(22);
    const inputs = () => [fundingInputWithWitnessLen(DEFAULT_MAX_WITNESS_LEN)];
    const finalizer = (acceptPayoutScriptLen?: number) =>
      new DualFundingTxFinalizer(
        inputs(),
        p2wpkh,
        p2wpkh,
        inputs(),
        p2wpkh,
        p2wpkh,
        BigInt(2),
        1,
        acceptPayoutScriptLen,
      );

    it('prices the accepter CET output at the given length', () => {
      // ceil((249 + 4 * 34) / 4) = 97 vbytes, against 85 for P2WPKH.
      expect(finalizer(34).acceptFutureFee).to.equal(BigInt(97 * 2));
      expect(finalizer().acceptFutureFee).to.equal(BigInt(85 * 2));
      expect(finalizer(34).offerFutureFee).to.equal(finalizer().offerFutureFee);
    });

    it('has the offerer reserve the extra bytes when the accepter funds nothing', () => {
      const singleFunded = (acceptPayoutScriptLen?: number) =>
        new DualFundingTxFinalizer(
          inputs(),
          p2wpkh,
          p2wpkh,
          [],
          p2wpkh,
          p2wpkh,
          BigInt(2),
          1,
          acceptPayoutScriptLen,
        );

      // ceil((249 + 4 * (22 + 12)) / 4) = 97 vbytes, against 85 without.
      expect(singleFunded().offerFutureFee).to.equal(BigInt(85 * 2));
      expect(singleFunded(34).offerFutureFee).to.equal(BigInt(97 * 2));
      expect(singleFunded(34).acceptFees).to.equal(BigInt(0));
    });

    it('rejects a length shorter than the accept payout script', () => {
      expect(() => finalizer(21)).to.throw(/at least/);
    });
  });
});
