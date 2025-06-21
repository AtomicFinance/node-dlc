import { expect } from 'chai';

import {
  OrderAccept,
  OrderAcceptContainer,
} from '../../lib/messages/OrderAccept';
import { OrderNegotiationFieldsV0 } from '../../lib/messages/OrderNegotiationFields';

describe('OrderAccept', () => {
  const tempOrderId = Buffer.from(
    '960fb5f7960382ac7e76f3e24eb6b00059b1e68632a946843c22e1f65fdf216a',
    'hex',
  );

  const tempOrderId2 = Buffer.from(
    '0ef55fca0e3d0a95609ddce833d2f8ba6c2ee37bbe8583bc2068256c51a32914',
    'hex',
  );

  describe('serialize', () => {
    it('serializes', () => {
      const instance = new OrderAccept();

      instance.tempOrderId = tempOrderId;
      instance.negotiationFields = OrderNegotiationFieldsV0.deserialize(
        Buffer.from('fdff3600', 'hex'),
      );

      expect(instance.serialize().toString("hex")).to.equal(
        "f534" + // type order_accept_v0
        "960fb5f7960382ac7e76f3e24eb6b00059b1e68632a946843c22e1f65fdf216a" + // temp_order_id
        "fdff3600" // order_negotiation_fields
      ); // prettier-ignore
    });
  });

  describe('deserialize', () => {
    it('deserializes', () => {
      const buf = Buffer.from(
        "f534" + // type order_accept_v0
        "960fb5f7960382ac7e76f3e24eb6b00059b1e68632a946843c22e1f65fdf216a" + // temp_order_id
        "fdff3600" // order_negotiation_fields
        , "hex"
      ); // prettier-ignore

      const instance = OrderAccept.deserialize(buf);

      expect(instance.tempOrderId).to.deep.equal(tempOrderId);
      expect(instance.negotiationFields.serialize().toString('hex')).to.equal(
        'fdff3600',
      );
    });
  });

  describe('OrderAcceptContainer', () => {
    it('should serialize and deserialize', () => {
      const orderAccept = new OrderAccept();

      orderAccept.tempOrderId = tempOrderId;
      orderAccept.negotiationFields = OrderNegotiationFieldsV0.deserialize(
        Buffer.from('fdff3600', 'hex'),
      );

      // swap payout and change spk to differentiate between dlcoffers
      const orderAccept2 = OrderAccept.deserialize(orderAccept.serialize());
      orderAccept2.tempOrderId = tempOrderId2;

      const container = new OrderAcceptContainer();
      container.addAccept(orderAccept);
      container.addAccept(orderAccept2);

      const instance = OrderAcceptContainer.deserialize(container.serialize());

      expect(container.serialize()).to.deep.equal(instance.serialize());
    });
  });
});
