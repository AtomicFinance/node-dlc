import { expect } from 'chai';

import { LOCKTIME_THRESHOLD } from '../../lib';
import { EnumeratedContractDescriptor } from '../../lib/messages/ContractDescriptor';
import { SingleOracleInfo } from '../../lib/messages/OracleInfo';
import {
  ContractInfo,
  SingleContractInfo,
} from '../../lib/messages/ContractInfo';
import { OrderIrcInfoV0 } from '../../lib/messages/OrderIrcInfo';
import { OrderMetadataV0 } from '../../lib/messages/OrderMetadata';
import { OrderOfferV0 } from '../../lib/messages/OrderOffer';
import { ContractDescriptorV0Pre163 } from '../../lib/messages/pre-163/ContractDescriptor';
import { ContractInfoV0Pre163 } from '../../lib/messages/pre-163/ContractInfo';
import { OracleInfoV0Pre163 } from '../../lib/messages/pre-163/OracleInfo';
import { OrderIrcInfoV0Pre163 } from '../../lib/messages/pre-163/OrderIrcInfo';
import { OrderMetadataV0Pre163 } from '../../lib/messages/pre-163/OrderMetadata';
import { OrderOfferV0Pre163 } from '../../lib/messages/pre-163/OrderOffer';

describe('OrderOffer', () => {
  const chainHashBuf = Buffer.from(
    '06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f',
    'hex',
  );

  const orderOfferBuf = Buffer.from(
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

  const metadata = new OrderMetadataV0();
  metadata.offerId = 'strategy-88';
  metadata.createdAt = 1635868041;
  metadata.goodTill = 1635868041;

  const metadataHex =
    'fdf536' + // type OrderMetadataV0
    '14' + // length
    '0b' + // offerIdLength
    Buffer.from(metadata.offerId, 'utf-8').toString('hex') + // offerId
    '61815d89' + // createdAt
    '61815d89'; // goodTill

  const ircInfo = new OrderIrcInfoV0();
  ircInfo.nick = 'A0F5k4H9C56xgbRF';
  ircInfo.pubKey = Buffer.from(
    '022d40fdc0db01b85bb4de6fe181c093b69c3a4558b7fc98a22e289b9d8da1d6f3',
    'hex',
  );

  const ircInfoHex =
    'fdf538' + // type OrderIrcInfoV0
    '32' + // length
    '10' + // nickLength
    Buffer.from(ircInfo.nick).toString('hex') + // nick
    ircInfo.pubKey.toString('hex'); // pubKey

  describe('serialize', () => {
    const instance = new OrderOfferV0();

    instance.protocolVersion = 1;
    instance.contractFlags = 0;
    instance.chainHash = chainHashBuf;

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

    it('serializes with metadata only', () => {
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
        metadataHex // order_metadata_v0 tlv
      ); // prettier-ignore
    });

    it('serializes with metadata and ircinfo', () => {
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
        metadataHex + // order_metadata_v0 tlv
        ircInfoHex // order_irc_info_v0 tlv
      ); // prettier-ignore
    });
  });

  describe('deserialize', () => {
    it('deserializes', () => {
      const instance = OrderOfferV0.deserialize(orderOfferBuf);

      expect(instance.chainHash).to.deep.equal(chainHashBuf);
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
        orderOfferBuf,
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
        orderOfferBuf,
        Buffer.from('fdf5360c0b73747261746567792d3838', 'hex'),
      ]);

      const instance = OrderOfferV0.deserialize(bufWithMetadata);

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
        orderOfferBuf,
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
      instance = OrderOfferV0.deserialize(orderOfferBuf);
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

  describe('toPre163', () => {
    const instance = new OrderOfferV0();

    before(() => {
      instance.protocolVersion = 1;
      instance.contractFlags = 0;
      instance.chainHash = chainHashBuf;
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
    });

    it('returns pre-163 instance', () => {
      const pre163 = OrderOfferV0.toPre163(instance);
      expect(pre163).to.be.instanceof(OrderOfferV0Pre163);
      expect(pre163.chainHash).to.equal(instance.chainHash);
      expect(pre163.contractInfo).to.be.instanceof(ContractInfoV0Pre163);
      expect(pre163.contractInfo.totalCollateral).to.equal(
        instance.contractInfo.totalCollateral,
      );
      expect(
        (pre163.contractInfo as ContractInfoV0Pre163).contractDescriptor,
      ).to.be.instanceof(ContractDescriptorV0Pre163);
      for (
        let i = 0;
        i <
        ((pre163.contractInfo as ContractInfoV0Pre163)
          .contractDescriptor as ContractDescriptorV0Pre163).outcomes.length;
        i++
      ) {
        expect(
          ((pre163.contractInfo as ContractInfoV0Pre163)
            .contractDescriptor as ContractDescriptorV0Pre163).outcomes[
            i
          ].outcome.toString('utf-8'),
        ).to.equal(
          ((instance.contractInfo as SingleContractInfo)
            .contractDescriptor as EnumeratedContractDescriptor).outcomes[i]
            .outcome,
        );
        expect(
          ((pre163.contractInfo as ContractInfoV0Pre163)
            .contractDescriptor as ContractDescriptorV0Pre163).outcomes[i]
            .localPayout,
        ).to.equal(
          ((instance.contractInfo as SingleContractInfo)
            .contractDescriptor as EnumeratedContractDescriptor).outcomes[i]
            .localPayout,
        );
      }
      expect(
        (pre163.contractInfo as ContractInfoV0Pre163).oracleInfo,
      ).to.be.instanceof(OracleInfoV0Pre163);
      expect(
        (pre163.contractInfo as ContractInfoV0Pre163).oracleInfo.announcement,
      ).to.equal(
        ((instance.contractInfo as SingleContractInfo)
          .oracleInfo as SingleOracleInfo).announcement,
      );
      expect(pre163.offerCollateralSatoshis).to.equal(
        instance.offerCollateralSatoshis,
      );
      expect(pre163.feeRatePerVb).to.equal(instance.feeRatePerVb);
      expect(pre163.cetLocktime).to.equal(instance.cetLocktime);
      expect(pre163.refundLocktime).to.equal(instance.refundLocktime);
      if (instance.metadata) {
        expect(pre163.metadata).to.be.instanceof(OrderMetadataV0Pre163);
        expect((pre163.metadata as OrderMetadataV0Pre163)?.offerId).to.equal(
          (instance.metadata as OrderMetadataV0)?.offerId,
        );
        expect((pre163.metadata as OrderMetadataV0Pre163)?.createdAt).to.equal(
          (instance.metadata as OrderMetadataV0)?.createdAt,
        );
        expect((pre163.metadata as OrderMetadataV0Pre163)?.goodTill).to.equal(
          (instance.metadata as OrderMetadataV0)?.goodTill,
        );
      }
      if (instance.ircInfo) {
        expect(pre163.ircInfo).to.be.instanceof(OrderIrcInfoV0Pre163);
        expect((pre163.ircInfo as OrderIrcInfoV0Pre163)?.nick).to.equal(
          (instance.ircInfo as OrderIrcInfoV0)?.nick,
        );
        expect((pre163.ircInfo as OrderIrcInfoV0Pre163)?.pubKey).to.equal(
          (instance.ircInfo as OrderIrcInfoV0)?.pubKey,
        );
      }
    });
  });

  describe('fromPre163', () => {
    const pre163 = new OrderOfferV0Pre163();

    before(() => {
      pre163.chainHash = chainHashBuf;
      pre163.contractInfo = ContractInfoV0Pre163.deserialize(
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
      pre163.offerCollateralSatoshis = BigInt(100000000);
      pre163.feeRatePerVb = BigInt(1);
      pre163.cetLocktime = 100;
      pre163.refundLocktime = 200;
    });

    it('returns post-163 instance', () => {
      const post163 = OrderOfferV0.fromPre163(pre163, 0);
      expect(post163).to.be.instanceof(OrderOfferV0);
      expect(post163.chainHash).to.equal(pre163.chainHash);
      expect(post163.contractInfo).to.be.instanceof(SingleContractInfo);
      expect(post163.contractInfo.totalCollateral).to.equal(
        pre163.contractInfo.totalCollateral,
      );
      expect(
        (post163.contractInfo as SingleContractInfo).contractDescriptor,
      ).to.be.instanceof(EnumeratedContractDescriptor);
      for (
        let i = 0;
        i <
        ((post163.contractInfo as SingleContractInfo)
          .contractDescriptor as EnumeratedContractDescriptor).outcomes.length;
        i++
      ) {
        expect(
          ((post163.contractInfo as SingleContractInfo)
            .contractDescriptor as EnumeratedContractDescriptor).outcomes[i]
            .outcome,
        ).to.equal(
          ((pre163.contractInfo as ContractInfoV0Pre163)
            .contractDescriptor as ContractDescriptorV0Pre163).outcomes[
            i
          ].outcome.toString('utf-8'),
        );
        expect(
          ((post163.contractInfo as SingleContractInfo)
            .contractDescriptor as EnumeratedContractDescriptor).outcomes[i]
            .localPayout,
        ).to.equal(
          ((pre163.contractInfo as ContractInfoV0Pre163)
            .contractDescriptor as ContractDescriptorV0Pre163).outcomes[i]
            .localPayout,
        );
      }
      expect(
        (post163.contractInfo as SingleContractInfo).oracleInfo,
      ).to.be.instanceof(SingleOracleInfo);
      expect(
        ((post163.contractInfo as SingleContractInfo)
          .oracleInfo as SingleOracleInfo).announcement,
      ).to.equal(
        ((pre163.contractInfo as ContractInfoV0Pre163)
          .oracleInfo as OracleInfoV0Pre163).announcement,
      );
      expect(post163.offerCollateralSatoshis).to.equal(
        pre163.offerCollateralSatoshis,
      );
      expect(post163.feeRatePerVb).to.equal(pre163.feeRatePerVb);
      expect(post163.cetLocktime).to.equal(pre163.cetLocktime);
      expect(post163.refundLocktime).to.equal(pre163.refundLocktime);
      if (pre163.metadata) {
        expect(post163.metadata).to.be.instanceof(OrderMetadataV0);
        expect((post163.metadata as OrderMetadataV0)?.offerId).to.equal(
          (pre163.metadata as OrderMetadataV0Pre163)?.offerId,
        );
        expect((post163.metadata as OrderMetadataV0)?.createdAt).to.equal(
          (pre163.metadata as OrderMetadataV0Pre163)?.createdAt,
        );
        expect((post163.metadata as OrderMetadataV0)?.goodTill).to.equal(
          (pre163.metadata as OrderMetadataV0Pre163)?.goodTill,
        );
      }
      if (pre163.ircInfo) {
        expect(post163.ircInfo).to.be.instanceof(OrderIrcInfoV0);
        expect((post163.ircInfo as OrderIrcInfoV0)?.nick).to.equal(
          (pre163.ircInfo as OrderIrcInfoV0Pre163)?.nick,
        );
        expect((post163.ircInfo as OrderIrcInfoV0)?.pubKey).to.equal(
          (pre163.ircInfo as OrderIrcInfoV0Pre163)?.pubKey,
        );
      }
    });
  });
});
