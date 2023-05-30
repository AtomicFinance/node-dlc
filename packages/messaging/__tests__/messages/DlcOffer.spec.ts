import { BitcoinNetworks } from 'bitcoin-networks';
import { expect } from 'chai';

import {
  ContractInfo,
  ISingleContractInfoJSON,
} from '../../lib/messages/ContractInfo';
import {
  DlcOffer,
  DlcOfferV0,
  LOCKTIME_THRESHOLD,
} from '../../lib/messages/DlcOffer';
import { FundingInput } from '../../lib/messages/FundingInput';
import { MessageType } from '../../lib/MessageType';

describe('DlcOffer', () => {
  const bitcoinNetwork = BitcoinNetworks.bitcoin_regtest;

  let instance: DlcOfferV0;
  const type = Buffer.from('a71a', 'hex');
  const protocolVersion = Buffer.from('00000001', 'hex');
  const contractFlags = Buffer.from('00', 'hex');
  const chainHash = Buffer.from(
    '06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f',
    'hex',
  );

  const temporaryContractId = Buffer.from(
    '2005f76575d3f0ff0fc32a7b8da3a4833d380f32eae5658704dd7ed945b6281a',
    'hex',
  );
  const contractInfo = Buffer.from(
    '00' + // type single_contract_info
      '000000000bebc200' + // total_collateral
      '00' + // type enumerated_contract_descriptor
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
      '00' + // type single_oracle_info
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
  );

  const fundingPubKey = Buffer.from(
    '0327efea09ff4dfb13230e887cbab8821d5cc249c7ff28668c6633ff9f4b4c08e3',
    'hex',
  );

  const payoutSPKLen = Buffer.from('0016', 'hex');
  const payoutSPK = Buffer.from(
    '00142bbdec425007dc360523b0294d2c64d2213af498',
    'hex',
  );

  const payoutSerialID = Buffer.from('0000000000b051dc', 'hex');
  const offerCollateral = Buffer.from('0000000005f5e0FF', 'hex'); // 99999999
  const fundingInputsLen = Buffer.from('01', 'hex');

  const fundingInput = Buffer.from(
    '000000000000fa51' + // input_serial_id
      '29' + // prevtx_len
      '02000000000100c2eb0b00000000160014369d63a82ed846f4d47ad55045e594ab95539d6000000000' + // prevtx
      '00000000' + // prevtx_vout
      'ffffffff' + // sequence
      '006b' + // max_witness_len
      '0000', // redeemscript_len
    'hex',
  );

  const changeSPKLen = Buffer.from('0016', 'hex');
  const changeSPK = Buffer.from(
    '0014afa16f949f3055f38bd3a73312bed00b61558884',
    'hex',
  );

  const changeSerialID = Buffer.from('00000000001ea3ed', 'hex');
  const fundOutputSerialID = Buffer.from('000000000052947a', 'hex');
  const feeRatePerVb = Buffer.from('0000000000000001', 'hex');
  const cetLocktime = Buffer.from('00000064', 'hex');
  const refundLocktime = Buffer.from('000000c8', 'hex');

  const dlcOfferHex = Buffer.concat([
    type,
    protocolVersion,
    contractFlags,
    chainHash,
    temporaryContractId,
    contractInfo,
    fundingPubKey,
    payoutSPKLen,
    payoutSPK,
    payoutSerialID,
    offerCollateral,
    fundingInputsLen,
    fundingInput,
    changeSPKLen,
    changeSPK,
    changeSerialID,
    fundOutputSerialID,
    feeRatePerVb,
    cetLocktime,
    refundLocktime,
  ]);

  beforeEach(() => {
    instance = new DlcOfferV0();
    instance.protocolVersion = parseInt(protocolVersion.toString('hex'), 16);
    instance.contractFlags = parseInt(contractFlags.toString('hex'), 16);
    instance.chainHash = chainHash;
    instance.temporaryContractId = temporaryContractId;
    instance.contractInfo = ContractInfo.deserialize(contractInfo);
    instance.fundingPubKey = fundingPubKey;
    instance.payoutSPK = payoutSPK;
    instance.payoutSerialId = BigInt(11555292);
    instance.offerCollateral = BigInt(99999999);
    instance.fundingInputs = [FundingInput.deserialize(fundingInput)];
    instance.changeSPK = changeSPK;
    instance.changeSerialId = BigInt(2008045);
    instance.fundOutputSerialId = BigInt(5411962);
    instance.feeRatePerVb = BigInt(1);
    instance.cetLocktime = 100;
    instance.refundLocktime = 200;
  });

  describe('deserialize', () => {
    it('should throw if incorrect type', () => {
      instance.type = 0x123;
      expect(function () {
        DlcOffer.deserialize(instance.serialize());
      }).to.throw(Error);
    });

    it('has correct type', () => {
      expect(DlcOffer.deserialize(instance.serialize()).type).to.equal(
        instance.type,
      );
    });
  });

  describe('DlcOfferV0', () => {
    describe('serialize', () => {
      it('serializes', () => {
        expect(instance.serialize().toString('hex')).to.equal(
          dlcOfferHex.toString('hex'),
        );
      });
    });

    describe('deserialize', () => {
      it('deserializes', () => {
        const instance = DlcOfferV0.deserialize(dlcOfferHex);

        expect(instance.contractFlags).to.deep.equal(
          parseInt(contractFlags.toString('hex'), 16),
        );
        expect(instance.chainHash).to.deep.equal(chainHash);
        expect(instance.contractInfo.serialize().toString('hex')).to.equal(
          contractInfo.toString('hex'),
        );
        expect(instance.fundingPubKey).to.deep.equal(fundingPubKey);
        expect(instance.payoutSPK).to.deep.equal(payoutSPK);
        expect(Number(instance.payoutSerialId)).to.equal(11555292);
        expect(Number(instance.offerCollateral)).to.equal(99999999);
        expect(instance.fundingInputs[0].serialize().toString('hex')).to.equal(
          fundingInput.toString('hex'),
        );
        expect(instance.changeSPK).to.deep.equal(changeSPK);
        expect(Number(instance.changeSerialId)).to.equal(2008045);
        expect(Number(instance.fundOutputSerialId)).to.equal(5411962);
        expect(Number(instance.feeRatePerVb)).to.equal(1);
        expect(instance.cetLocktime).to.equal(100);
        expect(instance.refundLocktime).to.equal(200);
      });

      it('has correct type', () => {
        expect(DlcOfferV0.deserialize(dlcOfferHex).type).to.equal(
          MessageType.DlcOfferV0,
        );
      });
    });

    describe('toJSON', () => {
      it('converts to JSON', async () => {
        const json = instance.toJSON();
        expect(json.message.protocolVersion).to.equal(instance.protocolVersion);
        expect(json.message.contractFlags).to.equal(instance.contractFlags);
        expect(json.message.chainHash).to.equal(
          instance.chainHash.toString('hex'),
        );
        expect(
          (json.message.contractInfo as ISingleContractInfoJSON)
            .singleContractInfo.totalCollateral,
        ).to.equal(Number(instance.contractInfo.totalCollateral));

        expect(json.message.fundingPubkey).to.equal(
          instance.fundingPubKey.toString('hex'),
        );
        expect(json.message.payoutSpk).to.equal(
          instance.payoutSPK.toString('hex'),
        );
        expect(json.message.payoutSerialId).to.equal(
          Number(instance.payoutSerialId),
        );
        expect(json.message.offerCollateral).to.equal(
          Number(instance.offerCollateral),
        );
        expect(json.message.fundingInputs[0].inputSerialId).to.equal(
          Number(instance.fundingInputs[0].toJSON().inputSerialId),
        );

        expect(json.message.changeSpk).to.equal(
          instance.changeSPK.toString('hex'),
        );
        expect(json.message.changeSerialId).to.equal(
          Number(instance.changeSerialId),
        );
        expect(json.message.fundOutputSerialId).to.equal(
          Number(instance.fundOutputSerialId),
        );
        expect(json.message.feeRatePerVb).to.equal(
          Number(instance.feeRatePerVb),
        );
        expect(json.message.cetLocktime).to.equal(instance.cetLocktime);
        expect(json.message.refundLocktime).to.equal(instance.refundLocktime);
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

        const instance = DlcOfferV0.deserialize(dlcOfferHex);

        const {
          fundingAddress,
          changeAddress,
          payoutAddress,
        } = instance.getAddresses(bitcoinNetwork);

        expect(fundingAddress).to.equal(expectedFundingAddress);
        expect(changeAddress).to.equal(expectedChangeAddress);
        expect(payoutAddress).to.equal(expectedPayoutAddress);
      });
    });

    describe('validate', () => {
      it('should throw if payout_spk is invalid', () => {
        instance.payoutSPK = Buffer.from('fff', 'hex');
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });
      it('should throw if change_spk is invalid', () => {
        instance.changeSPK = Buffer.from('fff', 'hex');
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });
      it('should throw if fundingpubkey is not a valid pubkey', () => {
        instance.fundingPubKey = Buffer.from(
          '00f003aa11f2a97b6be755a86b9fd798a7451c670196a5245b7bae971306b7c87e',
          'hex',
        );
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });
      it('should throw if fundingpubkey is not in compressed secp256k1 format', () => {
        instance.fundingPubKey = Buffer.from(
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
          FundingInput.deserialize(fundingInput),
          FundingInput.deserialize(fundingInput),
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

      it('should throw if funding amount less than offer collateral satoshis', () => {
        instance.offerCollateral = BigInt(3e8);
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });
    });
  });
});
