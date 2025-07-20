import { expect } from 'chai';

import { DlcInput } from '../../lib/messages/DlcInput';

describe('DlcInput', () => {
  let dlcInput: DlcInput;

  const testData = {
    localFundPubkey:
      '023da092f6980e58d2c037173180e9a465476026ee50f96695963e8efe436f54eb',
    remoteFundPubkey:
      '025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357',
    contractId:
      '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', // 32-byte contract ID
  };

  beforeEach(() => {
    dlcInput = DlcInput.fromJSON(testData);
  });

  describe('fromJSON', () => {
    it('should create DlcInput from JSON with camelCase', () => {
      const input = DlcInput.fromJSON({
        localFundPubkey: testData.localFundPubkey,
        remoteFundPubkey: testData.remoteFundPubkey,
        contractId: testData.contractId,
      });

      expect(input.localFundPubkey).to.be.instanceOf(Buffer);
      expect(input.remoteFundPubkey).to.be.instanceOf(Buffer);
      expect(input.contractId).to.be.instanceOf(Buffer);
      expect(input.contractId.toString('hex')).to.equal(testData.contractId);
    });

    it('should create DlcInput from JSON with snake_case', () => {
      const input = DlcInput.fromJSON({
        local_fund_pubkey: testData.localFundPubkey,
        remote_fund_pubkey: testData.remoteFundPubkey,
        contract_id: testData.contractId,
      });

      expect(input.localFundPubkey).to.be.instanceOf(Buffer);
      expect(input.remoteFundPubkey).to.be.instanceOf(Buffer);
      expect(input.contractId).to.be.instanceOf(Buffer);
      expect(input.contractId.toString('hex')).to.equal(testData.contractId);
    });
  });

  describe('toJSON', () => {
    it('should convert DlcInput to JSON', () => {
      const json = dlcInput.toJSON();

      expect(json.localFundPubkey).to.equal(testData.localFundPubkey);
      expect(json.remoteFundPubkey).to.equal(testData.remoteFundPubkey);
      expect(json.contractId).to.equal(testData.contractId);
    });
  });

  describe('serialize/deserialize', () => {
    it('should serialize and deserialize correctly', () => {
      const serialized = dlcInput.serialize();
      const deserialized = DlcInput.deserialize(serialized);

      expect(deserialized.localFundPubkey).to.deep.equal(
        dlcInput.localFundPubkey,
      );
      expect(deserialized.remoteFundPubkey).to.deep.equal(
        dlcInput.remoteFundPubkey,
      );
      expect(deserialized.contractId).to.deep.equal(dlcInput.contractId);
    });

    it('should serialize and deserialize body correctly', () => {
      const serialized = dlcInput.serializeBody();
      const deserialized = DlcInput.deserializeBody(serialized);

      expect(deserialized.localFundPubkey).to.deep.equal(
        dlcInput.localFundPubkey,
      );
      expect(deserialized.remoteFundPubkey).to.deep.equal(
        dlcInput.remoteFundPubkey,
      );
      expect(deserialized.contractId).to.deep.equal(dlcInput.contractId);
    });
  });

  describe('validate', () => {
    it('should validate correct DlcInput', () => {
      expect(() => dlcInput.validate()).to.not.throw();
    });

    it('should throw error for missing localFundPubkey', () => {
      dlcInput.localFundPubkey = null as any;
      expect(() => dlcInput.validate()).to.throw('localFundPubkey is required');
    });

    it('should throw error for missing remoteFundPubkey', () => {
      dlcInput.remoteFundPubkey = null as any;
      expect(() => dlcInput.validate()).to.throw(
        'remoteFundPubkey is required',
      );
    });

    it('should throw error for invalid contractId', () => {
      dlcInput.contractId = Buffer.alloc(16); // Wrong size - should be 32 bytes
      expect(() => dlcInput.validate()).to.throw(
        'contractId must be a 32-byte buffer',
      );
    });
  });
});
