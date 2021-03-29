import { expect } from 'chai';
import { StreamReader } from '@node-lightning/bufio';
import { Tx, Sequence } from '@node-dlc/bitcoin'; // TODO: switch to @node-lightning/bitcoin once parsing base tx is resolved: https://github.com/altangent/node-lightning/issues/167
import { FundingInputV0 } from '../../lib/messages/FundingInput';

describe('FundingInputV0', () => {
  const prevTx = Buffer.from(
    '02000000000100c2eb0b00000000160014e70dcc9ffa7ff84c889c9e79b218708bae3bc95800000000',
    'hex',
  );

  describe('serialize', () => {
    it('serializes', () => {
      const instance = new FundingInputV0();

      instance.length = BigInt(63);
      instance.inputSerialId = BigInt(56040);
      instance.prevTx = Tx.parse(StreamReader.fromBuffer(prevTx));
      instance.prevTxVout = 0;
      instance.sequence = Sequence.default();
      instance.maxWitnessLen = 107;
      instance.redeemScript = Buffer.from('', 'hex');

      expect(instance.serialize().toString("hex")).to.equal(
        "fda714" + // type
        "3f" + // length
        "000000000000dae8" + // input_serial_id
        "0029" + // prevtx_len
        "02000000000100c2eb0b00000000160014e70dcc9ffa7ff84c889c9e79b218708bae3bc95800000000" + // prevtx
        "00000000" + // prevtx_vout
        "ffffffff" + // sequence
        "006b" + // max_witness_len
        "0000" // redeemscript_len
      ); // prettier-ignore
    });
  });

  describe('deserialize', () => {
    it('deserializes', () => {
      const buf = Buffer.from(
        "fda714" + // type
        "3f" + // length
        "000000000000dae8" + // input_serial_id
        "0029" + // prevtx_len
        "02000000000100c2eb0b00000000160014e70dcc9ffa7ff84c889c9e79b218708bae3bc95800000000" + // prevtx
        "00000000" + // prevtx_vout
        "ffffffff" + // sequence
        "006b" + // max_witness_len
        "0000" // redeemscript_len
        , "hex"
      ); // prettier-ignore

      const instance = FundingInputV0.deserialize(buf);

      expect(Number(instance.length)).to.equal(63);
      expect(Number(instance.inputSerialId)).to.equal(56040);
      expect(instance.prevTx.serialize()).to.deep.equal(prevTx);
      expect(instance.prevTxVout).to.equal(0);
      expect(instance.sequence.value).to.equal(4294967295);
      expect(instance.maxWitnessLen).to.equal(107);
      expect(instance.redeemScript).to.deep.equal(Buffer.from('', 'hex'));
    });
  });
});
