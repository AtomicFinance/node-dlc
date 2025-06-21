import { Value } from '@node-dlc/bitcoin';
import { BitcoinNetworks } from 'bitcoin-networks';
import { expect } from 'chai';

import {
  BatchFundingGroup,
  OrderIrcInfoV0,
  OrderMetadataV0,
  OrderPositionInfoV0,
} from '../../lib';
import { EnumeratedDescriptor } from '../../lib/messages/ContractDescriptor';
import { SingleContractInfo } from '../../lib/messages/ContractInfo';
import {
  DlcOffer,
  DlcOfferContainer,
  LOCKTIME_THRESHOLD,
} from '../../lib/messages/DlcOffer';
import { EnumEventDescriptorV0 } from '../../lib/messages/EventDescriptor';
import { FundingInputV0 } from '../../lib/messages/FundingInput';
import { OracleAnnouncement } from '../../lib/messages/OracleAnnouncement';
import { OracleEvent } from '../../lib/messages/OracleEvent';
import { SingleOracleInfo } from '../../lib/messages/OracleInfoV0';
import { MessageType, PROTOCOL_VERSION } from '../../lib/MessageType';

describe('DlcOffer', () => {
  const bitcoinNetwork = BitcoinNetworks.bitcoin_regtest;

  let instance: DlcOffer;
  const type = Buffer.from('a71a', 'hex');
  const protocolVersion = Buffer.from('00000001', 'hex'); // protocol_version: 1
  const contractFlags = Buffer.from('00', 'hex');
  const chainHash = Buffer.from(
    '06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f',
    'hex',
  );
  const temporaryContractId = Buffer.from(
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', // 32 bytes
    'hex',
  );

  // Create ContractInfo programmatically for new dlcspecs PR #163 format
  function createTestContractInfo(): SingleContractInfo {
    const contractInfo = new SingleContractInfo();
    contractInfo.totalCollateral = BigInt(200000000);

    // Create enumerated contract descriptor
    const contractDescriptor = new EnumeratedDescriptor();
    contractDescriptor.outcomes = [
      { outcome: 'win', localPayout: BigInt(0) },
      { outcome: 'draw', localPayout: BigInt(153666723) },
      { outcome: 'lose', localPayout: BigInt(200000000) },
    ];

    // Create oracle info (simplified)
    const oracleInfo = new SingleOracleInfo();
    const announcement = new OracleAnnouncement();
    announcement.announcementSig = Buffer.from(
      'fab22628f6e2602e1671c286a2f63a9246794008627a1749639217f4214cb4a9494c93d1a852221080f44f697adb4355df59eb339f6ba0f9b01ba661a8b108d4',
      'hex',
    );
    announcement.oraclePubkey = Buffer.from(
      'da078bbb1d34e7729e38e2ae34236e776da121af442626fa31e31ae55a279a0b',
      'hex',
    );

    const oracleEvent = new OracleEvent();
    oracleEvent.oracleNonces = [
      Buffer.from(
        '3cfba011378411b20a5ab773cb95daab93e9bcd1e4cce44986a7dda84e01841b',
        'hex',
      ),
    ];
    oracleEvent.eventMaturityEpoch = 0;
    // Use proper EnumEventDescriptorV0 for new dlcspecs PR #163 format
    const eventDescriptor = new EnumEventDescriptorV0();
    eventDescriptor.outcomes = ['dummy1', 'dummy2'];
    oracleEvent.eventDescriptor = eventDescriptor;
    oracleEvent.eventId = 'dummy';

    announcement.oracleEvent = oracleEvent;
    oracleInfo.announcement = announcement;

    contractInfo.contractDescriptor = contractDescriptor;
    contractInfo.oracleInfo = oracleInfo;

    return contractInfo;
  }

  const fundingPubkey = Buffer.from(
    '0327efea09ff4dfb13230e887cbab8821d5cc249c7ff28668c6633ff9f4b4c08e3',
    'hex',
  );

  const payoutSpkLen = Buffer.from('0016', 'hex');
  const payoutSpk = Buffer.from(
    '00142bbdec425007dc360523b0294d2c64d2213af498',
    'hex',
  );

  const payoutSerialID = Buffer.from('0000000000b051dc', 'hex');
  const offerCollateral = Buffer.from('0000000005f5e0FF', 'hex'); // 99999999
  const fundingInputsLen = Buffer.from('01', 'hex'); // Changed from u16 to bigsize (0001 -> 01)

  const fundingInputV0 = Buffer.from(
    'fda714' +
      '3f' + // length
      '000000000000fa51' + // input_serial_id
      '0029' + // prevtx_len
      '02000000000100c2eb0b00000000160014369d63a82ed846f4d47ad55045e594ab95539d6000000000' + // prevtx
      '00000000' + // prevtx_vout
      'ffffffff' + // sequence
      '006b' + // max_witness_len
      '0000', // redeemscript_len
    'hex',
  );

  const changeSpkLen = Buffer.from('0016', 'hex');
  const changeSpk = Buffer.from(
    '0014afa16f949f3055f38bd3a73312bed00b61558884',
    'hex',
  );

  const changeSerialID = Buffer.from('00000000001ea3ed', 'hex');
  const fundOutputSerialID = Buffer.from('000000000052947a', 'hex');
  const feeRatePerVb = Buffer.from('0000000000000001', 'hex');
  const cetLocktime = Buffer.from('00000064', 'hex');
  const refundLocktime = Buffer.from('000000c8', 'hex');

  // Use round-trip testing approach for new dlcspecs PR #163 format
  function createTestDlcOfferHex(): Buffer {
    const testInstance = new DlcOffer();
    testInstance.protocolVersion = PROTOCOL_VERSION;
    testInstance.contractFlags = contractFlags;
    testInstance.chainHash = chainHash;
    testInstance.temporaryContractId = temporaryContractId;
    testInstance.contractInfo = createTestContractInfo();
    testInstance.fundingPubkey = fundingPubkey;
    testInstance.payoutSpk = payoutSpk;
    testInstance.payoutSerialId = BigInt(11555292);
    testInstance.offerCollateral = BigInt(99999999);
    testInstance.fundingInputs = [FundingInputV0.deserialize(fundingInputV0)];
    testInstance.changeSpk = changeSpk;
    testInstance.changeSerialId = BigInt(2008045);
    testInstance.fundOutputSerialId = BigInt(5411962);
    testInstance.feeRatePerVb = BigInt(1);
    testInstance.cetLocktime = 100;
    testInstance.refundLocktime = 200;
    return testInstance.serialize();
  }

  const dlcOfferHex = createTestDlcOfferHex();

  beforeEach(() => {
    instance = new DlcOffer();
    instance.protocolVersion = PROTOCOL_VERSION; // New field
    instance.contractFlags = contractFlags;
    instance.chainHash = chainHash;
    instance.temporaryContractId = temporaryContractId; // New field
    instance.contractInfo = createTestContractInfo();
    instance.fundingPubkey = fundingPubkey;
    instance.payoutSpk = payoutSpk;
    instance.payoutSerialId = BigInt(11555292);
    instance.offerCollateral = BigInt(99999999);
    instance.fundingInputs = [FundingInputV0.deserialize(fundingInputV0)];
    instance.changeSpk = changeSpk;
    instance.changeSerialId = BigInt(2008045);
    instance.fundOutputSerialId = BigInt(5411962);
    instance.feeRatePerVb = BigInt(1);
    instance.cetLocktime = 100;
    instance.refundLocktime = 200;
  });

  describe('deserialize', () => {
    it('should throw if incorrect type', () => {
      // Create buffer with incorrect type (0x123 instead of 42778)
      const incorrectTypeBuffer = Buffer.concat([
        Buffer.from([0x01, 0x23]), // incorrect type
        instance.serialize().slice(2), // rest of the data
      ]);
      expect(function () {
        DlcOffer.deserialize(incorrectTypeBuffer);
      }).to.throw(Error);
    });

    it('has correct type', () => {
      expect(DlcOffer.deserialize(instance.serialize()).type).to.equal(
        instance.type,
      );
    });
  });

  describe('DlcOffer', () => {
    describe('serialize', () => {
      it('serializes', () => {
        // Test that it serializes without errors (new dlcspecs PR #163 format)
        const serialized = instance.serialize();
        expect(serialized).to.be.instanceof(Buffer);
        expect(serialized.length).to.be.greaterThan(0);
      });

      it('serializes with positioninfo', () => {
        const positionInfo = new OrderPositionInfoV0();
        positionInfo.shiftForFees = 'acceptor';
        positionInfo.fees = BigInt(1000);

        instance.positionInfo = positionInfo;

        // Test that it serializes without errors (new dlcspecs PR #163 format)
        const serialized = instance.serialize();
        expect(serialized).to.be.instanceof(Buffer);
        expect(serialized.length).to.be.greaterThan(0);
      });
    });

    describe('deserialize', () => {
      it('deserializes', () => {
        // Use round-trip testing approach for consistency
        const serialized = instance.serialize();
        const deserialized = DlcOffer.deserialize(serialized);

        expect(deserialized.protocolVersion).to.equal(PROTOCOL_VERSION);
        expect(deserialized.contractFlags).to.deep.equal(contractFlags);
        expect(deserialized.chainHash).to.deep.equal(chainHash);
        expect(deserialized.temporaryContractId).to.deep.equal(
          temporaryContractId,
        );
        expect(deserialized.fundingPubkey).to.deep.equal(fundingPubkey);
        expect(deserialized.payoutSpk).to.deep.equal(payoutSpk);
        expect(Number(deserialized.payoutSerialId)).to.equal(11555292);
        expect(Number(deserialized.offerCollateral)).to.equal(99999999);
        expect(deserialized.changeSpk).to.deep.equal(changeSpk);
        expect(Number(deserialized.changeSerialId)).to.equal(2008045);
        expect(Number(deserialized.fundOutputSerialId)).to.equal(5411962);
        expect(Number(deserialized.feeRatePerVb)).to.equal(1);
        expect(deserialized.cetLocktime).to.equal(100);
        expect(deserialized.refundLocktime).to.equal(200);
      });

      it('has correct type', () => {
        const serialized = instance.serialize();
        expect(DlcOffer.deserialize(serialized).type).to.equal(
          MessageType.DlcOffer,
        );
      });

      it('deserializes with positioninfo', () => {
        const positionInfo = new OrderPositionInfoV0();
        positionInfo.shiftForFees = 'acceptor';
        positionInfo.fees = BigInt(1000);

        instance.positionInfo = positionInfo;

        const serialized = instance.serialize();
        const deserialized = DlcOffer.deserialize(serialized);

        expect(deserialized.positionInfo).to.be.instanceof(OrderPositionInfoV0);
        expect(deserialized.positionInfo?.serialize()).to.deep.equal(
          positionInfo.serialize(),
        );
      });
    });

    describe('toJSON', () => {
      it('converts to JSON', async () => {
        const json = instance.toJSON();
        // Basic structure validation - detailed field testing is done in cross-language tests
        expect(json).to.be.an('object');
        expect(json.protocolVersion).to.be.a('number');
        expect(json.temporaryContractId).to.be.a('string');
        expect(json.contractFlags).to.be.a('number');
        expect(json.chainHash).to.be.a('string');
        expect(json.contractInfo).to.be.an('object');
      });
    });

    describe('getAddresses', () => {
      it('should get addresses', () => {
        const expectedFundingAddress =
          'bcrt1qayylp95g2tzq2a60x2l7f8mclnx5y2jxm0yt09';
        const expectedChangeAddress =
          'bcrt1q47skl9ylxp2l8z7n5ue390kspds4tzyy5jdxs8';
        const expectedPayoutAddress =
          'bcrt1q9w77csjsqlwrvpfrkq556try6gsn4ayc2kn0kl';

        // Use round-trip approach for consistency
        const serialized = instance.serialize();
        const deserialized = DlcOffer.deserialize(serialized);

        const {
          fundingAddress,
          changeAddress,
          payoutAddress,
        } = deserialized.getAddresses(bitcoinNetwork);

        expect(fundingAddress).to.equal(expectedFundingAddress);
        expect(changeAddress).to.equal(expectedChangeAddress);
        expect(payoutAddress).to.equal(expectedPayoutAddress);
      });
    });

    describe('validate', () => {
      it('should throw if protocol version is invalid', () => {
        instance.protocolVersion = 999;
        expect(function () {
          instance.validate();
        }).to.throw('Unsupported protocol version: 999, expected: 1');
      });

      it('should throw if temporaryContractId is invalid', () => {
        instance.temporaryContractId = Buffer.from('invalid', 'hex');
        expect(function () {
          instance.validate();
        }).to.throw('temporaryContractId must be 32 bytes');
      });

      it('should throw if payout_spk is invalid', () => {
        instance.payoutSpk = Buffer.from('fff', 'hex');
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });
      it('should throw if change_spk is invalid', () => {
        instance.changeSpk = Buffer.from('fff', 'hex');
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });
      it('should throw if fundingpubkey is not a valid pubkey', () => {
        instance.fundingPubkey = Buffer.from(
          '00f003aa11f2a97b6be755a86b9fd798a7451c670196a5245b7bae971306b7c87e',
          'hex',
        );
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });
      it('should throw if fundingpubkey is not in compressed secp256k1 format', () => {
        instance.fundingPubkey = Buffer.from(
          '045162991c7299223973cabc99ef5087d7bab2dafe61f78e5388b2f9492f7978123f51fd05ef0693790c0b2d4f30848363a3f3fbcf2bd53a05ba0fd5bb708c3184',
          'hex',
        );
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });
      it('should throw if offerCollateral is less than 1000', () => {
        instance.offerCollateral = BigInt(999);
        expect(function () {
          instance.validate();
        }).to.throw(Error);

        // boundary check
        instance.offerCollateral = BigInt(1000);
        expect(function () {
          instance.validate();
        }).to.not.throw(Error);
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

      it('should throw if inputSerialIds arent unique', () => {
        instance.fundingInputs = [
          FundingInputV0.deserialize(fundingInputV0),
          FundingInputV0.deserialize(fundingInputV0),
        ];
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });

      it('should throw if changeSerialId  == fundOutputSerialId', () => {
        instance.changeSerialId = instance.fundOutputSerialId;
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });

      it('should throw if totalCollateral <= offerCollateral', () => {
        instance.contractInfo.totalCollateral = BigInt(200000000);
        instance.offerCollateral = BigInt(200000000);
        expect(function () {
          instance.validate();
        }).to.throw(Error);

        instance.contractInfo.totalCollateral = BigInt(200000000);
        instance.offerCollateral = BigInt(200000001);
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });

      it('should throw if funding amount less than offer collateral', () => {
        instance.offerCollateral = BigInt(3e8);
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });
    });
  });

  describe('DlcOfferContainer', () => {
    it('should serialize and deserialize', () => {
      // Create test offers using round-trip approach
      const dlcOffer = createTestDlcOffer();
      const dlcOffer2 = createTestDlcOffer();
      // swap payout and change spk to differentiate between dlcoffers
      dlcOffer2.payoutSpk = dlcOffer.changeSpk;
      dlcOffer2.changeSpk = dlcOffer.payoutSpk;

      const container = new DlcOfferContainer();
      container.addOffer(dlcOffer);
      container.addOffer(dlcOffer2);

      const serialized = container.serialize();
      const deserialized = DlcOfferContainer.deserialize(serialized);

      expect(deserialized.serialize()).to.deep.equal(container.serialize());
    });

    function createTestDlcOffer(): DlcOffer {
      const testOffer = new DlcOffer();
      testOffer.protocolVersion = PROTOCOL_VERSION;
      testOffer.contractFlags = contractFlags;
      testOffer.chainHash = chainHash;
      testOffer.temporaryContractId = temporaryContractId;
      testOffer.contractInfo = createTestContractInfo();
      testOffer.fundingPubkey = fundingPubkey;
      testOffer.payoutSpk = payoutSpk;
      testOffer.payoutSerialId = BigInt(11555292);
      testOffer.offerCollateral = BigInt(99999999);
      testOffer.fundingInputs = [FundingInputV0.deserialize(fundingInputV0)];
      testOffer.changeSpk = changeSpk;
      testOffer.changeSerialId = BigInt(2008045);
      testOffer.fundOutputSerialId = BigInt(5411962);
      testOffer.feeRatePerVb = BigInt(1);
      testOffer.cetLocktime = 100;
      testOffer.refundLocktime = 200;
      return testOffer;
    }
  });

  describe('TLVs', () => {
    it('should deserialize with all TLV types present', () => {
      const dlcOffer = new DlcOffer();

      dlcOffer.protocolVersion = PROTOCOL_VERSION;
      dlcOffer.contractFlags = contractFlags;
      dlcOffer.chainHash = chainHash;
      dlcOffer.temporaryContractId = temporaryContractId;
      dlcOffer.contractInfo = createTestContractInfo();
      dlcOffer.fundingPubkey = fundingPubkey;
      dlcOffer.payoutSpk = payoutSpk;
      dlcOffer.payoutSerialId = BigInt(29829);
      dlcOffer.offerCollateral = BigInt(16649967);
      dlcOffer.fundingInputs = [FundingInputV0.deserialize(fundingInputV0)];
      dlcOffer.changeSpk = changeSpk;
      dlcOffer.changeSerialId = BigInt(94880);
      dlcOffer.fundOutputSerialId = BigInt(44394);
      dlcOffer.feeRatePerVb = BigInt(45);
      dlcOffer.cetLocktime = 1712689645;
      dlcOffer.refundLocktime = 1719255498;

      // Create TLV components programmatically for new dlcspecs PR #163 format
      const metadata = new OrderMetadataV0();
      metadata.offerId = 'test-offer-id'; // Required property
      metadata.createdAt = 1640995200; // Optional but set for consistency
      metadata.goodTill = 1640995260; // Optional but set for consistency

      const ircInfo = new OrderIrcInfoV0();
      ircInfo.nick = 'test-nick'; // Required property
      ircInfo.pubKey = Buffer.alloc(33); // Required property

      const positionInfo = new OrderPositionInfoV0();
      positionInfo.shiftForFees = 'acceptor';
      positionInfo.fees = BigInt(6930);

      const batchFundingGroup = new BatchFundingGroup();
      batchFundingGroup.eventIds = ['test-event']; // Required property
      batchFundingGroup.allocatedCollateral = Value.fromSats(BigInt(1000)); // Required property

      dlcOffer.metadata = metadata;
      dlcOffer.ircInfo = ircInfo;
      dlcOffer.positionInfo = positionInfo;
      dlcOffer.batchFundingGroups = [batchFundingGroup];

      // Test round-trip consistency with TLVs
      const serialized = dlcOffer.serialize();
      const deserialized = DlcOffer.deserialize(serialized);

      expect(deserialized.toJSON()).to.deep.equal(dlcOffer.toJSON());
    });
  });
});
