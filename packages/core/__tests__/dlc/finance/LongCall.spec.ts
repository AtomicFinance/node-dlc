import { HyperbolaPayoutCurvePiece } from '@node-dlc/messaging';
import { expect } from 'chai';

import { LongCall } from '../../../lib/dlc/finance/LongCall';
import { HyperbolaPayoutCurve } from '../../../lib/dlc/HyperbolaPayoutCurve';

describe('LongCall', () => {
  describe('1BTC-50k-base2-18digit curve', () => {
    const strikePrice = BigInt(50000);
    const contractSize = BigInt(10) ** BigInt(8);
    const oracleBase = 2;
    const oracleDigits = 18;

    const { payoutCurve } = LongCall.buildCurve(
      strikePrice,
      contractSize,
      oracleBase,
      oracleDigits,
    );

    describe('payout', () => {
      const priceIncrease = BigInt(1000);

      it('should be positive as the position goes ITM', () => {
        expect(
          payoutCurve
            .getPayout(strikePrice + priceIncrease)
            .integerValue()
            .toNumber(),
        ).to.equal(
          Number(
            (contractSize * priceIncrease) / (strikePrice + priceIncrease),
          ),
        );
      });

      it('should be zero at strike price', () => {
        expect(payoutCurve.getPayout(strikePrice).toNumber()).to.equal(0);
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
