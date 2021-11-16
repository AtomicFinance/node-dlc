import { expect } from 'chai';

import { MessageType } from '../../lib';
import { ContractInfo } from '../../lib/messages/ContractInfo';
import {
  IOrderIrcInfoJSON,
  OrderIrcInfoV0,
} from '../../lib/messages/OrderIrcInfo';
import {
  IOrderMetadataJSON,
  OrderMetadataV0,
} from '../../lib/messages/OrderMetadata';
import { OrderOfferV0 } from '../../lib/messages/OrderOffer';

describe('OrderOffer', () => {
  const chainHash = Buffer.from(
    '06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f',
    'hex',
  );

  const buf = Buffer.from(
    "f532" + // type
    "06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f" + // chain_hash
    "fdd82e" + // type contract_info
    "fd0131" + // length
    "000000000bebc200" + // total_collateral
    "fda710" + // type contract_descriptor
    "79" + // length
    "03" + // num_outcomes
    "c5a7affd51901bc7a51829b320d588dc7af0ad1f3d56f20a1d3c60c9ba7c6722" + // outcome_1
    "0000000000000000" + // payout_1
    "adf1c23fbeed6611efa5caa0e9ed4c440c450a18bc010a6c867e05873ac08ead" + // outcome_2
    "00000000092363a3" + // payout_2
    "6922250552ad6bb10ab3ddd6981b530aa9a6fd05725bf85b59e3e51163905288" + // outcome_3
    "000000000bebc200" + // payout_3
    "fda712" + // type oracle_info
    "a8" + // length
    "fdd824" + // type oracle_announcement
    "a4" + // length
    "fab22628f6e2602e1671c286a2f63a9246794008627a1749639217f4214cb4a9" + // announcement_signature_r
    "494c93d1a852221080f44f697adb4355df59eb339f6ba0f9b01ba661a8b108d4" + // announcement_signature_s
    "da078bbb1d34e7729e38e2ae34236e776da121af442626fa31e31ae55a279a0b" + // oracle_public_key
    "fdd822" + // type oracle_event
    "40" + // length
    "0001" + // nb_nonces
    "3cfba011378411b20a5ab773cb95daab93e9bcd1e4cce44986a7dda84e01841b" + // oracle_nonces
    "00000000" + // event_maturity_epoch
    "fdd806" + // type enum_event_descriptor
    "10" + // length
    "0002" + // num_outcomes
    "06" + // outcome_1_len
    "64756d6d7931" + // outcome_1
    "06" + // outcome_2_len
    "64756d6d7932" + // outcome_2
    "05" + // event_id_length
    "64756d6d79" + // event_id
    "0000000005f5e100" + // total_collateral_satoshis
    "0000000000000001" + // fee_rate_per_vb
    "00000064" + // cet_locktime
    "000000c8" // refund_locktime
    , "hex"
  ); // prettier-ignore

  describe('serialize', () => {
    const instance = new OrderOfferV0();

    instance.chainHash = chainHash;

    instance.contractInfo = ContractInfo.deserialize(
      Buffer.from(
        'fdd82e' + // type contract_info
          'fd0131' + // length
          '000000000bebc200' + // total_collateral
          'fda710' + // type contract_descriptor
          '79' + // length
          '03' + // num_outcomes
          'c5a7affd51901bc7a51829b320d588dc7af0ad1f3d56f20a1d3c60c9ba7c6722' + // outcome_1
          '0000000000000000' + // payout_1
          'adf1c23fbeed6611efa5caa0e9ed4c440c450a18bc010a6c867e05873ac08ead' + // outcome_2
          '00000000092363a3' + // payout_2
          '6922250552ad6bb10ab3ddd6981b530aa9a6fd05725bf85b59e3e51163905288' + // outcome_3
          '000000000bebc200' + // payout_3
          'fda712' + // type oracle_info
          'a8' + // length
          'fdd824' + // type oracle_announcement
          'a4' + // length
          'fab22628f6e2602e1671c286a2f63a9246794008627a1749639217f4214cb4a9' + // announcement_signature_r
          '494c93d1a852221080f44f697adb4355df59eb339f6ba0f9b01ba661a8b108d4' + // announcement_signature_s
          'da078bbb1d34e7729e38e2ae34236e776da121af442626fa31e31ae55a279a0b' + // oracle_public_key
          'fdd822' + // type oracle_event
          '40' + // length
          '0001' + // nb_nonces
          '3cfba011378411b20a5ab773cb95daab93e9bcd1e4cce44986a7dda84e01841b' + // oracle_nonces
          '00000000' + // event_maturity_epoch
          'fdd806' + // type enum_event_descriptor
          '10' + // length
          '0002' + // num_outcomes
          '06' + // outcome_1_len
          '64756d6d7931' + // outcome_1
          '06' + // outcome_2_len
          '64756d6d7932' + // outcome_2
          '05' + // event_id_length
          '64756d6d79', // event_id
        'hex',
      ),
    );

    instance.offerCollateralSatoshis = BigInt(100000000);
    instance.feeRatePerVb = BigInt(1);
    instance.cetLocktime = 100;
    instance.refundLocktime = 200;

    it('serializes', () => {
      expect(instance.serialize().toString("hex")).to.equal(
        "f532" + // type
        "06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f" + // chain_hash
        "fdd82e" + // type contract_info
        "fd0131" + // length
        "000000000bebc200" + // total_collateral
        "fda710" + // type contract_descriptor
        "79" + // length
        "03" + // num_outcomes
        "c5a7affd51901bc7a51829b320d588dc7af0ad1f3d56f20a1d3c60c9ba7c6722" + // outcome_1
        "0000000000000000" + // payout_1
        "adf1c23fbeed6611efa5caa0e9ed4c440c450a18bc010a6c867e05873ac08ead" + // outcome_2
        "00000000092363a3" + // payout_2
        "6922250552ad6bb10ab3ddd6981b530aa9a6fd05725bf85b59e3e51163905288" + // outcome_3
        "000000000bebc200" + // payout_3
        "fda712" + // type oracle_info
        "a8" + // length
        "fdd824" + // type oracle_announcement
        "a4" + // length
        "fab22628f6e2602e1671c286a2f63a9246794008627a1749639217f4214cb4a9" + // announcement_signature_r
        "494c93d1a852221080f44f697adb4355df59eb339f6ba0f9b01ba661a8b108d4" + // announcement_signature_s
        "da078bbb1d34e7729e38e2ae34236e776da121af442626fa31e31ae55a279a0b" + // oracle_public_key
        "fdd822" + // type oracle_event
        "40" + // length
        "0001" + // nb_nonces
        "3cfba011378411b20a5ab773cb95daab93e9bcd1e4cce44986a7dda84e01841b" + // oracle_nonces
        "00000000" + // event_maturity_epoch
        "fdd806" + // type enum_event_descriptor
        "10" + // length
        "0002" + // num_outcomes
        "06" + // outcome_1_len
        "64756d6d7931" + // outcome_1
        "06" + // outcome_2_len
        "64756d6d7932" + // outcome_2
        "05" + // event_id_length
        "64756d6d79" + // event_id
        "0000000005f5e100" + // total_collateral_satoshis
        "0000000000000001" + // fee_rate_per_vb
        "00000064" + // cet_locktime
        "000000c8" // refund_locktime
      ); // prettier-ignore
    });

    it('serializes with metadata', () => {
      const metadata = new OrderMetadataV0();
      metadata.offerId = 'strategy-88';
      metadata.createdAt = 1635868041;
      metadata.goodTill = 1635868041;

      instance.metadata = metadata;

      expect(instance.serialize().toString('hex')).to.equal(
        "f532" + // type
        "06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f" + // chain_hash
        "fdd82e" + // type contract_info
        "fd0131" + // length
        "000000000bebc200" + // total_collateral
        "fda710" + // type contract_descriptor
        "79" + // length
        "03" + // num_outcomes
        "c5a7affd51901bc7a51829b320d588dc7af0ad1f3d56f20a1d3c60c9ba7c6722" + // outcome_1
        "0000000000000000" + // payout_1
        "adf1c23fbeed6611efa5caa0e9ed4c440c450a18bc010a6c867e05873ac08ead" + // outcome_2
        "00000000092363a3" + // payout_2
        "6922250552ad6bb10ab3ddd6981b530aa9a6fd05725bf85b59e3e51163905288" + // outcome_3
        "000000000bebc200" + // payout_3
        "fda712" + // type oracle_info
        "a8" + // length
        "fdd824" + // type oracle_announcement
        "a4" + // length
        "fab22628f6e2602e1671c286a2f63a9246794008627a1749639217f4214cb4a9" + // announcement_signature_r
        "494c93d1a852221080f44f697adb4355df59eb339f6ba0f9b01ba661a8b108d4" + // announcement_signature_s
        "da078bbb1d34e7729e38e2ae34236e776da121af442626fa31e31ae55a279a0b" + // oracle_public_key
        "fdd822" + // type oracle_event
        "40" + // length
        "0001" + // nb_nonces
        "3cfba011378411b20a5ab773cb95daab93e9bcd1e4cce44986a7dda84e01841b" + // oracle_nonces
        "00000000" + // event_maturity_epoch
        "fdd806" + // type enum_event_descriptor
        "10" + // length
        "0002" + // num_outcomes
        "06" + // outcome_1_len
        "64756d6d7931" + // outcome_1
        "06" + // outcome_2_len
        "64756d6d7932" + // outcome_2
        "05" + // event_id_length
        "64756d6d79" + // event_id
        "0000000005f5e100" + // total_collateral_satoshis
        "0000000000000001" + // fee_rate_per_vb
        "00000064" + // cet_locktime
        "000000c8" + // refund_locktime
        "fdf536140b73747261746567792d383861815d8961815d89" // order_metadata_v0 tlv
      ); // prettier-ignore
    });

    it('serializes with ircinfo', () => {
      const ircInfo = new OrderIrcInfoV0();
      ircInfo.nick = 'A0F5k4H9C56xgbRF1';

      instance.ircInfo = ircInfo;

      expect(instance.serialize().toString('hex')).to.equal(
        "f532" + // type
        "06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f" + // chain_hash
        "fdd82e" + // type contract_info
        "fd0131" + // length
        "000000000bebc200" + // total_collateral
        "fda710" + // type contract_descriptor
        "79" + // length
        "03" + // num_outcomes
        "c5a7affd51901bc7a51829b320d588dc7af0ad1f3d56f20a1d3c60c9ba7c6722" + // outcome_1
        "0000000000000000" + // payout_1
        "adf1c23fbeed6611efa5caa0e9ed4c440c450a18bc010a6c867e05873ac08ead" + // outcome_2
        "00000000092363a3" + // payout_2
        "6922250552ad6bb10ab3ddd6981b530aa9a6fd05725bf85b59e3e51163905288" + // outcome_3
        "000000000bebc200" + // payout_3
        "fda712" + // type oracle_info
        "a8" + // length
        "fdd824" + // type oracle_announcement
        "a4" + // length
        "fab22628f6e2602e1671c286a2f63a9246794008627a1749639217f4214cb4a9" + // announcement_signature_r
        "494c93d1a852221080f44f697adb4355df59eb339f6ba0f9b01ba661a8b108d4" + // announcement_signature_s
        "da078bbb1d34e7729e38e2ae34236e776da121af442626fa31e31ae55a279a0b" + // oracle_public_key
        "fdd822" + // type oracle_event
        "40" + // length
        "0001" + // nb_nonces
        "3cfba011378411b20a5ab773cb95daab93e9bcd1e4cce44986a7dda84e01841b" + // oracle_nonces
        "00000000" + // event_maturity_epoch
        "fdd806" + // type enum_event_descriptor
        "10" + // length
        "0002" + // num_outcomes
        "06" + // outcome_1_len
        "64756d6d7931" + // outcome_1
        "06" + // outcome_2_len
        "64756d6d7932" + // outcome_2
        "05" + // event_id_length
        "64756d6d79" + // event_id
        "0000000005f5e100" + // total_collateral_satoshis
        "0000000000000001" + // fee_rate_per_vb
        "00000064" + // cet_locktime
        "000000c8" + // refund_locktime
        "fdf536140b73747261746567792d383861815d8961815d89fdf5381211413046356b344839433536786762524631" // order_irc_info_v0 tlv
      ); // prettier-ignore
    });
  });

  describe('deserialize', () => {
    it('deserializes', () => {
      const instance = OrderOfferV0.deserialize(buf);

      expect(instance.chainHash).to.deep.equal(chainHash);
      expect(instance.contractInfo.serialize().toString('hex')).to.equal(
        'fdd82e' + // type contract_info
          'fd0131' + // length
          '000000000bebc200' + // total_collateral
          'fda710' + // type contract_descriptor
          '79' + // length
          '03' + // num_outcomes
          'c5a7affd51901bc7a51829b320d588dc7af0ad1f3d56f20a1d3c60c9ba7c6722' + // outcome_1
          '0000000000000000' + // payout_1
          'adf1c23fbeed6611efa5caa0e9ed4c440c450a18bc010a6c867e05873ac08ead' + // outcome_2
          '00000000092363a3' + // payout_2
          '6922250552ad6bb10ab3ddd6981b530aa9a6fd05725bf85b59e3e51163905288' + // outcome_3
          '000000000bebc200' + // payout_3
          'fda712' + // type oracle_info
          'a8' + // length
          'fdd824' + // type oracle_announcement
          'a4' + // length
          'fab22628f6e2602e1671c286a2f63a9246794008627a1749639217f4214cb4a9' + // announcement_signature_r
          '494c93d1a852221080f44f697adb4355df59eb339f6ba0f9b01ba661a8b108d4' + // announcement_signature_s
          'da078bbb1d34e7729e38e2ae34236e776da121af442626fa31e31ae55a279a0b' + // oracle_public_key
          'fdd822' + // type oracle_event
          '40' + // length
          '0001' + // nb_nonces
          '3cfba011378411b20a5ab773cb95daab93e9bcd1e4cce44986a7dda84e01841b' + // oracle_nonces
          '00000000' + // event_maturity_epoch
          'fdd806' + // type enum_event_descriptor
          '10' + // length
          '0002' + // num_outcomes
          '06' + // outcome_1_len
          '64756d6d7931' + // outcome_1
          '06' + // outcome_2_len
          '64756d6d7932' + // outcome_2
          '05' + // event_id_length
          '64756d6d79', // event_id
      );
      expect(Number(instance.offerCollateralSatoshis)).to.equal(100000000);
      expect(Number(instance.feeRatePerVb)).to.equal(1);
      expect(instance.cetLocktime).to.equal(100);
      expect(instance.refundLocktime).to.equal(200);
    });

    it('deserializes with metadata', () => {
      const bufWithMetadata = Buffer.concat([
        buf,
        Buffer.from('fdf5360c0b73747261746567792d3838', 'hex'),
      ]);

      const instance = OrderOfferV0.deserialize(bufWithMetadata);

      expect((instance.metadata as OrderMetadataV0).offerId).to.equal(
        'strategy-88',
      );
    });
  });

  describe('toJSON', () => {
    it('converts to JSON with metadata', async () => {
      const bufWithMetadata = Buffer.concat([
        buf,
        Buffer.from('fdf5360c0b73747261746567792d3838', 'hex'),
      ]);

      const instance = OrderOfferV0.deserialize(bufWithMetadata);

      const json = instance.toJSON();
      expect(json.type).to.equal(instance.type);
      expect(json.chainHash).to.equal(instance.chainHash.toString('hex'));
      expect(json.contractInfo.type).to.equal(instance.contractInfo.type);
      expect(json.contractInfo.totalCollateral).to.equal(
        Number(instance.contractInfo.totalCollateral),
      );
      expect(json.feeRatePerVb).to.equal(Number(instance.feeRatePerVb));
      expect(json.cetLocktime).to.equal(instance.cetLocktime);
      expect(json.refundLocktime).to.equal(instance.refundLocktime);
      expect(json.tlvs[0].type === MessageType.OrderMetadataV0).to.equal(true);
      expect((json.tlvs[0] as IOrderMetadataJSON).offerId).to.equal(
        (instance.metadata as OrderMetadataV0).offerId,
      );
    });

    it('converts to JSON with ircinfo', async () => {
      const bufWithIrcInfo = Buffer.concat([
        buf,
        Buffer.from('fdf5381211413046356b344839433536786762524631', 'hex'),
      ]);

      const instance = OrderOfferV0.deserialize(bufWithIrcInfo);

      const json = instance.toJSON();
      expect(json.tlvs[0].type === MessageType.OrderIrcInfoV0).to.equal(true);
      expect((json.tlvs[0] as IOrderIrcInfoJSON).nick).to.equal(
        (instance.ircInfo as OrderIrcInfoV0).nick,
      );
    });
  });
});
