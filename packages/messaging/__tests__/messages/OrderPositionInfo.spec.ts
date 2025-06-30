import { expect } from 'chai';

import { OrderPositionInfo } from '../../lib/messages/OrderPositionInfo';

describe('OrderPositionInfo', () => {
  let instance: OrderPositionInfo;

  beforeEach(() => {
    instance = new OrderPositionInfo();
    instance.shiftForFees = 'offeror';
    instance.fees = BigInt(10000);
    instance.instrumentName = 'BTC-24SEP23-23500-P';
    instance.contractSize = BigInt(1e8);
    instance.direction = 'buy';
    instance.price = BigInt(100000);
  });

  describe('deserialize', () => {
    it('should correctly deserialize data', () => {
      const buf = Buffer.from(
        'fdf53a2e010000000000002710134254432d323453455032332d32333530302d500000000005f5e1000100000000000186a00000',
        'hex',
      );
      const result = OrderPositionInfo.deserialize(buf);

      expect(result.shiftForFees).to.equal('offeror');
      expect(result.fees).to.equal(BigInt(10000));
    });

    it('should throw an error for invalid shiftForFees value', () => {
      const buf = Buffer.from('fdf53a09030000000000002710', 'hex');
      expect(() => OrderPositionInfo.deserialize(buf)).to.throw(
        'Invalid shift for fees value: 3',
      );
    });

    it('should deserialize with no instrument name or other parameters', () => {
      const buf = Buffer.from('fdf53a2e010000000000002710', 'hex');
      const result = OrderPositionInfo.deserialize(buf);

      expect(result.shiftForFees).to.equal('offeror');
      expect(result.fees).to.equal(BigInt(10000));
    });
  });

  describe('serialize', () => {
    it('should correctly serialize data', () => {
      instance.shiftForFees = 'offeror';
      instance.fees = BigInt(10000);

      const result = instance.serialize();
      expect(result.toString('hex')).to.equal(
        'fdf53a30010000000000002710134254432d323453455032332d32333530302d500000000005f5e1000100000000000186a00000',
      );
    });
  });

  describe('toJSON', () => {
    it('should correctly convert to JSON', () => {
      instance.shiftForFees = 'offeror';
      instance.fees = BigInt(10000);

      const result = instance.toJSON();
      expect(result).to.deep.equal({
        type: instance.type,
        shiftForFees: instance.shiftForFees,
        fees: Number(instance.fees),
        instrumentName: instance.instrumentName,
        direction: instance.direction,
        price: Number(instance.price),
        extraPrecision: instance.extraPrecision,
      });
    });
  });
});
