import { expect } from 'chai';

import { LOCKTIME_THRESHOLD } from '../../lib';
import { ContractInfo } from '../../lib/messages/ContractInfo';
import { OrderIrcInfoV0 } from '../../lib/messages/OrderIrcInfo';
import { OrderMetadataV0 } from '../../lib/messages/OrderMetadata';
import { OrderOfferV0 } from '../../lib/messages/OrderOffer';

describe('OrderOffer', () => {
  const chainHash = Buffer.from(
    '06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f',
    'hex',
  );

  const buf = Buffer.from(
    "f532" + // type
    "00000001" + // protocol version
    "00" + // contract flags
    "06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f" + // chain_hash
    "00" + // type contract_info
    "000000000bebc200" + // total_collateral
    "00" + // type contract_descriptor
    "03" + // num_outcomes
    "01" + // outcome_1_len
    "31" + // outcome_1
    "0000000000000000" + // payout_1
    "01" + // outcome_2_len
    "32" + // outcome_2
    "00000000092363a3" + // payout_2
    "01" + // outcome_3_len
    "33" + // outcome_3
    "000000000bebc200" + // payout_3
    "00" + // type oracle_info
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

    instance.protocolVersion = 1;
    instance.contractFlags = 0;
    instance.chainHash = chainHash;

    instance.contractInfo = ContractInfo.deserialize(
      Buffer.from(
        '00' + // type contract_info
          '000000000bebc200' + // total_collateral
          '00' + // type contract_descriptor
          '03' + // num_outcomes
          '01' + // outcome_1_len
          '31' + // outcome_1
          '0000000000000000' + // payout_1
          '01' + // outcome_2_len
          '32' + // outcome_2
          '00000000092363a3' + // payout_2
          '01' + // outcome_3_len
          '33' + // outcome_3
          '000000000bebc200' + // payout_3
          '00' + // type oracle_info
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
        "00000001" + // protocol version
        "00" + // contract flags
        "06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f" + // chain_hash
        "00" + // type contract_info
        "000000000bebc200" + // total_collateral
        "00" + // type contract_descriptor
        "03" + // num_outcomes
        "01" + // outcome_1_len
        "31" + // outcome_1
        "0000000000000000" + // payout_1
        "01" + // outcome_2_len
        "32" + // outcome_2
        "00000000092363a3" + // payout_2
        "01" + // outcome_3_len
        "33" + // outcome_3
        "000000000bebc200" + // payout_3
        "00" + // type oracle_info
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
        "00000001" + // protocol version
        "00" + // contract flags
        "06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f" + // chain_hash
        "00" + // type contract_info
        "000000000bebc200" + // total_collateral
        "00" + // type contract_descriptor
        "03" + // num_outcomes
        "01" + // outcome_1_len
        "31" + // outcome_1
        "0000000000000000" + // payout_1
        "01" + // outcome_2_len
        "32" + // outcome_2
        "00000000092363a3" + // payout_2
        "01" + // outcome_3_len
        "33" + // outcome_3
        "000000000bebc200" + // payout_3
        "00" + // type oracle_info
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
      ircInfo.nick = 'A0F5k4H9C56xgbRF';
      ircInfo.pubKey = Buffer.from(
        '022d40fdc0db01b85bb4de6fe181c093b69c3a4558b7fc98a22e289b9d8da1d6f3',
        'hex',
      );

      instance.ircInfo = ircInfo;

      expect(instance.serialize().toString('hex')).to.equal(
        "f532" + // type
        "00000001" + // protocol version
        "00" + // contract flags
        "06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f" + // chain_hash
        "00" + // type contract_info
        "000000000bebc200" + // total_collateral
        "00" + // type contract_descriptor
        "03" + // num_outcomes
        "01" + // outcome_1_len
        "31" + // outcome_1
        "0000000000000000" + // payout_1
        "01" + // outcome_2_len
        "32" + // outcome_2
        "00000000092363a3" + // payout_2
        "01" + // outcome_3_len
        "33" + // outcome_3
        "000000000bebc200" + // payout_3
        "00" + // type oracle_info
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
        "fdf536140b73747261746567792d383861815d8961815d89fdf5383210413046356b3448394335367867625246022d40fdc0db01b85bb4de6fe181c093b69c3a4558b7fc98a22e289b9d8da1d6f3" // order_irc_info_v0 tlv
      ); // prettier-ignore
    });
  });

  describe('deserialize', () => {
    it('deserializes', () => {
      const instance = OrderOfferV0.deserialize(buf);

      expect(instance.chainHash).to.deep.equal(chainHash);
      expect(instance.contractInfo.serialize().toString('hex')).to.equal(
        '00' + // type contract_info
          '000000000bebc200' + // total_collateral
          '00' + // type contract_descriptor
          '03' + // num_outcomes
          '01' + // outcome_1_len
          '31' + // outcome_1
          '0000000000000000' + // payout_1
          '01' + // outcome_2_len
          '32' + // outcome_2
          '00000000092363a3' + // payout_2
          '01' + // outcome_3_len
          '33' + // outcome_3
          '000000000bebc200' + // payout_3
          '00' + // type oracle_info
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

      console.log('instance', instance);

      const json = instance.toJSON();
      expect(json.message.chainHash).to.equal(
        instance.chainHash.toString('hex'),
      );
      expect(json.message.contractInfo).to.deep.equal(
        instance.contractInfo.toJSON(),
      );
      expect(json.message.feeRatePerVb).to.equal(Number(instance.feeRatePerVb));
      expect(json.message.cetLocktime).to.equal(instance.cetLocktime);
      expect(json.message.refundLocktime).to.equal(instance.refundLocktime);
      expect(json.message.metadata.offerId).to.equal(
        (instance.metadata as OrderMetadataV0).offerId,
      );
    });

    it('converts to JSON with ircinfo', async () => {
      const bufWithIrcInfo = Buffer.concat([
        buf,
        Buffer.from(
          'fdf536140b73747261746567792d383861815d8961815d89fdf5383210413046356b3448394335367867625246022d40fdc0db01b85bb4de6fe181c093b69c3a4558b7fc98a22e289b9d8da1d6f3',
          'hex',
        ),
      ]);

      const instance = OrderOfferV0.deserialize(bufWithIrcInfo);

      const json = instance.toJSON();
      expect(json.message.ircInfo.nick).to.equal(
        (instance.ircInfo as OrderIrcInfoV0).nick,
      );
    });
  });

  describe('validate', () => {
    let instance: OrderOfferV0;
    beforeEach(() => {
      instance = OrderOfferV0.deserialize(buf);
    });

    it('should throw if offerCollateralSatoshis is less than 1000', () => {
      instance.offerCollateralSatoshis = BigInt(999);
      expect(function () {
        instance.validate();
      }).to.throw(
        'offer_collateral_satoshis must be greater than or equal to 1000',
      );

      // boundary check
      instance.offerCollateralSatoshis = BigInt(1000);
      expect(function () {
        instance.validate();
      }).to.not.throw();
    });

    it('should throw if cet_locktime is less than 0', () => {
      instance.cetLocktime = -1;
      expect(() => {
        instance.validate();
      }).to.throw('cet_locktime must be greater than or equal to 0');
    });

    it('should throw if refund_locktime is less than 0', () => {
      instance.refundLocktime = -1;
      expect(() => {
        instance.validate();
      }).to.throw('refund_locktime must be greater than or equal to 0');
    });

    it('should throw if cet_locktime and refund_locktime are not in same units', () => {
      instance.cetLocktime = 100;
      instance.refundLocktime = LOCKTIME_THRESHOLD + 200;
      expect(function () {
        instance.validate();
      }).to.throw(Error);
    });

    it('should not throw if cet_locktime and refund_locktime are in same units', () => {
      instance.cetLocktime = 100;
      instance.refundLocktime = 200;
      expect(function () {
        instance.validate();
      }).to.not.throw(Error);

      instance.cetLocktime = LOCKTIME_THRESHOLD + 100;
      instance.refundLocktime = LOCKTIME_THRESHOLD + 200;
      expect(function () {
        instance.validate();
      }).to.not.throw(Error);
    });

    it('should throw if cet_locktime >= refund_locktime', () => {
      instance.cetLocktime = 200;
      instance.refundLocktime = 100;
      expect(function () {
        instance.validate();
      }).to.throw(Error);

      instance.cetLocktime = 100;
      instance.refundLocktime = 100;
      expect(function () {
        instance.validate();
      }).to.throw(Error);
    });

    it('should throw if totalCollateral <= offerCollateral', () => {
      instance.contractInfo.totalCollateral = BigInt(200000000);
      instance.offerCollateralSatoshis = BigInt(200000000);
      expect(function () {
        instance.validate();
      }).to.throw(Error);

      instance.contractInfo.totalCollateral = BigInt(200000000);
      instance.offerCollateralSatoshis = BigInt(200000001);
      expect(function () {
        instance.validate();
      }).to.throw(Error);
    });
  });
});
