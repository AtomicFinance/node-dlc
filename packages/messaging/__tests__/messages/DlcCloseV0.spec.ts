import { expect } from 'chai';
import { DlcCloseV0 } from '../../lib/messages/DlcClose';
import { FundingInputV0 } from '../../lib/messages/FundingInput';
import { MessageType } from '../../lib/MessageType';

describe('DlcCloseV0', () => {
  let instance: DlcCloseV0;

  const type = Buffer.from('2B67', 'hex');

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
    fundingInputsLen,
    fundingInputV0,
  ]);

  describe('serialize', () => {
    it('serializes', () => {
      const instance = new DlcCloseV0();

      instance.contractId = contractId;
      // instance.closeSignature = closeSignature;
      // instance.offerPayoutSatoshis = offerPayoutSatoshis;
      // instance.acceptPayoutSatoshis = acceptPayoutSatoshis;
      instance.fundingInputs = [FundingInputV0.deserialize(fundingInputV0)];

      expect(instance.serialize().toString("hex")).to.equal(
        "cbcc" +
        "c1c79e1e9e2fa2840b2514902ea244f39eb3001a4037a52ea43c797d4f841269"
        // "00" 
      ); // prettier-ignore
    });
  });

  describe('deserialize', () => {
    it('deserializes', () => {
      const buf = Buffer.from(
        "cbcc" +
        "c1c79e1e9e2fa2840b2514902ea244f39eb3001a4037a52ea43c797d4f841269"
        // "00" // cancel type
        , "hex"
      ); // prettier-ignore

      const instance = DlcCloseV0.deserialize(buf);

      expect(instance.contractId).to.deep.equal(contractId);
      // expect(instance.closeSignature).to.deep.equal(closeSignature);
      // expect(instance.offerPayoutSatoshis).to.deep.equal(offerPayoutSatoshis);
      // expect(instance.acceptPayoutSatoshis).to.deep.equal(acceptPayoutSatoshis);
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
});
