import { expect } from 'chai';

import {
  DisjointNegotiationFields,
  NegotiationFields,
  NegotiationFieldsType,
  SingleNegotiationFields,
} from '../../lib/messages/NegotiationFields';
import { RoundingIntervals } from '../../lib/messages/RoundingIntervals';

describe('NegotiationFields', () => {
  describe('SingleNegotiationFields', () => {
    describe('serialize', () => {
      it('serializes', () => {
        const instance = new SingleNegotiationFields();

        instance.roundingIntervals = RoundingIntervals.deserialize(
          Buffer.from(
            '01' + // num_rounding_intervals
              '0000000000001388' + // begin_interval
              '0000000000002710', // rounding_mod
            'hex',
          ),
        );

        expect(instance.serialize().toString('hex')).to.equal(
          '00' + // type single_negotiation_fields
            '01' + // num_rounding_intervals
            '0000000000001388' + // begin_interval
            '0000000000002710', // rounding_mod
        );
      });
    });

    describe('deserialize', () => {
      it('deserializes', () => {
        const buf = Buffer.from(
          "00" + // type single_negotiation_fields
          "01" + // num_rounding_intervals
          "0000000000001388" + // begin_interval
          "0000000000002710" // rounding_mod
          , "hex"
        ); // prettier-ignore

        const unknownInstance = NegotiationFields.deserialize(buf);

        if (unknownInstance.type === NegotiationFieldsType.Single) {
          const instance = unknownInstance as SingleNegotiationFields;

          expect(
            instance.roundingIntervals.serialize().toString('hex'),
          ).to.equal(
            '01' + // num_rounding_intervals
              '0000000000001388' + // begin_interval
              '0000000000002710', // rounding_mod
          );
        }
      });
    });
  });

  describe('DisjointNegotiationFields', () => {
    describe('serialize', () => {
      it('serializes', () => {
        const instance = new DisjointNegotiationFields();

        instance.negotiationFieldsList = [
          NegotiationFields.deserialize(
            Buffer.from(
              '00' + // type single_negotiation_fields
                '01' + // num_rounding_intervals
                '0000000000001388' + // begin_interval
                '0000000000002710', // rounding_mod
              'hex',
            ),
          ),
        ];

        expect(instance.serialize().toString('hex')).to.equal(
          '01' + // type disjoint_negotiation_fields
            '01' + // num_disjoint_events
            '00' + // type single_negotiation_fields
            '01' + // num_rounding_intervals
            '0000000000001388' + // begin_interval
            '0000000000002710', // rounding_mod
        );
      });
    });

    describe('deserialize', () => {
      it('deserializes', () => {
        const buf = Buffer.from(
          "01" + // type disjoint_negotiation_fields
          "01" + // num_disjoint_events
          "00" + // type single_negotiation_fields
          "01" + // num_rounding_intervals
          "0000000000001388" + // begin_interval
          "0000000000002710" // rounding_mod
          , "hex"
        ); // prettier-ignore

        const unknownInstance = NegotiationFields.deserialize(buf);

        if (unknownInstance.type === NegotiationFieldsType.Disjoint) {
          const instance = unknownInstance as DisjointNegotiationFields;

          expect(
            instance.negotiationFieldsList[0].serialize().toString('hex'),
          ).to.equal(
            '00' + // type single_negotiation_fields
              '01' + // num_rounding_intervals
              '0000000000001388' + // begin_interval
              '0000000000002710', // rounding_mod
          );
        }
      });
    });
  });
});
