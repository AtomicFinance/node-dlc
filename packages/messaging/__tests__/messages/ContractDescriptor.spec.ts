import { expect } from 'chai';

import {
  ContractDescriptor,
  ContractDescriptorType,
  EnumeratedContractDescriptor,
  NumericContractDescriptor,
} from '../../lib/messages/ContractDescriptor';
import { MessageType } from '../../lib/MessageType';

describe('EnumeratedContractDescriptor', () => {
  const outcomeOne = '1';

  const payoutOne = BigInt(0);

  const outcomeTwo = '2';

  const payoutTwo = BigInt(153314211);

  const outcomeThree = '3';

  const payoutThree = BigInt(200000000);

  describe('serialize', () => {
    it('serializes', () => {
      const instance = new EnumeratedContractDescriptor();

      instance.outcomes = [
        { outcome: outcomeOne, localPayout: payoutOne },
        { outcome: outcomeTwo, localPayout: payoutTwo },
        { outcome: outcomeThree, localPayout: payoutThree },
      ];

      expect(instance.serialize().toString("hex")).to.equal(
        "00" + // type enumerated_contract_descriptor
        "03" + // num_outcomes
        "01" + // outcome_1_len
        "31" + // outcome_1
        "0000000000000000" + // payout_1
        "01" + // outcome_2_len
        "32" + // outcome_2
        "00000000092363a3" + // payout_2
        "01" + // outcome_3_len
        "33" + // outcome_3
        "000000000bebc200" // payout_3
      ); // prettier-ignore
    });
  });

  describe('deserialize', () => {
    it('deserializes', () => {
      const buf = Buffer.from(
        "00" + // type
        "03" + // num_outcomes
        "01" + // outcome_1_len
        "31" + // outcome_1
        "0000000000000000" + // payout_1
        "01" + // outcome_2_len
        "32" + // outcome_2
        "00000000092363a3" + // payout_2
        "01" + // outcome_3_len
        "33" + // outcome_3
        "000000000bebc200" // payout_3
        , "hex"
      ); // prettier-ignore

      const unknownInstance = ContractDescriptor.deserialize(buf);

      if (unknownInstance.type === ContractDescriptorType.Enumerated) {
        const instance = unknownInstance as EnumeratedContractDescriptor;

        expect(instance.outcomes.length).to.equal(3);
        expect(instance.outcomes[0].outcome).to.deep.equal(outcomeOne);
        expect(instance.outcomes[0].localPayout).to.equal(payoutOne);
        expect(instance.outcomes[1].outcome).to.deep.equal(outcomeTwo);
        expect(instance.outcomes[1].localPayout).to.equal(payoutTwo);
        expect(instance.outcomes[2].outcome).to.deep.equal(outcomeThree);
        expect(instance.outcomes[2].localPayout).to.equal(payoutThree);
      }
    });
  });
});
