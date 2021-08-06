import { HyperbolaPayoutCurvePiece } from '@node-dlc/messaging';
import { expect } from 'chai';

import { ShortPut } from '../../../lib/dlc/finance/ShortPut';
import { HyperbolaPayoutCurve } from '../../../lib/dlc/HyperbolaPayoutCurve';

describe('ShortPut', () => {
  describe('1BTC-50k-base2-20digit curve', () => {
    const strikePrice = BigInt(50000);
    const contractSize = BigInt(10) ** BigInt(8);
    const oracleBase = 2;
    const oracleDigits = 20;

    const { totalCollateral, payoutCurve } = ShortPut.buildCurve(
      strikePrice,
      contractSize,
      oracleBase,
      oracleDigits,
    );

    describe.only('payout', () => {
      it('should be zero at half of strike price', () => {
        expect(
          payoutCurve.getPayout(strikePrice / BigInt(2)).toNumber(),
        ).to.be.equal(0);
      });

      it('should be correct at $30,000 settlement price', () => {
        const settlementPrice = BigInt(30000);

        expect(payoutCurve.getPayout(settlementPrice).toFixed(3)).to.be.eq(
          (
            2 * Number(contractSize) -
            (Number(contractSize) * Number(strikePrice)) /
              Number(settlementPrice)
          ).toFixed(3),
        );
      });

      it('should be equal to totalCollateral at strike price', () => {
        expect(payoutCurve.getPayout(strikePrice).toNumber()).to.equal(
          Number(totalCollateral),
        );
      });
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
