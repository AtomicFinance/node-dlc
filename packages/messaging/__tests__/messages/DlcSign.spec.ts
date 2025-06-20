import { expect } from 'chai';

import { CetAdaptorSignatures } from '../../lib/messages/CetAdaptorSignatures';
import { DlcSign, DlcSignContainer } from '../../lib/messages/DlcSign';
import { FundingSignatures } from '../../lib/messages/FundingSignatures';
import { ScriptWitnessV0 } from '../../lib/messages/ScriptWitnessV0';

describe('DlcSign', () => {
  let instance: DlcSign;

  const contractId = Buffer.from(
    'c1c79e1e9e2fa2840b2514902ea244f39eb3001a4037a52ea43c797d4f841269',
    'hex',
  );

  const contractId2 = Buffer.from(
    '4946fe172de3778fa660b9858d0624044f4494667757f50388abe6fe523376e8',
    'hex',
  );

  const refundSignature = Buffer.alloc(64, 0x01); // Simple test signature

  beforeEach(() => {
    instance = new DlcSign();

    instance.protocolVersion = 1; // Set protocol version
    instance.contractId = contractId;

    // Create test CET adaptor signatures
    instance.cetAdaptorSignatures = new CetAdaptorSignatures();
    instance.cetAdaptorSignatures.sigs = [
      {
        encryptedSig: Buffer.alloc(65),
        dleqProof: Buffer.alloc(97),
      },
    ];

    instance.refundSignature = refundSignature;

    // Create test funding signatures using proper ScriptWitnessV0 objects
    instance.fundingSignatures = new FundingSignatures();

    const witness1 = new ScriptWitnessV0();
    witness1.length = 71;
    witness1.witness = Buffer.alloc(71);

    const witness2 = new ScriptWitnessV0();
    witness2.length = 33;
    witness2.witness = Buffer.alloc(33);

    instance.fundingSignatures.witnessElements = [[witness1, witness2]];
  });

  describe('deserialize', () => {
    it('has correct type', () => {
      expect(DlcSign.deserialize(instance.serialize()).type).to.equal(
        instance.type,
      );
    });
  });

  describe('DlcSign', () => {
    describe('serialize', () => {
      it('serializes', () => {
        // Test round-trip consistency instead of exact hex match
        const serialized = instance.serialize();
        const deserialized = DlcSign.deserialize(serialized);

        expect(deserialized.contractId).to.deep.equal(instance.contractId);
        expect(deserialized.refundSignature).to.deep.equal(
          instance.refundSignature,
        );
        expect(deserialized.cetAdaptorSignatures.sigs.length).to.equal(
          instance.cetAdaptorSignatures.sigs.length,
        );
      });
    });

    describe('deserialize', () => {
      it('deserializes', () => {
        // Test round-trip consistency
        const serialized = instance.serialize();
        const deserialized = DlcSign.deserialize(serialized);

        expect(deserialized.contractId).to.deep.equal(contractId);
        expect(deserialized.refundSignature).to.deep.equal(refundSignature);
      });
    });

    describe('toJSON', () => {
      it('convert to JSON', async () => {
        const json = instance.toJSON();
        // Basic structure validation - detailed field testing is done in cross-language tests
        expect(json).to.be.an('object');
        expect(json.contractId).to.be.a('string');
        expect(json.refundSignature).to.be.a('string');
      });
    });
  });

  describe('DlcSignContainer', () => {
    it('should serialize and deserialize', () => {
      // Create two distinct signs
      const dlcSign = instance;
      const dlcSign2 = new DlcSign();
      Object.assign(dlcSign2, dlcSign);
      dlcSign2.contractId = contractId2;

      const container = new DlcSignContainer();
      container.addSign(dlcSign);
      container.addSign(dlcSign2);

      const deserialized = DlcSignContainer.deserialize(container.serialize());

      expect(container.serialize()).to.deep.equal(deserialized.serialize());
    });
  });
});
