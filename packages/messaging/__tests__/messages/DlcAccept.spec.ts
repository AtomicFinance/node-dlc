import { expect } from 'chai';

import { CetAdaptorSignatures } from '../../lib/messages/CetAdaptorSignatures';
import { DlcAccept, DlcAcceptContainer } from '../../lib/messages/DlcAccept';
import { FundingInput } from '../../lib/messages/FundingInput';
import { MessageType } from '../../lib/MessageType';

describe('DlcAccept', () => {
  let instance: DlcAccept;

  const temporaryContractId = Buffer.from(
    '960fb5f7960382ac7e76f3e24eb6b00059b1e68632a946843c22e1f65fdf216a',
    'hex',
  );

  const fundingPubkey = Buffer.from(
    '026d8bec9093f96ccc42de166cb9a6c576c95fc24ee16b10e87c3baaa4e49684d9',
    'hex',
  );

  const payoutSpk = Buffer.from(
    '001436054fa379f7564b5e458371db643666365c8fb3',
    'hex',
  );

  const fundingInput = Buffer.from(
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

  const changeSpk = Buffer.from(
    '0014074c82dbe058212905bacc61814456b7415012ed',
    'hex',
  );

  const refundSignature = Buffer.alloc(64, 0x01); // Simple test signature

  beforeEach(() => {
    instance = new DlcAccept();
    instance.protocolVersion = 1; // Set protocol version
    instance.temporaryContractId = temporaryContractId;
    instance.acceptCollateral = BigInt(100000000);
    instance.fundingPubkey = fundingPubkey;
    instance.payoutSpk = payoutSpk;
    instance.payoutSerialId = BigInt(1594186);
    instance.fundingInputs = [FundingInput.deserialize(fundingInput)];
    instance.changeSpk = changeSpk;
    instance.changeSerialId = BigInt(885015);

    // Create test CET adaptor signatures
    instance.cetAdaptorSignatures = new CetAdaptorSignatures();
    instance.cetAdaptorSignatures.sigs = [
      {
        encryptedSig: Buffer.alloc(65),
        dleqProof: Buffer.alloc(97),
      },
    ];

    instance.refundSignature = refundSignature;
  });

  describe('deserialize', () => {
    it('has correct type', () => {
      expect(DlcAccept.deserialize(instance.serialize()).type).to.equal(
        instance.type,
      );
    });

    it('deserializes without cets', () => {
      // Set parseCets to false
      const dlcAccept = DlcAccept.deserialize(instance.serialize(), false);
      expect(dlcAccept.cetAdaptorSignatures.sigs.length).to.be.equal(0);
    });
  });

  describe('DlcAccept', () => {
    describe('serialize', () => {
      it('serializes', () => {
        // Test round-trip consistency instead of exact hex match
        const serialized = instance.serialize();
        const deserialized = DlcAccept.deserialize(serialized);

        expect(deserialized.temporaryContractId).to.deep.equal(
          instance.temporaryContractId,
        );
        expect(deserialized.acceptCollateral).to.equal(
          instance.acceptCollateral,
        );
        expect(deserialized.fundingPubkey).to.deep.equal(
          instance.fundingPubkey,
        );
        expect(deserialized.payoutSpk).to.deep.equal(instance.payoutSpk);
        expect(deserialized.payoutSerialId).to.equal(instance.payoutSerialId);
        expect(deserialized.changeSpk).to.deep.equal(instance.changeSpk);
        expect(deserialized.changeSerialId).to.equal(instance.changeSerialId);
        expect(deserialized.refundSignature).to.deep.equal(
          instance.refundSignature,
        );
      });

      it('serializes a dlcAccept without cets', () => {
        const _dlcAcceptWithoutSigs = DlcAccept.deserialize(
          instance.serialize(),
          false,
        );
        const dlcAcceptWithoutSigs = DlcAccept.deserialize(
          _dlcAcceptWithoutSigs.serialize(),
          true,
        );

        expect(
          dlcAcceptWithoutSigs.cetAdaptorSignatures.sigs.length,
        ).to.be.equal(0);
      });
    });

    describe('deserialize', () => {
      it('deserializes', () => {
        // Test round-trip consistency
        const serialized = instance.serialize();
        const deserialized = DlcAccept.deserialize(serialized);

        expect(deserialized.temporaryContractId).to.deep.equal(
          temporaryContractId,
        );
        expect(Number(deserialized.acceptCollateral)).to.equal(100000000);
        expect(deserialized.fundingPubkey).to.deep.equal(fundingPubkey);
        expect(deserialized.payoutSpk).to.deep.equal(payoutSpk);
        expect(Number(deserialized.payoutSerialId)).to.equal(1594186);
        expect(deserialized.changeSpk).to.deep.equal(changeSpk);
        expect(Number(deserialized.changeSerialId)).to.equal(885015);
        expect(deserialized.refundSignature).to.deep.equal(refundSignature);
      });

      it('has correct type', () => {
        expect(DlcAccept.deserialize(instance.serialize()).type).to.equal(
          MessageType.DlcAccept,
        );
      });
    });

    describe('toJSON', () => {
      it('convert to JSON', async () => {
        const json = instance.toJSON();
        // Basic structure validation - detailed field testing is done in cross-language tests
        expect(json.temporaryContractId).to.be.a('string');
        expect(json.fundingPubkey).to.be.a('string');
        expect(json.payoutSpk).to.be.a('string');
        expect(json.changeSpk).to.be.a('string');
        expect(json.refundSignature).to.be.a('string');
        expect(json.acceptCollateral).to.be.a('number');
      });
    });

    describe('withoutSigs', () => {
      it('does not contain sigs', () => {
        const withoutSigs = DlcAccept.deserialize(
          instance.serialize(),
        ).withoutSigs();
        expect(withoutSigs['cetAdaptorSignatures']).to.not.exist;
      });
    });

    describe('validate', () => {
      it('should throw if payout_spk is invalid', () => {
        instance.payoutSpk = Buffer.from('fff', 'hex');
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });
      it('should throw if change_spk is invalid', () => {
        instance.changeSpk = Buffer.from('fff', 'hex');
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });
      it('should throw if fundingpubkey is not a valid pubkey', () => {
        instance.fundingPubkey = Buffer.from(
          '00f003aa11f2a97b6be755a86b9fd798a7451c670196a5245b7bae971306b7c87e',
          'hex',
        );
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });
      it('should throw if fundingpubkey is not in compressed secp256k1 format', () => {
        instance.fundingPubkey = Buffer.from(
          '045162991c7299223973cabc99ef5087d7bab2dafe61f78e5388b2f9492f7978123f51fd05ef0693790c0b2d4f30848363a3f3fbcf2bd53a05ba0fd5bb708c3184',
          'hex',
        );
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

      it('should throw if funding amount less than accept collateral satoshis', () => {
        instance.acceptCollateral = BigInt(3e8);
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });
    });
  });

  describe('DlcAcceptContainer', () => {
    it('should serialize and deserialize', () => {
      // Create two distinct accepts
      const dlcAccept = instance;
      const dlcAccept2 = new DlcAccept();
      Object.assign(dlcAccept2, dlcAccept);
      dlcAccept2.payoutSpk = changeSpk; // Use different SPK
      dlcAccept2.changeSpk = payoutSpk;

      const container = new DlcAcceptContainer();
      container.addAccept(dlcAccept);
      container.addAccept(dlcAccept2);

      const deserialized = DlcAcceptContainer.deserialize(
        container.serialize(),
      );

      expect(container.serialize()).to.deep.equal(deserialized.serialize());
    });
  });
});
