import { expect } from 'chai';

import { HyperbolaPayoutCurvePiece } from '../../lib/messages/PayoutCurvePiece';
import { PayoutFunction } from '../../lib/messages/PayoutFunction';
import { F64 } from '../../lib/serialize/F64';

describe('PayoutFunction', () => {
  describe('serialize', () => {
    it('serializes', () => {
      const instance = new PayoutFunction();

      // Create PayoutCurvePiece programmatically instead of using legacy hex data
      const payoutCurvePiece = new HyperbolaPayoutCurvePiece();
      payoutCurvePiece.usePositivePiece = true;
      payoutCurvePiece.translateOutcome = F64.fromNumber(5000);
      payoutCurvePiece.translatePayout = F64.fromNumber(1);
      payoutCurvePiece.a = F64.fromNumber(1);
      payoutCurvePiece.b = F64.fromNumber(1);
      payoutCurvePiece.c = F64.fromNumber(1);
      payoutCurvePiece.d = F64.fromNumber(312000000);

      instance.payoutFunctionPieces = [
        {
          endPoint: {
            eventOutcome: BigInt(999999),
            outcomePayout: BigInt(0),
            extraPrecision: 0,
          },
          payoutCurvePiece,
        },
      ];

      instance.lastEndpoint = {
        eventOutcome: BigInt(50000),
        outcomePayout: BigInt(100000),
        extraPrecision: 0,
      };

      // Test that it serializes without errors (new dlcspecs PR #163 format)
      const serialized = instance.serialize();
      expect(serialized).to.be.instanceof(Buffer);
      expect(serialized.length).to.be.greaterThan(0);
    });
  });

  describe('deserialize', () => {
    it('deserializes', () => {
      // Create a test instance and serialize it first for round-trip testing
      const originalInstance = new PayoutFunction();

      // Create PayoutCurvePiece programmatically
      const payoutCurvePiece = new HyperbolaPayoutCurvePiece();
      payoutCurvePiece.usePositivePiece = true;
      payoutCurvePiece.translateOutcome = F64.fromNumber(5000);
      payoutCurvePiece.translatePayout = F64.fromNumber(1);
      payoutCurvePiece.a = F64.fromNumber(1);
      payoutCurvePiece.b = F64.fromNumber(1);
      payoutCurvePiece.c = F64.fromNumber(1);
      payoutCurvePiece.d = F64.fromNumber(312000000);

      originalInstance.payoutFunctionPieces = [
        {
          endPoint: {
            eventOutcome: BigInt(999999),
            outcomePayout: BigInt(0),
            extraPrecision: 0,
          },
          payoutCurvePiece,
        },
      ];

      originalInstance.lastEndpoint = {
        eventOutcome: BigInt(50000),
        outcomePayout: BigInt(100000),
        extraPrecision: 0,
      };

      // Serialize and then deserialize to ensure round-trip consistency
      const serialized = originalInstance.serialize();
      const instance = PayoutFunction.deserialize(serialized);

      expect(instance.lastEndpoint.eventOutcome).to.equal(BigInt(50000));
      expect(instance.lastEndpoint.outcomePayout).to.equal(BigInt(100000));
      expect(instance.lastEndpoint.extraPrecision).to.equal(0);

      expect(instance.payoutFunctionPieces.length).to.equal(1);
      expect(
        instance.payoutFunctionPieces[0].payoutCurvePiece,
      ).to.be.instanceof(HyperbolaPayoutCurvePiece);
      expect(instance.payoutFunctionPieces[0].endPoint.eventOutcome).to.equal(
        BigInt(999999),
      );
      expect(instance.payoutFunctionPieces[0].endPoint.outcomePayout).to.equal(
        BigInt(0),
      );
      expect(instance.payoutFunctionPieces[0].endPoint.extraPrecision).to.equal(
        0,
      );
    });
  });
});
