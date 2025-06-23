import { F64 } from '@node-dlc/bufio';
import { expect } from 'chai';

import {
  HyperbolaPayoutCurvePiece,
  PayoutCurvePiece,
  PolynomialPayoutCurvePiece,
} from '../../lib/messages/PayoutCurvePiece';

describe('PayoutCurvePiece', () => {
  describe('PolynomialPayoutCurvePiece', () => {
    it('serializes and deserializes correctly', () => {
      const instance = new PolynomialPayoutCurvePiece();

      instance.points = [
        {
          eventOutcome: BigInt(0),
          outcomePayout: BigInt(0),
          extraPrecision: 0,
        },
        {
          eventOutcome: BigInt(1),
          outcomePayout: BigInt(1),
          extraPrecision: 0,
        },
      ];

      // Test that it serializes without errors (new dlcspecs PR #163 format)
      const serialized = instance.serialize();
      expect(serialized).to.be.instanceof(Buffer);
      expect(serialized.length).to.be.greaterThan(0);

      // Test round-trip serialization
      const deserialized = PayoutCurvePiece.deserialize(
        serialized,
      ) as PolynomialPayoutCurvePiece;
      expect(deserialized).to.be.instanceof(PolynomialPayoutCurvePiece);
      expect(deserialized.points.length).to.equal(2);
      expect(deserialized.points[0].eventOutcome).to.equal(BigInt(0));
      expect(deserialized.points[0].outcomePayout).to.equal(BigInt(0));
      expect(deserialized.points[1].eventOutcome).to.equal(BigInt(1));
      expect(deserialized.points[1].outcomePayout).to.equal(BigInt(1));
    });

    it('handles large BigInt values correctly', () => {
      const instance = new PolynomialPayoutCurvePiece();
      const largeBigInt = BigInt('18446744073709551615'); // Max uint64

      instance.points = [
        {
          eventOutcome: largeBigInt,
          outcomePayout: largeBigInt,
          extraPrecision: 0,
        },
      ];

      const serialized = instance.serialize();
      const deserialized = PayoutCurvePiece.deserialize(
        serialized,
      ) as PolynomialPayoutCurvePiece;

      expect(deserialized.points[0].eventOutcome).to.equal(largeBigInt);
      expect(deserialized.points[0].outcomePayout).to.equal(largeBigInt);
    });
  });

  describe('HyperbolaPayoutCurvePiece', () => {
    it('serializes and deserializes correctly with normal values', () => {
      const instance = new HyperbolaPayoutCurvePiece();
      instance.usePositivePiece = true;
      instance.translateOutcome = F64.fromNumber(100.5);
      instance.translatePayout = F64.fromNumber(50.25);
      instance.a = F64.fromNumber(1.0);
      instance.b = F64.fromNumber(0.0);
      instance.c = F64.fromNumber(0.0);
      instance.d = F64.fromNumber(200.0);

      const serialized = instance.serialize();
      expect(serialized).to.be.instanceof(Buffer);
      expect(serialized.length).to.be.greaterThan(0);

      // Test round-trip
      const deserialized = PayoutCurvePiece.deserialize(
        serialized,
      ) as HyperbolaPayoutCurvePiece;
      expect(deserialized.usePositivePiece).to.equal(true);
      expect(deserialized.translateOutcome.toNumber()).to.equal(100.5);
    });

    it('handles very large f64 values without precision loss', () => {
      // Test values that exceed JavaScript MAX_SAFE_INTEGER
      const testCases = [
        {
          name: 'Large positive number',
          value: 1.7976931348623157e100, // Very large but valid f64
        },
        {
          name: 'Very small number',
          value: 5e-324, // Smallest positive denormalized f64
        },
        {
          name: 'Beyond safe integer',
          value: 9007199254740992, // MAX_SAFE_INTEGER + 1
        },
        {
          name: 'Scientific notation',
          value: 1.23456789e50,
        },
      ];

      testCases.forEach(({ value }) => {
        const instance = new HyperbolaPayoutCurvePiece();
        instance.usePositivePiece = false;
        instance.translateOutcome = F64.fromNumber(value);
        instance.translatePayout = F64.fromNumber(123.456);
        instance.a = F64.fromNumber(1.0);
        instance.b = F64.fromNumber(0.0);
        instance.c = F64.fromNumber(0.0);
        instance.d = F64.fromNumber(value * 2);

        // Test round-trip serialization preserves exact binary representation
        const serialized = instance.serialize();
        const deserialized = PayoutCurvePiece.deserialize(
          serialized,
        ) as HyperbolaPayoutCurvePiece;

        // The F64 should maintain exact binary representation
        expect(deserialized.translateOutcome.equals(instance.translateOutcome))
          .to.be.true;
        expect(deserialized.d.equals(instance.d)).to.be.true;
      });
    });

    it('handles JSON with string values (for very large numbers)', () => {
      // Test JSON with string values for large numbers
      const jsonWithStrings = {
        usePositivePiece: true,
        translateOutcome: '1.7976931348623157e+100', // String representation
        translatePayout: 50000.0, // Regular number
        a: '9007199254740992', // String for large integer
        b: 0.0,
        c: 0.0,
        d: 1.5,
      };

      const instance = HyperbolaPayoutCurvePiece.fromJSON(jsonWithStrings);

      // Should handle both string and number inputs correctly
      expect(instance.usePositivePiece).to.be.true;
      expect(instance.translateOutcome.toNumber()).to.equal(
        1.7976931348623157e100,
      );
      expect(instance.translatePayout.toNumber()).to.equal(50000.0);
      expect(instance.a.toNumber()).to.equal(9007199254740992);
    });

    it('JSON round-trip maintains values within JavaScript precision limits', () => {
      const instance = new HyperbolaPayoutCurvePiece();
      instance.usePositivePiece = true;
      instance.translateOutcome = F64.fromNumber(50000.5);
      instance.translatePayout = F64.fromNumber(25000.25);
      instance.a = F64.fromNumber(1.5);
      instance.b = F64.fromNumber(0.0);
      instance.c = F64.fromNumber(0.0);
      instance.d = F64.fromNumber(10000.0);

      // Test JSON round-trip
      const json = instance.toJSON();
      const restored = HyperbolaPayoutCurvePiece.fromJSON(
        json.hyperbolaPayoutCurvePiece,
      );

      expect(restored.usePositivePiece).to.equal(instance.usePositivePiece);
      expect(restored.translateOutcome.toNumber()).to.equal(
        instance.translateOutcome.toNumber(),
      );
      expect(restored.translatePayout.toNumber()).to.equal(
        instance.translatePayout.toNumber(),
      );
      expect(restored.a.toNumber()).to.equal(instance.a.toNumber());
      expect(restored.d.toNumber()).to.equal(instance.d.toNumber());
    });

    it('demonstrates precision limits with very large numbers in JSON', () => {
      // This test demonstrates the precision tradeoff we're making
      const veryLargeNumber = 1.2345678901234567e100;

      const instance = new HyperbolaPayoutCurvePiece();
      instance.usePositivePiece = false;
      instance.translateOutcome = F64.fromNumber(veryLargeNumber);
      instance.translatePayout = F64.fromNumber(0);
      instance.a = F64.fromNumber(0);
      instance.b = F64.fromNumber(0);
      instance.c = F64.fromNumber(0);
      instance.d = F64.fromNumber(0);

      // Binary serialization preserves exact representation
      const binarySerialized = instance.serialize();
      const binaryDeserialized = PayoutCurvePiece.deserialize(
        binarySerialized,
      ) as HyperbolaPayoutCurvePiece;

      expect(
        binaryDeserialized.translateOutcome.equals(instance.translateOutcome),
      ).to.be.true;

      // JSON serialization may lose precision for very large numbers
      const json = instance.toJSON();
      const jsonRestored = HyperbolaPayoutCurvePiece.fromJSON(
        json.hyperbolaPayoutCurvePiece,
      );

      // This may not be exactly equal due to JSON number precision limits
      const jsonValue = jsonRestored.translateOutcome.toNumber();

      // The important thing is that both are very large numbers in the same ballpark
      expect(jsonValue).to.be.greaterThan(1e99);
    });
  });
});
