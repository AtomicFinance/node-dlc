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

    describe('payout', () => {
      it('should be a negative past max outcome', () => {
        expect(
          payoutCurve.getPayout(maxOutcome + BigInt(1)).toNumber(),
        ).to.be.lessThan(0);
      });

      it('should be equal to totalCollateral at strike price', () => {
        expect(payoutCurve.getPayout(strikePrice).toNumber()).to.equal(
          Number(totalCollateral),
        );
      });
    });

    describe('buildPayoutFunction', () => {
      it('should build payout function', () => {
        const {
          payoutFunction,
          totalCollateral,
        } = CoveredCall.buildPayoutFunction(4000n, 1000000n, 2, 17);

        // Test basic structure
        expect(payoutFunction).to.not.be.undefined;
        expect(totalCollateral).to.not.be.undefined;

        // Test payout function structure
        expect(payoutFunction.payoutFunctionPieces).to.have.length(1);
        expect(payoutFunction.lastEndpoint).to.not.be.undefined;

        // Test the payout function piece
        const piece = payoutFunction.payoutFunctionPieces[0];
        expect(piece.endPoint).to.not.be.undefined;
        expect(piece.payoutCurvePiece).to.not.be.undefined;

        // Test end point values - should be at maxOutcome (2^17 - 1 = 131071)
        const maxOutcome = BigInt(2 ** 17 - 1); // 131071
        expect(piece.endPoint.eventOutcome).to.equal(maxOutcome);
        expect(piece.endPoint.outcomePayout).to.equal(0n);
        expect(piece.endPoint.extraPrecision).to.equal(0);

        // Test last endpoint matches the piece endpoint
        expect(payoutFunction.lastEndpoint.eventOutcome).to.equal(maxOutcome);
        expect(payoutFunction.lastEndpoint.outcomePayout).to.equal(0n);
        expect(payoutFunction.lastEndpoint.extraPrecision).to.equal(0);

        // Test hyperbola curve piece properties
        const curvePiece = piece.payoutCurvePiece as HyperbolaPayoutCurvePiece;
        expect(curvePiece.usePositivePiece).to.equal(true);
        expect(curvePiece.leftEndPoint).to.not.be.undefined;
        expect(curvePiece.rightEndPoint).to.not.be.undefined;

        // Test left endpoint (start of curve)
        expect(curvePiece.leftEndPoint.eventOutcome).to.equal(0n);
        expect(curvePiece.leftEndPoint.outcomePayout).to.equal(totalCollateral);
        expect(curvePiece.leftEndPoint.extraPrecision).to.equal(0);

        // Test right endpoint (end of curve)
        expect(curvePiece.rightEndPoint.eventOutcome).to.equal(maxOutcome);
        expect(curvePiece.rightEndPoint.outcomePayout).to.equal(0n);
        expect(curvePiece.rightEndPoint.extraPrecision).to.equal(0);

        // Test hyperbola parameters
        expect(curvePiece.a.toNumber()).to.equal(1);
        expect(curvePiece.b.toNumber()).to.equal(0);
        expect(curvePiece.c.toNumber()).to.equal(0);
        expect(curvePiece.d.toNumber()).to.equal(4000000000); // strikePrice * contractSize
        expect(curvePiece.translateOutcome.toNumber()).to.equal(0);

        // Test total collateral is reasonable (should be less than contract size)
        expect(Number(totalCollateral)).to.be.greaterThan(0);
        expect(Number(totalCollateral)).to.be.lessThan(1000000); // less than contractSize

        // For a covered call with strike=4000, contractSize=1000000:
        // At maxOutcome, payout should be ~0, so most collateral is retained
        expect(Number(totalCollateral)).to.be.greaterThan(900000); // Should retain most collateral
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
