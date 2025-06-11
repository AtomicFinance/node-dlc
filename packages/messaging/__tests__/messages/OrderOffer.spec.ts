import { expect } from 'chai';

import {
  LOCKTIME_THRESHOLD,
  MessageType,
  OrderOfferContainer,
  OrderPositionInfoV0,
} from '../../lib';
import { EnumeratedDescriptor } from '../../lib/messages/ContractDescriptor';
import {
  ContractInfo,
  SingleContractInfo,
} from '../../lib/messages/ContractInfo';
import { EnumEventDescriptorV0 } from '../../lib/messages/EventDescriptor';
import { OracleAnnouncementV0 } from '../../lib/messages/OracleAnnouncementV0';
import { OracleEventV0 } from '../../lib/messages/OracleEventV0';
import { SingleOracleInfo } from '../../lib/messages/OracleInfoV0';
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

  // Test data for legacy compatibility tests
  const buf = Buffer.from(
    "f532" + // type
    "06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f" + // chain_hash
    "00" + // type single_contract_info (0)
    "000000000bebc200" + // total_collateral
    "00" + // type enumerated_contract_descriptor (0)
    "02" + // num_outcomes (reduced to 2)
    "03" + "77696e" + // outcome_1: "win" (length=3, data="win")
    "0000000000000000" + // payout_1
    "04" + "6c6f7365" + // outcome_2: "lose" (length=4, data="lose")
    "000000000bebc200" + // payout_2
    "00" + // type single_oracle_info (0)
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

  describe('basic functionality', () => {
    let instance: OrderOfferV0;

    beforeEach(() => {
      instance = new OrderOfferV0();
      instance.chainHash = chainHash;

      // Create a simple contract info with enumerated outcomes
      const contractInfo = new SingleContractInfo();
      contractInfo.totalCollateral = BigInt(200000000);

      // Create enumerated contract descriptor
      const contractDescriptor = new EnumeratedDescriptor();
      contractDescriptor.outcomes = [
        { outcome: 'win', localPayout: BigInt(0) },
        { outcome: 'lose', localPayout: BigInt(200000000) },
      ];

      // Create oracle info (simplified)
      const oracleInfo = new SingleOracleInfo();
      const announcement = new OracleAnnouncementV0();
      announcement.announcementSig = Buffer.alloc(64);
      announcement.oraclePubkey = Buffer.alloc(32);

      const oracleEvent = new OracleEventV0();
      oracleEvent.oracleNonces = [Buffer.alloc(32)];
      oracleEvent.eventMaturityEpoch = 0;

      // Use proper EnumEventDescriptorV0 for new dlcspecs PR #163 format
      const eventDescriptor = new EnumEventDescriptorV0();
      eventDescriptor.outcomes = ['win', 'lose'];
      oracleEvent.eventDescriptor = eventDescriptor;
      oracleEvent.eventId = 'test';

      announcement.oracleEvent = oracleEvent;
      oracleInfo.announcement = announcement;

      contractInfo.contractDescriptor = contractDescriptor;
      contractInfo.oracleInfo = oracleInfo;

      instance.contractInfo = contractInfo;
      instance.offerCollateralSatoshis = BigInt(100000000);
      instance.feeRatePerVb = BigInt(1);
      instance.cetLocktime = 100;
      instance.refundLocktime = 200;
    });

    it('creates and validates instance', () => {
      expect(instance.chainHash).to.deep.equal(chainHash);
      expect(Number(instance.offerCollateralSatoshis)).to.equal(100000000);
      expect(Number(instance.feeRatePerVb)).to.equal(1);
      expect(instance.cetLocktime).to.equal(100);
      expect(instance.refundLocktime).to.equal(200);
    });

    it('serializes and deserializes', () => {
      const serialized = instance.serialize();
      expect(serialized).to.be.instanceof(Buffer);
      expect(serialized.length).to.be.greaterThan(0);

      const deserialized = OrderOfferV0.deserialize(serialized);
      expect(deserialized.chainHash).to.deep.equal(instance.chainHash);
      expect(deserialized.offerCollateralSatoshis).to.equal(
        instance.offerCollateralSatoshis,
      );
      expect(deserialized.feeRatePerVb).to.equal(instance.feeRatePerVb);
      expect(deserialized.cetLocktime).to.equal(instance.cetLocktime);
      expect(deserialized.refundLocktime).to.equal(instance.refundLocktime);
    });

    it('converts to JSON', () => {
      const json = instance.toJSON();
      expect(json.type).to.equal(instance.type);
      expect(json.chainHash).to.equal(instance.chainHash.toString('hex'));
      expect(json.offerCollateralSatoshis).to.equal(
        Number(instance.offerCollateralSatoshis),
      );
      expect(json.feeRatePerVb).to.equal(Number(instance.feeRatePerVb));
      expect(json.cetLocktime).to.equal(instance.cetLocktime);
      expect(json.refundLocktime).to.equal(instance.refundLocktime);
    });
  });

  // TODO: Legacy tests need to be updated for dlcspecs PR #163 format
  // The old hex test data uses the legacy TLV format and needs to be regenerated
});
