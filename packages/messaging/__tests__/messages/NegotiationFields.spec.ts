import { expect } from 'chai';

import {
  DisjointNegotiationFields,
  NegotiationFields,
  SingleNegotiationFields,
} from '../../lib/messages/NegotiationFields';
import { RoundingIntervals } from '../../lib/messages/RoundingIntervals';

describe('NegotiationFields', () => {
  describe('SingleNegotiationFields', () => {
    describe('serialize', () => {
      it('serializes', () => {
        const instance = new SingleNegotiationFields();

        // Create RoundingIntervals programmatically
        const roundingIntervals = new RoundingIntervals();
        roundingIntervals.intervals = [
          {
            beginInterval: BigInt(5000),
            roundingMod: BigInt(10000),
          },
        ];
        instance.roundingIntervals = roundingIntervals;

        // Test that it serializes without errors
        const serialized = instance.serialize();
        expect(serialized).to.be.instanceof(Buffer);
        expect(serialized.length).to.be.greaterThan(0);

        // Should start with discriminator 0 (Single)
        expect(serialized[0]).to.equal(0);
      });
    });

    describe('deserialize', () => {
      it('deserializes', () => {
        // Create a test instance and serialize it first for round-trip testing
        const originalInstance = new SingleNegotiationFields();

        const roundingIntervals = new RoundingIntervals();
        roundingIntervals.intervals = [
          {
            beginInterval: BigInt(5000),
            roundingMod: BigInt(10000),
          },
        ];
        originalInstance.roundingIntervals = roundingIntervals;

        // Serialize and then deserialize to ensure round-trip consistency
        const serialized = originalInstance.serialize();
        const instance = NegotiationFields.deserialize(serialized);

        expect(instance).to.be.instanceof(SingleNegotiationFields);
        if (instance instanceof SingleNegotiationFields) {
          expect(instance.variant).to.equal('Single');
          expect(instance.discriminator).to.equal(0);
          expect(instance.roundingIntervals).to.be.instanceof(
            RoundingIntervals,
          );
          expect(instance.roundingIntervals.intervals.length).to.equal(1);
          expect(
            instance.roundingIntervals.intervals[0].beginInterval,
          ).to.equal(BigInt(5000));
          expect(instance.roundingIntervals.intervals[0].roundingMod).to.equal(
            BigInt(10000),
          );
        }
      });
    });

    describe('toJSON', () => {
      it('converts to JSON', () => {
        const instance = new SingleNegotiationFields();
        const roundingIntervals = new RoundingIntervals();
        roundingIntervals.intervals = [
          {
            beginInterval: BigInt(5000),
            roundingMod: BigInt(10000),
          },
        ];
        instance.roundingIntervals = roundingIntervals;

        const json = instance.toJSON();
        expect(json.variant).to.equal('Single');
        expect(json.roundingIntervals).to.exist;
      });
    });

    describe('fromJSON', () => {
      it('creates from JSON', () => {
        const json = {
          variant: 'Single',
          roundingIntervals: {
            intervals: [
              {
                beginInterval: 5000,
                roundingMod: 10000,
              },
            ],
          },
        };

        const instance = SingleNegotiationFields.fromJSON(json);
        expect(instance.variant).to.equal('Single');
        expect(instance.roundingIntervals.intervals.length).to.equal(1);
        expect(instance.roundingIntervals.intervals[0].beginInterval).to.equal(
          BigInt(5000),
        );
      });
    });
  });

  describe('DisjointNegotiationFields', () => {
    describe('serialize', () => {
      it('serializes', () => {
        const instance = new DisjointNegotiationFields();

        // Create nested SingleNegotiationFields instances
        const single1 = new SingleNegotiationFields();
        const roundingIntervals1 = new RoundingIntervals();
        roundingIntervals1.intervals = [
          {
            beginInterval: BigInt(5000),
            roundingMod: BigInt(10000),
          },
        ];
        single1.roundingIntervals = roundingIntervals1;

        const single2 = new SingleNegotiationFields();
        const roundingIntervals2 = new RoundingIntervals();
        roundingIntervals2.intervals = [
          {
            beginInterval: BigInt(1000),
            roundingMod: BigInt(5000),
          },
        ];
        single2.roundingIntervals = roundingIntervals2;

        instance.negotiationFields = [single1, single2];

        // Test that it serializes without errors
        const serialized = instance.serialize();
        expect(serialized).to.be.instanceof(Buffer);
        expect(serialized.length).to.be.greaterThan(0);

        // Should start with discriminator 1 (Disjoint)
        expect(serialized[0]).to.equal(1);
      });
    });

    describe('deserialize', () => {
      it('deserializes', () => {
        // Create a test instance and serialize it first for round-trip testing
        const originalInstance = new DisjointNegotiationFields();

        const single1 = new SingleNegotiationFields();
        const roundingIntervals1 = new RoundingIntervals();
        roundingIntervals1.intervals = [
          {
            beginInterval: BigInt(5000),
            roundingMod: BigInt(10000),
          },
        ];
        single1.roundingIntervals = roundingIntervals1;

        const single2 = new SingleNegotiationFields();
        const roundingIntervals2 = new RoundingIntervals();
        roundingIntervals2.intervals = [
          {
            beginInterval: BigInt(1000),
            roundingMod: BigInt(5000),
          },
        ];
        single2.roundingIntervals = roundingIntervals2;

        originalInstance.negotiationFields = [single1, single2];

        // Serialize and then deserialize to ensure round-trip consistency
        const serialized = originalInstance.serialize();
        const instance = NegotiationFields.deserialize(serialized);

        expect(instance).to.be.instanceof(DisjointNegotiationFields);
        if (instance instanceof DisjointNegotiationFields) {
          expect(instance.variant).to.equal('Disjoint');
          expect(instance.discriminator).to.equal(1);
          expect(instance.negotiationFields.length).to.equal(2);
          expect(instance.negotiationFields[0]).to.be.instanceof(
            SingleNegotiationFields,
          );
          expect(instance.negotiationFields[1]).to.be.instanceof(
            SingleNegotiationFields,
          );
        }
      });
    });

    describe('toJSON', () => {
      it('converts to JSON', () => {
        const instance = new DisjointNegotiationFields();
        const single = new SingleNegotiationFields();
        const roundingIntervals = new RoundingIntervals();
        roundingIntervals.intervals = [
          {
            beginInterval: BigInt(5000),
            roundingMod: BigInt(10000),
          },
        ];
        single.roundingIntervals = roundingIntervals;
        instance.negotiationFields = [single];

        const json = instance.toJSON();
        expect(json.variant).to.equal('Disjoint');
        expect(json.negotiationFields).to.be.an('array');
        expect(json.negotiationFields.length).to.equal(1);
      });
    });

    describe('fromJSON', () => {
      it('creates from JSON', () => {
        const json = {
          variant: 'Disjoint',
          negotiationFields: [
            {
              variant: 'Single',
              roundingIntervals: {
                intervals: [
                  {
                    beginInterval: 5000,
                    roundingMod: 10000,
                  },
                ],
              },
            },
          ],
        };

        const instance = DisjointNegotiationFields.fromJSON(json);
        expect(instance.variant).to.equal('Disjoint');
        expect(instance.negotiationFields.length).to.equal(1);
        expect(instance.negotiationFields[0]).to.be.instanceof(
          SingleNegotiationFields,
        );
      });
    });
  });

  describe('NegotiationFields static methods', () => {
    describe('deserialize', () => {
      it('deserializes Single variant', () => {
        const single = new SingleNegotiationFields();
        const roundingIntervals = new RoundingIntervals();
        roundingIntervals.intervals = [
          {
            beginInterval: BigInt(5000),
            roundingMod: BigInt(10000),
          },
        ];
        single.roundingIntervals = roundingIntervals;

        const serialized = single.serialize();
        const deserialized = NegotiationFields.deserialize(serialized);

        expect(deserialized).to.be.instanceof(SingleNegotiationFields);
      });

      it('deserializes Disjoint variant', () => {
        const disjoint = new DisjointNegotiationFields();
        const single = new SingleNegotiationFields();
        const roundingIntervals = new RoundingIntervals();
        roundingIntervals.intervals = [
          {
            beginInterval: BigInt(5000),
            roundingMod: BigInt(10000),
          },
        ];
        single.roundingIntervals = roundingIntervals;
        disjoint.negotiationFields = [single];

        const serialized = disjoint.serialize();
        const deserialized = NegotiationFields.deserialize(serialized);

        expect(deserialized).to.be.instanceof(DisjointNegotiationFields);
      });
    });

    describe('fromJSON', () => {
      it('creates Single variant from JSON', () => {
        const json = {
          variant: 'Single',
          roundingIntervals: {
            intervals: [
              {
                beginInterval: 5000,
                roundingMod: 10000,
              },
            ],
          },
        };

        const instance = NegotiationFields.fromJSON(json);
        expect(instance).to.be.instanceof(SingleNegotiationFields);
      });

      it('creates Disjoint variant from JSON', () => {
        const json = {
          variant: 'Disjoint',
          negotiationFields: [
            {
              variant: 'Single',
              roundingIntervals: {
                intervals: [
                  {
                    beginInterval: 5000,
                    roundingMod: 10000,
                  },
                ],
              },
            },
          ],
        };

        const instance = NegotiationFields.fromJSON(json);
        expect(instance).to.be.instanceof(DisjointNegotiationFields);
      });
    });
  });
});
