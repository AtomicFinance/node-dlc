import { expect } from 'chai';
import { DlcCloseV0 } from '../../lib/messages/DlcClose';
import { FundingInputV0 } from '../../lib/messages/FundingInput';

describe('DlcCloseV0', () => {
  const contractId = Buffer.from(
    'c1c79e1e9e2fa2840b2514902ea244f39eb3001a4037a52ea43c797d4f841269',
    'hex',
  );

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
      // expect(DlcCloseV0.deserialize(dlcCloseHex).type).to.equal(
      //   MessageType.DlcCloseV0,
      // );
    });
  });
});
