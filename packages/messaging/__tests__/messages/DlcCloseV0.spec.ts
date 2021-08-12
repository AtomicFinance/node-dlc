import { expect } from 'chai';

import { DlcClose, DlcCloseV0 } from '../../lib/messages/DlcClose';
import { FundingInputV0 } from '../../lib/messages/FundingInput';
import { MessageType } from '../../lib/MessageType';

describe('DlcClose', () => {
  let instance: DlcCloseV0;

  const type = Buffer.from('cbca', 'hex');

  const contractId = Buffer.from(
    'c1c79e1e9e2fa2840b2514902ea244f39eb3001a4037a52ea43c797d4f841269',
    'hex',
  );

  const closeSignature = Buffer.from(
    '7c8ad6de287b62a1ed1d74ed9116a5158abc7f97376d201caa88e0f9daad68fcda4c271cc003512e768f403a57e5242bd1f6aa1750d7f3597598094a43b1c7bb',
    'hex',
  );

  const offerPayoutSatoshis = Buffer.from('0000000005f5e100', 'hex');
  const acceptPayoutSatoshis = Buffer.from('0000000005f5e100', 'hex');
  const fundInputSerialId = Buffer.from('00000000075bcd15', 'hex');

  const fundingInputsLen = Buffer.from('0001', 'hex');
  const fundingInputV0 = Buffer.from(
    'fda714' + // type funding_input_v0
      '3f' + // length
      '000000000000dae8' + // input_serial_id
      '0029' + // prevtx_len
      '02000000000100c2eb0b000000001600149ea3bf2d6eb9c2ffa35e36f41e117403ed7fafe900000000' + // prevtx
      '00000000' + // prevtx_vout
      'ffffffff' + // sequence
      '006b' + // max_witness_len
      '0000', // redeem_script_len
    'hex',
  );

  const dlcCloseHex = Buffer.concat([
    type,
    contractId,
    closeSignature,
    offerPayoutSatoshis,
    acceptPayoutSatoshis,
    fundInputSerialId,
    fundingInputsLen,
    fundingInputV0,
  ]);

  beforeEach(() => {
    instance = new DlcCloseV0();
    instance.contractId = contractId;
    instance.closeSignature = closeSignature;
    instance.offerPayoutSatoshis = BigInt(100000000);
    instance.acceptPayoutSatoshis = BigInt(100000000);
    instance.fundInputSerialId = BigInt(123456789);
    instance.fundingInputs = [FundingInputV0.deserialize(fundingInputV0)];
  });

  describe('deserialize', () => {
    it('should throw if incorrect type', () => {
      instance.type = 0x123;
      expect(function () {
        DlcClose.deserialize(instance.serialize());
      }).to.throw(Error);
    });

    it('has correct type', () => {
      expect(DlcClose.deserialize(instance.serialize()).type).to.equal(
        instance.type,
      );
    });
  });

  describe('DlcCloseV0', () => {
    describe('serialize', () => {
      it('serializes', () => {
        expect(instance.serialize().toString('hex')).to.equal(
          dlcCloseHex.toString('hex'),
        );
      });
    });

    describe('deserialize', () => {
      it('deserializes', () => {
        const instance = DlcCloseV0.deserialize(dlcCloseHex);
        expect(instance.contractId).to.deep.equal(contractId);
        expect(instance.closeSignature).to.deep.equal(closeSignature);
        expect(Number(instance.offerPayoutSatoshis)).to.equal(100000000);
        expect(Number(instance.acceptPayoutSatoshis)).to.equal(100000000);
        expect(Number(instance.fundInputSerialId)).to.equal(123456789);
        expect(instance.fundingInputs[0].serialize().toString('hex')).to.equal(
          fundingInputV0.toString('hex'),
        );
      });

      it('has correct type', () => {
        expect(DlcCloseV0.deserialize(dlcCloseHex).type).to.equal(
          MessageType.DlcCloseV0,
        );
      });
    });

    describe('toJSON', () => {
      it('convert to JSON', async () => {
        const json = instance.toJSON();
        expect(json.contractId).to.equal(contractId.toString('hex'));
        expect(json.closeSignature).to.equal(closeSignature.toString('hex'));
        expect(json.fundInputSerialId).to.equal(
          Number(fundInputSerialId.readBigInt64BE()),
        );
        expect(json.fundingInputs[0].prevTx).to.equal(
          instance.fundingInputs[0].prevTx.serialize().toString('hex'),
        );
      });
    });

    describe('validate', () => {
      it('should throw if inputSerialIds arent unique', () => {
        instance.fundingInputs = [
          FundingInputV0.deserialize(fundingInputV0),
          FundingInputV0.deserialize(fundingInputV0),
        ];
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });
      it('should ensure funding inputs are segwit', () => {
        instance.fundingInputs = [FundingInputV0.deserialize(fundingInputV0)];
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });
    });
  });
});
