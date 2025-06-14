import { expect } from 'chai';

import { FundingSignatures } from '../../lib/messages/FundingSignatures';
import { ScriptWitnessV0 } from '../../lib/messages/ScriptWitnessV0';

describe('FundingSignatures', () => {
  let instance: FundingSignatures;

  beforeEach(() => {
    instance = new FundingSignatures();

    // Create test witness elements
    const witness1 = new ScriptWitnessV0();
    witness1.length = 71;
    witness1.witness = Buffer.alloc(71, 0x01);

    const witness2 = new ScriptWitnessV0();
    witness2.length = 33;
    witness2.witness = Buffer.alloc(33, 0x02);

    const witness3 = new ScriptWitnessV0();
    witness3.length = 65;
    witness3.witness = Buffer.alloc(65, 0x03);

    // Set up witness elements for two funding inputs
    instance.witnessElements = [
      [witness1, witness2], // First funding input
      [witness3], // Second funding input
    ];
  });

  describe('serialize and deserialize', () => {
    it('should round-trip correctly', () => {
      const serialized = instance.serialize();
      expect(serialized).to.be.instanceof(Buffer);
      expect(serialized.length).to.be.greaterThan(0);

      const deserialized = FundingSignatures.deserialize(serialized);
      expect(deserialized.witnessElements).to.have.length(2);

      // Check first funding input witnesses
      expect(deserialized.witnessElements[0]).to.have.length(2);
      expect(deserialized.witnessElements[0][0].length).to.equal(71);
      expect(deserialized.witnessElements[0][0].witness).to.deep.equal(
        Buffer.alloc(71, 0x01),
      );
      expect(deserialized.witnessElements[0][1].length).to.equal(33);
      expect(deserialized.witnessElements[0][1].witness).to.deep.equal(
        Buffer.alloc(33, 0x02),
      );

      // Check second funding input witnesses
      expect(deserialized.witnessElements[1]).to.have.length(1);
      expect(deserialized.witnessElements[1][0].length).to.equal(65);
      expect(deserialized.witnessElements[1][0].witness).to.deep.equal(
        Buffer.alloc(65, 0x03),
      );
    });
  });

  describe('toJSON', () => {
    it('should convert to canonical rust-dlc JSON format', () => {
      const json = instance.toJSON();
      expect(json.fundingSignatures).to.be.an('array');
      expect(json.fundingSignatures).to.have.length(2);

      // Check first funding input
      expect(json.fundingSignatures[0].witnessElements).to.have.length(2);
      expect(json.fundingSignatures[0].witnessElements[0].witness).to.be.a(
        'string',
      );
      expect(json.fundingSignatures[0].witnessElements[1].witness).to.be.a(
        'string',
      );

      // Check second funding input
      expect(json.fundingSignatures[1].witnessElements).to.have.length(1);
      expect(json.fundingSignatures[1].witnessElements[0].witness).to.be.a(
        'string',
      );
    });
  });
});
