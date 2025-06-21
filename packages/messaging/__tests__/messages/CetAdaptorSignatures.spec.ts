import { expect } from 'chai';

import { CetAdaptorSignatures } from '../../lib/messages/CetAdaptorSignatures';

describe('CetAdaptorSignatures', () => {
  let instance: CetAdaptorSignatures;

  // Use proper sizes: encrypted signatures are 65 bytes, DLEQ proofs are 97 bytes
  const encryptedSigOne = Buffer.alloc(65, 0x01);
  const dleqProofOne = Buffer.alloc(97, 0x02);
  const encryptedSigTwo = Buffer.alloc(65, 0x03);
  const dleqProofTwo = Buffer.alloc(97, 0x04);
  const encryptedSigThree = Buffer.alloc(65, 0x05);
  const dleqProofThree = Buffer.alloc(97, 0x06);

  beforeEach(() => {
    instance = new CetAdaptorSignatures();
    instance.sigs = [
      { encryptedSig: encryptedSigOne, dleqProof: dleqProofOne },
      { encryptedSig: encryptedSigTwo, dleqProof: dleqProofTwo },
      { encryptedSig: encryptedSigThree, dleqProof: dleqProofThree },
    ];
  });

  describe('serialize and deserialize', () => {
    it('should round-trip correctly', () => {
      const serialized = instance.serialize();
      expect(serialized).to.be.instanceof(Buffer);
      expect(serialized.length).to.be.greaterThan(0);

      const deserialized = CetAdaptorSignatures.deserialize(serialized);
      expect(deserialized.sigs).to.have.length(3);
      expect(deserialized.sigs[0].encryptedSig).to.deep.equal(encryptedSigOne);
      expect(deserialized.sigs[0].dleqProof).to.deep.equal(dleqProofOne);
      expect(deserialized.sigs[1].encryptedSig).to.deep.equal(encryptedSigTwo);
      expect(deserialized.sigs[1].dleqProof).to.deep.equal(dleqProofTwo);
      expect(deserialized.sigs[2].encryptedSig).to.deep.equal(
        encryptedSigThree,
      );
      expect(deserialized.sigs[2].dleqProof).to.deep.equal(dleqProofThree);
    });
  });

  describe('toJSON', () => {
    it('should convert to canonical rust-dlc JSON format', () => {
      const json = instance.toJSON();
      expect(json.ecdsaAdaptorSignatures).to.be.an('array');
      expect(json.ecdsaAdaptorSignatures).to.have.length(3);

      // Verify first signature combines encryptedSig + dleqProof
      const expectedSig1 = Buffer.concat([encryptedSigOne, dleqProofOne]);
      expect(json.ecdsaAdaptorSignatures[0].signature).to.equal(
        expectedSig1.toString('hex'),
      );
    });
  });
});
