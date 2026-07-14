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

      expect(p2trFinalizer.offerFundingFee).to.be.lessThan(
        p2wpkhFinalizer.offerFundingFee,
      );
      expect(p2trFinalizer.acceptFundingFee).to.be.lessThan(
        p2wpkhFinalizer.acceptFundingFee,
      );
    });
  });
});
