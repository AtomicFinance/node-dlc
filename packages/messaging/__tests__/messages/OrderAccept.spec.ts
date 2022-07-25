import { expect } from 'chai';

import { OrderAcceptV0 } from '../../lib/messages/OrderAccept';

describe('OrderAccept', () => {
  const tempOrderId = Buffer.from(
    '960fb5f7960382ac7e76f3e24eb6b00059b1e68632a946843c22e1f65fdf216a',
    'hex',
  );

  describe('serialize', () => {
    it('serializes', () => {
      const instance = new OrderAcceptV0();

      instance.tempOrderId = tempOrderId;
      instance.negotiationFields = null;

      expect(instance.serialize().toString("hex")).to.equal(
        "f534" + // type order_accept_v0
        "960fb5f7960382ac7e76f3e24eb6b00059b1e68632a946843c22e1f65fdf216a" + // temp_order_id
        "00" // order_negotiation_fields
      ); // prettier-ignore
    });
  });

  describe('deserialize', () => {
    it('deserializes', () => {
      const buf = Buffer.from(
        "f534" + // type order_accept_v0
        "960fb5f7960382ac7e76f3e24eb6b00059b1e68632a946843c22e1f65fdf216a" + // temp_order_id
        "00" // order_negotiation_fields
        , "hex"
      ); // prettier-ignore

      const instance = OrderAcceptV0.deserialize(buf);

      expect(instance.tempOrderId).to.deep.equal(tempOrderId);
      expect(instance.negotiationFields).to.equal(null);
    });
  });
});
