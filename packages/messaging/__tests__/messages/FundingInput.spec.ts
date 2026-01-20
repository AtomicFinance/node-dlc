import { expect } from 'chai';

import { FundingInput } from '../../lib/messages/FundingInput';

describe('FundingInput', () => {
  describe('serialization/deserialization', () => {
    it('should deserialize and serialize FundingInput message', () => {
      const fundingInput = FundingInput.fromJSON({
        inputSerialId: 1,
        prevTx:
          '0200000001f58f85b356ad5bb5b6d0ef3eb863be8a6cb95e08e1e9e92885b4b22e7e51eb9d0000000000ffffffff01008c8647000000002200201234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef00000000',
        prevTxVout: 0,
        sequence: 4294967295,
        maxWitnessLen: 108,
        redeemScript: '',
      });

      const serialized = fundingInput.serialize();
      const deserialized = FundingInput.deserialize(serialized);

      expect(deserialized.inputSerialId).to.equal(fundingInput.inputSerialId);
      expect(deserialized.prevTxVout).to.equal(fundingInput.prevTxVout);
      expect(deserialized.sequence.value).to.equal(fundingInput.sequence.value);
      expect(deserialized.maxWitnessLen).to.equal(fundingInput.maxWitnessLen);
      expect(deserialized.redeemScript).to.deep.equal(
        fundingInput.redeemScript,
      );
    });

    it('should handle FundingInput with optional DlcInput', () => {
      const fundingInputWithDlc = FundingInput.fromJSON({
        inputSerialId: 1,
        prevTx:
          '0200000001f58f85b356ad5bb5b6d0ef3eb863be8a6cb95e08e1e9e92885b4b22e7e51eb9d0000000000ffffffff01008c8647000000002200201234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef00000000',
        prevTxVout: 0,
        sequence: 4294967295,
        maxWitnessLen: 108,
        redeemScript: '',
        dlcInput: {
          localFundPubkey:
            '023da092f6980e58d2c037173180e9a465476026ee50f96695963e8efe436f54eb',
          remoteFundPubkey:
            '025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357',
          contractId:
            '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        },
      });

      // Test full serialize/deserialize
      const serialized = fundingInputWithDlc.serialize();
      const deserialized = FundingInput.deserialize(serialized);

      expect(deserialized.dlcInput).to.not.be.undefined;
      expect(deserialized.dlcInput!.localFundPubkey).to.deep.equal(
        fundingInputWithDlc.dlcInput!.localFundPubkey,
      );
      expect(deserialized.dlcInput!.remoteFundPubkey).to.deep.equal(
        fundingInputWithDlc.dlcInput!.remoteFundPubkey,
      );
      expect(deserialized.dlcInput!.contractId).to.deep.equal(
        fundingInputWithDlc.dlcInput!.contractId,
      );

      // Test body serialize/deserialize (used in DlcOffer)
      const serializedBody = fundingInputWithDlc.serializeBody();
      const deserializedBody = FundingInput.deserializeBody(serializedBody);

      expect(deserializedBody.dlcInput).to.not.be.undefined;
      expect(deserializedBody.dlcInput!.localFundPubkey).to.deep.equal(
        fundingInputWithDlc.dlcInput!.localFundPubkey,
      );
      expect(deserializedBody.dlcInput!.remoteFundPubkey).to.deep.equal(
        fundingInputWithDlc.dlcInput!.remoteFundPubkey,
      );
      expect(deserializedBody.dlcInput!.contractId).to.deep.equal(
        fundingInputWithDlc.dlcInput!.contractId,
      );
    });

    it('should handle FundingInput without DlcInput', () => {
      const fundingInputWithoutDlc = FundingInput.fromJSON({
        inputSerialId: 1,
        prevTx:
          '0200000001f58f85b356ad5bb5b6d0ef3eb863be8a6cb95e08e1e9e92885b4b22e7e51eb9d0000000000ffffffff01008c8647000000002200201234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef00000000',
        prevTxVout: 0,
        sequence: 4294967295,
        maxWitnessLen: 108,
        redeemScript: '',
      });

      // Test full serialize/deserialize
      const serialized = fundingInputWithoutDlc.serialize();
      const deserialized = FundingInput.deserialize(serialized);

      expect(deserialized.dlcInput).to.be.undefined;

      // Test body serialize/deserialize (used in DlcOffer)
      const serializedBody = fundingInputWithoutDlc.serializeBody();
      const deserializedBody = FundingInput.deserializeBody(serializedBody);

      expect(deserializedBody.dlcInput).to.be.undefined;
    });

    it('should use rust-dlc optional format (0x00/0x01 prefix)', () => {
      // Test without DlcInput - should have 0x00 byte at the end
      const fundingInputWithoutDlc = FundingInput.fromJSON({
        inputSerialId: 1,
        prevTx:
          '0200000001f58f85b356ad5bb5b6d0ef3eb863be8a6cb95e08e1e9e92885b4b22e7e51eb9d0000000000ffffffff01008c8647000000002200201234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef00000000',
        prevTxVout: 0,
        sequence: 4294967295,
        maxWitnessLen: 108,
        redeemScript: '',
      });

      const serializedBody = fundingInputWithoutDlc.serializeBody();
      // Last byte should be 0x00 indicating no DLC input
      expect(serializedBody[serializedBody.length - 1]).to.equal(0x00);

      // Test with DlcInput - should have 0x01 byte followed by DLC input data
      const fundingInputWithDlc = FundingInput.fromJSON({
        inputSerialId: 1,
        prevTx:
          '0200000001f58f85b356ad5bb5b6d0ef3eb863be8a6cb95e08e1e9e92885b4b22e7e51eb9d0000000000ffffffff01008c8647000000002200201234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef00000000',
        prevTxVout: 0,
        sequence: 4294967295,
        maxWitnessLen: 108,
        redeemScript: '',
        dlcInput: {
          localFundPubkey:
            '023da092f6980e58d2c037173180e9a465476026ee50f96695963e8efe436f54eb',
          remoteFundPubkey:
            '025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357',
          contractId:
            '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        },
      });

      const serializedBodyWithDlc = fundingInputWithDlc.serializeBody();

      // Find where the DLC input optional marker should be
      // It should be at: 8 (inputSerialId) + 1-9 (prevTx length) + prevTx.length + 4 (prevTxVout) + 4 (sequence) + 2 (maxWitnessLen) + 2 (redeemScript.length) + redeemScript.length
      const dlcInputMarkerIndex =
        serializedBodyWithDlc.length - (33 + 33 + 32 + 1); // DLC input data + marker (contractId is 32 bytes)
      expect(serializedBodyWithDlc[dlcInputMarkerIndex]).to.equal(0x01);
    });
  });

  describe('validate', () => {
    // Valid segwit transaction with P2WPKH output at index 0
    const validSegwitTx =
      '020000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff03520101ffffffff0200f2052a01000000160014f32b43ed1a9f5a7f09023af065a212d8a159c7f70000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf90120000000000000000000000000000000000000000000000000000000000000000000000000';

    it('should throw if output is not segwit (OP_RETURN)', () => {
      // Using output index 1 which is an OP_RETURN output (not a segwit output)
      const fundingInput = FundingInput.fromJSON({
        inputSerialId: 1,
        prevTx: validSegwitTx,
        prevTxVout: 1, // OP_RETURN output - not valid for funding
        sequence: 4294967295,
        maxWitnessLen: 108,
        redeemScript: '',
      });

      expect(function () {
        fundingInput.validate();
      }).to.throw('fundingInput must spend a segwit output');
    });

    it('should pass validation for P2WPKH output', () => {
      const fundingInput = FundingInput.fromJSON({
        inputSerialId: 1,
        prevTx: validSegwitTx,
        prevTxVout: 0, // P2WPKH output
        sequence: 4294967295,
        maxWitnessLen: 108,
        redeemScript: '',
      });

      expect(function () {
        fundingInput.validate();
      }).to.not.throw();
    });

    it('should pass validation for P2WSH output', () => {
      const fundingInput = FundingInput.fromJSON({
        inputSerialId: 1,
        prevTx:
          '0200000001f58f85b356ad5bb5b6d0ef3eb863be8a6cb95e08e1e9e92885b4b22e7e51eb9d0000000000ffffffff01008c8647000000002200201234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef00000000', // P2WSH output
        prevTxVout: 0,
        sequence: 4294967295,
        maxWitnessLen: 108,
        redeemScript: '',
      });

      expect(function () {
        fundingInput.validate();
      }).to.not.throw();
    });

    it('should throw if prevTxVout does not exist', () => {
      const fundingInput = FundingInput.fromJSON({
        inputSerialId: 1,
        prevTx: validSegwitTx,
        prevTxVout: 5, // Output index 5 doesn't exist
        sequence: 4294967295,
        maxWitnessLen: 108,
        redeemScript: '',
      });

      expect(function () {
        fundingInput.validate();
      }).to.throw('fundingInput prevTxVout 5 does not exist in prevTx');
    });
  });
});
