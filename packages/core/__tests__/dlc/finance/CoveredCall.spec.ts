import { HyperbolaPayoutCurvePiece } from '@node-dlc/messaging';
import { expect } from 'chai';

import { CoveredCall } from '../../../lib/dlc/finance/CoveredCall';
import { HyperbolaPayoutCurve } from '../../../lib/dlc/HyperbolaPayoutCurve';

describe('CoveredCall', () => {
  describe('1BTC-50k-base2-20digit curve', () => {
    const strikePrice = BigInt(50000);
    const contractSize = BigInt(10) ** BigInt(8);
    const oracleBase = 2;
    const oracleDigits = 20;

    const { maxOutcome, totalCollateral, payoutCurve } = CoveredCall.buildCurve(
      strikePrice,
      contractSize,
      oracleBase,
      oracleDigits,
    );

    it('should be a negative payout past max outcome', () => {
      expect(
        payoutCurve.getPayout(maxOutcome + BigInt(1)).toNumber(),
      ).to.be.lessThan(0);
    });

    it('should be equal to totalCollateral at strike price', () => {
      expect(payoutCurve.getPayout(strikePrice).toNumber()).to.equal(
        Number(totalCollateral),
      );
    });

    it('should serialize and deserialize properly', () => {
      const payout = payoutCurve.getPayout(strikePrice);

      const _tlv = payoutCurve.toPayoutCurvePiece().serialize();
      const pf = HyperbolaPayoutCurvePiece.deserialize(_tlv);

      const deserializedCurve = HyperbolaPayoutCurve.fromPayoutCurvePiece(pf);

      expect(payout.toNumber()).to.be.eq(
        deserializedCurve.getPayout(strikePrice).toNumber(),
      );
    });
  });
});
