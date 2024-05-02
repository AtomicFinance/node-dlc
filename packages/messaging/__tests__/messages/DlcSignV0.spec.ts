import { expect } from 'chai';

import { BatchFundingGroup, MessageType } from '../../lib';
import { CetAdaptorSignaturesV0 } from '../../lib/messages/CetAdaptorSignaturesV0';
import {
  DlcSign,
  DlcSignContainer,
  DlcSignV0,
} from '../../lib/messages/DlcSign';
import { FundingSignaturesV0 } from '../../lib/messages/FundingSignaturesV0';

describe('DlcSign', () => {
  let instance: DlcSignV0;

  const type = Buffer.from('a71e', 'hex');

  const contractId = Buffer.from(
    'c1c79e1e9e2fa2840b2514902ea244f39eb3001a4037a52ea43c797d4f841269',
    'hex',
  );

  const contractId2 = Buffer.from(
    '4946fe172de3778fa660b9858d0624044f4494667757f50388abe6fe523376e8',
    'hex',
  );

  const cetAdaptorSignaturesV0 = Buffer.from(
    'fda716' + // type cet_adaptor_signatures_v0
      'fd01e7' + // length
      '03' + // nb_signatures
      '00c706fe7ed70197a77397fb7ce8445fcf1d0b239b4ab41ebdad4f76e0a671d7830470f4fef96d0838e8f3cec33176a6a427d777b57d256f8545b570cd70297291' + // ecdsa_adaptor_signature_1
      '0192f8ad4eb341ac2867d203360516028b967b46ef0e5d1603b59a7d8ebc81d655dd11673febcf098006eba74b3604d0a1da818208ea2833079505a3dee7392255f0682e5b357a7382aae6e5bdcc728b94c9d0a52fb6f49ac5cbe32804fcfb71b1' + // dleq_proof_1
      '0125e92381be588737f6ac5c28325c843c6551995880f830d926abd35ee3f8ed9fdfc47a5fd277d0df2a1f1d0bafba8efad7b127e2a232a4846ed90810c81e6575' + // ecdsa_adaptor_signature_2
      '0039dba803adb78100f20ca12b09b68a92b996b07a5ee47806379cedfa217848644f48d96ed6443ea7143adf1ce19a4386d0841b5071e31f5d3e4c479eab6a856b426c80d091da3de3959b29e4c2e3ae47ddba2758c2ca1c6a064dfee4671ba501' + // dleq_proof_2
      '0098f2595778a1596054ffcafb599f8f4a65c4215de757548c142d50b12eb67d4c1407690b808e33eba95fe818223886fd8e9ce4c758b4662636af663e00553763' + // ecdsa_adaptor_signature_3
      '00a915ee71914ee8ae2c18d55b397649c0057a01f0a85c6ecf1b0eb26f7485f21b24c89013e1cb15a4bf40256e52a66751f33de46032db0801975933be2977a1e37d5d5f2d43f48481cc68783dbfeb21a35c62c1ca2eb6ee2ccfc12b74e9fd7a08', // dleq_proof_3
    'hex',
  );

  const refundSignature = Buffer.from(
    'fbf56fbb4bbcb01d1be3169dfda6f465020ee89c1e368d4a91e36d0d4cc44e6123db348c223988dfe147d611ae9351d6e78cfb902e3d01beed0c909e52a3aae9',
    'hex',
  );

  const fundingSignaturesV0 = Buffer.from(
    'fda718' + // type funding_signatures_v0
      '70' + // length
      '0001' + // num_witnesses
      '0002' + // stack_len
      '0047' + // stack_element_len
      '304402203812d7d194d44ec68f244cc3fd68507c563ec8c729fdfa3f4a79395b98abe84f0220704ab3f3ffd9c50c2488e59f90a90465fccc2d924d67a1e98a133676bf52f37201' + // stack_element
      '0021' + // stack_element_len
      '02dde41aa1f21671a2e28ad92155d2d66e0b5428de15d18db4cbcf216bf00de919', // stack_element
    'hex',
  );

  const dlcSignHex = Buffer.concat([
    type,
    contractId,
    cetAdaptorSignaturesV0,
    refundSignature,
    fundingSignaturesV0,
  ]);

  beforeEach(() => {
    instance = new DlcSignV0();

    instance.contractId = contractId;
    instance.cetSignatures = CetAdaptorSignaturesV0.deserialize(
      cetAdaptorSignaturesV0,
    );
    instance.refundSignature = refundSignature;
    instance.fundingSignatures = FundingSignaturesV0.deserialize(
      fundingSignaturesV0,
    );
  });

  describe('deserialize', () => {
    it('should throw if incorrect type', () => {
      instance.type = 0x123 as MessageType;
      expect(function () {
        DlcSign.deserialize(instance.serialize());
      }).to.throw(Error);
    });

    it('has correct type', () => {
      expect(DlcSign.deserialize(instance.serialize()).type).to.equal(
        instance.type,
      );
    });
  });

  describe('DlcOfferV0', () => {
    describe('serialize', () => {
      it('serializes', () => {
        expect(instance.serialize().toString('hex')).to.equal(
          dlcSignHex.toString('hex'),
        );
      });
    });

    describe('deserialize', () => {
      it('deserializes', () => {
        const instance = DlcSignV0.deserialize(dlcSignHex);
        expect(instance.contractId).to.deep.equal(contractId);
        expect(instance.cetSignatures.serialize().toString('hex')).to.equal(
          cetAdaptorSignaturesV0.toString('hex'),
        );
        expect(instance.refundSignature).to.deep.equal(refundSignature);
        expect(instance.fundingSignatures.serialize().toString('hex')).to.equal(
          fundingSignaturesV0.toString('hex'),
        );
      });
    });

    describe('toJSON', () => {
      it('convert to JSON', async () => {
        const json = instance.toJSON();
        expect(json.contractId).to.equal(contractId.toString('hex'));
        expect(json.refundSignature).to.equal(refundSignature.toString('hex'));
      });
    });
  });

  describe('DlcSignContainer', () => {
    it('should serialize and deserialize', () => {
      const dlcSign = DlcSignV0.deserialize(dlcSignHex);
      // swap payout and change spk to differentiate between dlcaccepts
      const dlcSign2 = DlcSignV0.deserialize(dlcSignHex);
      dlcSign2.contractId = contractId2;

      const container = new DlcSignContainer();
      container.addSign(dlcSign);
      container.addSign(dlcSign2);

      const instance = DlcSignContainer.deserialize(container.serialize());

      expect(container.serialize()).to.deep.equal(instance.serialize());
    });
  });

  describe('TLV', () => {
    it('should serialize and deserialize batch funding groups', () => {
      const dlcSign = DlcSignV0.deserialize(dlcSignHex);

      const batchFundingGroup = BatchFundingGroup.deserialize(
        BatchFundingGroup.deserialize(
          Buffer.from(
            'fdff967900000000000005f5e100051561746f6d69632d656e67696e652d74726164652d311561746f6d69632d656e67696e652d74726164652d321561746f6d69632d656e67696e652d74726164652d331561746f6d69632d656e67696e652d74726164652d341561746f6d69632d656e67696e652d74726164652d35',
            'hex',
          ),
        ).serialize(),
      );

      batchFundingGroup.contractIds = [contractId, contractId2];
      batchFundingGroup.tempContractIds = [contractId, contractId2];

      dlcSign.batchFundingGroups = [batchFundingGroup];

      const instance = DlcSignV0.deserialize(dlcSign.serialize());

      expect(instance.batchFundingGroups[0].serialize()).to.deep.equal(
        batchFundingGroup.serialize(),
      );
    });
  });
});
