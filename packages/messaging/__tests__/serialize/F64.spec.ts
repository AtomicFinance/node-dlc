import { expect } from 'chai';

import { F64 } from '../../lib/serialize/F64';

describe('F64', () => {
  describe('Construction and basic operations', () => {
    it('should create F64 from number', () => {
      const f64 = F64.fromNumber(123.456);
      expect(f64.toNumber()).to.equal(123.456);
    });

    it('should create F64 from string', () => {
      const f64 = F64.fromString('123.456');
      expect(f64.toNumber()).to.equal(123.456);
    });

    it('should create F64 from bigint', () => {
      const f64 = F64.fromBigInt(BigInt(123456789));
      expect(f64.toNumber()).to.equal(123456789);
    });

    it('should create zero F64', () => {
      const f64 = F64.zero();
      expect(f64.toNumber()).to.equal(0);
      expect(f64.isZero()).to.be.true;
    });
  });

  describe('Large number handling', () => {
    it('should handle very large integers within safe range', () => {
      const largeNum = Number.MAX_SAFE_INTEGER; // 9,007,199,254,740,991
      const f64 = F64.fromNumber(largeNum);
      expect(f64.toNumber()).to.equal(largeNum);
    });

    it('should handle numbers beyond JavaScript safe integer range', () => {
      // This is beyond MAX_SAFE_INTEGER, where JavaScript loses precision
      const veryLargeNum = 9007199254740992; // MAX_SAFE_INTEGER + 1
      const f64 = F64.fromNumber(veryLargeNum);

      // The F64 should maintain the IEEE 754 representation
      expect(f64.toNumber()).to.equal(veryLargeNum);
    });

    it('should handle maximum finite f64 value', () => {
      const maxFinite = 1.7976931348623157e308;
      const f64 = F64.fromNumber(maxFinite);
      expect(f64.toNumber()).to.equal(maxFinite);
      expect(f64.isFinite()).to.be.true;
    });

    it('should handle minimum positive normal f64 value', () => {
      const minNormal = 2.2250738585072014e-308;
      const f64 = F64.fromNumber(minNormal);
      expect(f64.toNumber()).to.equal(minNormal);
    });

    it('should handle very small denormalized numbers', () => {
      const denormal = 5e-324; // Smallest positive denormalized number
      const f64 = F64.fromNumber(denormal);
      expect(f64.toNumber()).to.equal(denormal);
    });
  });

  describe('Special values', () => {
    it('should handle positive infinity', () => {
      const f64 = F64.fromNumber(Number.POSITIVE_INFINITY);
      expect(f64.isInfinite()).to.be.true;
      expect(f64.isFinite()).to.be.false;
      expect(f64.toNumber()).to.equal(Number.POSITIVE_INFINITY);
    });

    it('should handle negative infinity', () => {
      const f64 = F64.fromNumber(Number.NEGATIVE_INFINITY);
      expect(f64.isInfinite()).to.be.true;
      expect(f64.isFinite()).to.be.false;
      expect(f64.toNumber()).to.equal(Number.NEGATIVE_INFINITY);
    });

    it('should handle NaN', () => {
      const f64 = F64.fromNumber(Number.NaN);
      expect(f64.isNaN()).to.be.true;
      expect(f64.isFinite()).to.be.false;
      expect(Number.isNaN(f64.toNumber())).to.be.true;
    });

    it('should handle negative zero', () => {
      const f64 = F64.fromNumber(-0);
      expect(f64.toNumber()).to.equal(-0);
      expect(Object.is(f64.toNumber(), -0)).to.be.true;
    });
  });

  describe('Serialization and deserialization', () => {
    it('should serialize and deserialize correctly', () => {
      const original = 123.456789;
      const f64 = F64.fromNumber(original);
      const serialized = f64.serialize();
      const deserialized = F64.deserialize(serialized);

      expect(deserialized.toNumber()).to.equal(original);
      expect(deserialized.equals(f64)).to.be.true;
    });

    it('should maintain exact binary representation for large numbers', () => {
      const largeNum = 1.2345678901234567e100;
      const f64 = F64.fromNumber(largeNum);
      const serialized = f64.serialize();
      const deserialized = F64.deserialize(serialized);

      expect(deserialized.equals(f64)).to.be.true;
      expect(deserialized.toHex()).to.equal(f64.toHex());
    });

    it('should handle round-trip with buffer', () => {
      const testValues = [
        0,
        -0,
        1,
        -1,
        Math.PI,
        Math.E,
        Number.MAX_SAFE_INTEGER,
        Number.MIN_SAFE_INTEGER,
        1.7976931348623157e308, // MAX_VALUE
        2.2250738585072014e-308, // MIN_VALUE
      ];

      testValues.forEach((value) => {
        const f64 = F64.fromNumber(value);
        const buffer = f64.getBuffer();
        const restored = new F64(buffer);
        expect(restored.equals(f64)).to.be.true;
      });
    });
  });

  describe('Hex representation', () => {
    it('should convert to and from hex correctly', () => {
      const f64 = F64.fromNumber(123.456);
      const hex = f64.toHex();
      const restored = F64.fromHex(hex);

      expect(restored.equals(f64)).to.be.true;
      expect(hex).to.be.a('string');
      expect(hex.length).to.equal(16); // 8 bytes = 16 hex chars
    });

    it('should handle special values in hex', () => {
      const testValues = [
        { value: 0, expectedHex: '0000000000000000' },
        { value: 1, expectedHex: '3ff0000000000000' },
        { value: -1, expectedHex: 'bff0000000000000' },
        { value: Number.POSITIVE_INFINITY, expectedHex: '7ff0000000000000' },
        { value: Number.NEGATIVE_INFINITY, expectedHex: 'fff0000000000000' },
      ];

      testValues.forEach(({ value, expectedHex }) => {
        const f64 = F64.fromNumber(value);
        expect(f64.toHex()).to.equal(expectedHex);
      });
    });
  });

  describe('Comparison operations', () => {
    it('should compare F64 instances correctly', () => {
      const a = F64.fromNumber(123.456);
      const b = F64.fromNumber(123.456);
      const c = F64.fromNumber(123.457);

      expect(a.equals(b)).to.be.true;
      expect(a.equals(c)).to.be.false;
      expect(a.eq(123.456)).to.be.true;
      expect(a.eq(123.457)).to.be.false;
    });

    it('should handle greater than comparisons', () => {
      const a = F64.fromNumber(10);
      const b = F64.fromNumber(5);

      expect(a.gt(b)).to.be.true;
      expect(b.gt(a)).to.be.false;
      expect(a.gt(5)).to.be.true;
      expect(a.gt(15)).to.be.false;
    });

    it('should handle less than comparisons', () => {
      const a = F64.fromNumber(5);
      const b = F64.fromNumber(10);

      expect(a.lt(b)).to.be.true;
      expect(b.lt(a)).to.be.false;
      expect(a.lt(10)).to.be.true;
      expect(a.lt(3)).to.be.false;
    });
  });

  describe('Constants', () => {
    it('should provide correct constant values', () => {
      expect(F64.ZERO.toNumber()).to.equal(0);
      expect(F64.ONE.toNumber()).to.equal(1);
      expect(F64.NEGATIVE_ONE.toNumber()).to.equal(-1);
      expect(F64.INFINITY.isInfinite()).to.be.true;
      expect(F64.NEGATIVE_INFINITY.isInfinite()).to.be.true;
      expect(F64.NaN.isNaN()).to.be.true;
    });
  });

  describe('Precision test cases for DLC usage', () => {
    it('should handle typical DLC payout curve parameters', () => {
      // These are typical values that might appear in DLC payout curves
      const testValues = [
        1000000.0, // 1 million
        50000.0, // Strike price
        0.00000001, // Very small precision
        1.7976931348623157e100, // Very large number
        -50000.0, // Negative strike
        0.0, // Zero
        Math.PI * 1000000, // Irrational number scaled up
      ];

      testValues.forEach((value) => {
        const f64 = F64.fromNumber(value);
        const serialized = f64.serialize();
        const deserialized = F64.deserialize(serialized);

        expect(deserialized.equals(f64)).to.be.true;
        expect(deserialized.toNumber()).to.equal(value);
      });
    });

    it('should handle edge cases for financial calculations', () => {
      // Test satoshi-level precision scaled to different units
      const satoshi = 0.00000001; // 1 satoshi in BTC
      const f64 = F64.fromNumber(satoshi);

      expect(f64.toNumber()).to.equal(satoshi);
      expect(f64.serialize().length).to.equal(8);
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid buffer size', () => {
      expect(() => new F64(Buffer.alloc(4))).to.throw(
        'F64 buffer must be exactly 8 bytes',
      );
      expect(() => new F64(Buffer.alloc(10))).to.throw(
        'F64 buffer must be exactly 8 bytes',
      );
    });

    it('should throw error for invalid hex string', () => {
      expect(() => F64.fromHex('invalid')).to.throw(
        'Hex string must represent exactly 8 bytes',
      );
      expect(() => F64.fromHex('1234')).to.throw(
        'Hex string must represent exactly 8 bytes',
      );
    });
  });
});
