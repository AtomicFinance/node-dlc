import { expect } from 'chai';

import { OrderNegotiationFields } from '../../lib/messages/OrderNegotiationFields';

const contractDescriptorHex =
  '00' + // type enumerated_contract_descriptor
  '03' + // num_outcomes
  '09' + // outcome_1_length
  '6f7574636f6d655f31' + // outcome_1 (hex-encoded utf-8 bytes of 'outcome_1' string)
  '0000000000000000' + // payout_1
  '09' +
  '6f7574636f6d655f32' + // outcome_2 (hex-encoded utf-8 bytes of 'outcome_2' string)
  '00000000092363a3' + // payout_2
  '09' +
  '6f7574636f6d655f33' + // outcome_3 (hex-encoded utf-8 bytes of 'outcome_3' string)
  '000000000bebc200'; // payout_3

const oracleEventDescriptorHex =
  'fdd806' + // type enum_event_descriptor
  '10' + // length
  '0002' + // num_outcomes
  '06' + // outcome_1_len
  '64756d6d7931' + // outcome_1
  '06' + // outcome_2_len
  '64756d6d7932'; // outcome_2

const oracleEventHex =
  'fdd822' + // type oracle_event
  '40' + // length
  '0001' + // nb_nonces
  '3cfba011378411b20a5ab773cb95daab93e9bcd1e4cce44986a7dda84e01841b' + // oracle_nonces
  '00000000' + // event_maturity_epoch
  oracleEventDescriptorHex +
  '05' + // event_id_length
  '64756d6d79'; // event_id;

const oracleAnnouncementHex =
  'fdd824' + // type oracle_announcement
  'a4' + // length
  'fab22628f6e2602e1671c286a2f63a9246794008627a1749639217f4214cb4a9' + // announcement_signature_r
  '494c93d1a852221080f44f697adb4355df59eb339f6ba0f9b01ba661a8b108d4' + // announcement_signature_s
  'da078bbb1d34e7729e38e2ae34236e776da121af442626fa31e31ae55a279a0b' + // oracle_public_key
  oracleEventHex;

const oracleInfoHex =
  '00' + // type single_oracle_info;
  oracleAnnouncementHex;

const contractInfoHex =
  '00' + // type single_contract_info
  '000000000bebc200' + // total_collateral
  contractDescriptorHex +
  oracleInfoHex;

const orderNegotiationFieldsHex =
  contractInfoHex +
  '0000000005f5e100' + // offer_collateral
  '0000000000000001' + // fee_rate_per_vb
  '00000064' + // cet_locktime
  '000000c8'; // refund_locktime

describe('OrderNegotiationFields', () => {
  describe('serialize', () => {
    it('serializes', () => {
      const instance = OrderNegotiationFields.deserialize(
        Buffer.from(orderNegotiationFieldsHex, 'hex'),
      );

      expect(instance.serialize().toString('hex')).to.equal(
        orderNegotiationFieldsHex,
      );
    });
  });

  describe('deserialize', () => {
    it('deserializes', () => {
      const instance = OrderNegotiationFields.deserialize(
        Buffer.from(orderNegotiationFieldsHex, 'hex'),
      );

      expect(instance.serialize().toString('hex')).to.equal(
        orderNegotiationFieldsHex,
      );
    });
  });
});
