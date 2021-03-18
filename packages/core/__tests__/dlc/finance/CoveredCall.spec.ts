import { PayoutFunctionV1 } from '@node-dlc/messaging';
import { expect } from 'chai';
import CoveredCall from '../../../lib/dlc/finance/CoveredCall';
import { HyperbolaPayoutCurve } from '../../../lib/dlc/HyperbolaPayoutCurve';

describe('CoveredCall', () => {
  describe('1BTC-50k-base2-20digit curve', () => {
    const strikePrice = 50000n;
    const contractSize = 10n ** 8n;
    const oracleBase = 2;
    const oracleDigits = 20;

    const curve = CoveredCall.buildCurve(
      strikePrice,
      contractSize,
      oracleBase,
      oracleDigits,
    );

    it('should be a negative payout past max outcome', () => {
      const maxOutcome = 2n ** 20n - 1n;
      expect(curve.getPayout(maxOutcome + 1n).toNumber()).to.be.lessThan(0);
    });

    it('should serialize and deserialize properly', () => {
      const payout = curve.getPayout(strikePrice);

      const _tlv = curve.toPayoutFunction().serialize();
      const pf = PayoutFunctionV1.deserialize(_tlv);

      const deserializedCurve = HyperbolaPayoutCurve.fromPayoutFunction(pf);

      expect(payout.toNumber()).to.be.eq(
        deserializedCurve.getPayout(strikePrice).toNumber(),
      );
    });
  });
});
