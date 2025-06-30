import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

import { OracleAnnouncement } from '../../lib/messages/OracleAnnouncement';
import { OracleAttestation } from '../../lib/messages/OracleAttestation';

// Load test vectors
const testVectorsPath = path.join(
  __dirname,
  '../../test_vectors/oracle/oracle_message_test_vectors.json',
);
const testVectors = JSON.parse(fs.readFileSync(testVectorsPath, 'utf8'));

describe('OracleAttestation', () => {
  const attestationSig = Buffer.from(
    '424c11a44c2e522f90bbe4abab6ec1bc8ab44c9b29316ce6e1d0d7d08385a474' +
      'de6b75f1da183a2a4f9ad144b48bf1026cee9687221df58f04128db79ca17e2a',
    'hex',
  );

  const oraclePubkey = Buffer.from(
    '1d5dcdba2e64cb116cc0c375a0856298f0058b778f46bfe625ac6576204889e4',
    'hex',
  );

  const invalidOraclePubkey = Buffer.from(
    '5d1bcfab252c6dd9edd7aea4c5eeeef138f7ff7346061ea40143a9f5ae80baa9',
    'hex',
  );

  describe('serialize', () => {
    it('serializes', () => {
      const instance = new OracleAttestation();

      instance.eventId = 'BTC-USD-OVER-50K-COINBASE';
      instance.oraclePubkey = oraclePubkey;
      instance.signatures.push(attestationSig);
      instance.outcomes.push('NO');

      // Test that it serializes without errors (new dlcspecs PR #163 format)
      const serialized = instance.serialize();
      expect(serialized).to.be.instanceof(Buffer);
      expect(serialized.length).to.be.greaterThan(0);
    });
  });

  describe('deserialize', () => {
    it('deserializes', () => {
      // Create a test instance and serialize it first for round-trip testing
      const originalInstance = new OracleAttestation();
      originalInstance.eventId = 'BTC-USD-OVER-50K-COINBASE';
      originalInstance.oraclePubkey = oraclePubkey;
      originalInstance.signatures.push(attestationSig);
      originalInstance.outcomes.push('NO');

      // Serialize and then deserialize to ensure round-trip consistency
      const serialized = originalInstance.serialize();
      const instance = OracleAttestation.deserialize(serialized);

      expect(Number(instance.length)).to.be.greaterThan(0); // Length is calculated automatically
      expect(instance.eventId).to.equal('BTC-USD-OVER-50K-COINBASE');
      expect(instance.oraclePubkey).to.deep.equal(oraclePubkey);
      expect(instance.signatures[0]).to.deep.equal(attestationSig);
      expect(instance.outcomes[0]).to.equal('NO');
    });
  });

  describe('validate', () => {
    it('should validate when correct outcome signatures', () => {
      const instance = new OracleAttestation();

      instance.eventId = 'BTC-USD-OVER-50K-COINBASE';
      instance.oraclePubkey = oraclePubkey;
      instance.signatures.push(attestationSig);
      instance.outcomes.push('NO');

      expect(function () {
        instance.validate();
      }).to.not.throw(Error);
    });

    it('should invalidate when incorrect outcome signatures', () => {
      const instance = new OracleAttestation();

      instance.eventId = 'BTC-USD-OVER-50K-COINBASE';
      instance.oraclePubkey = invalidOraclePubkey;
      instance.signatures.push(attestationSig);
      instance.outcomes.push('NO');

      expect(function () {
        instance.validate();
      }).to.throw(Error);
    });
  });

  /**
   * Comprehensive Test Vectors
   * Tests oracle attestations from various implementations and oracle providers
   */
  describe('comprehensive attestation test vectors', () => {
    describe('Atomic Finance attestation', () => {
      let announcement: OracleAnnouncement;
      let instance: OracleAttestation;

      before(() => {
        const announcementBuf = Buffer.from(
          testVectors.atomic.announcement,
          'hex',
        );
        announcement = OracleAnnouncement.deserialize(announcementBuf);
        const attestationBuf = Buffer.from(
          testVectors.atomic.attestation,
          'hex',
        );
        instance = OracleAttestation.deserialize(attestationBuf);
      });

      it('deserializes Atomic oracle attestation', () => {
        expect(Number(instance.length)).to.be.greaterThan(0);
        expect(instance.eventId).to.equal(testVectors.atomic.metadata.eventId);
        expect(instance.oraclePubkey).to.be.instanceOf(Buffer);
        expect(instance.oraclePubkey.length).to.equal(32);
        expect(instance.signatures).to.be.an('array');
        expect(instance.outcomes).to.be.an('array');
        expect(instance.signatures.length).to.equal(instance.outcomes.length);
      });

      it('validates Atomic oracle attestation', () => {
        expect(() => instance.validate()).to.not.throw();
      });

      it('validates against corresponding announcement', () => {
        expect(() => instance.validate(announcement)).to.not.throw();
      });

      it('has correct number of signatures for digit decomposition', () => {
        expect(instance.signatures).to.have.length(18); // 18-digit binary decomposition
        expect(instance.outcomes).to.have.length(18);
      });

      it('has binary outcomes (0 or 1)', () => {
        instance.outcomes.forEach((outcome) => {
          expect(['0', '1']).to.include(outcome);
        });
      });

      it('round-trip serialization works', () => {
        const serialized = instance.serialize();
        const deserialized = OracleAttestation.deserialize(serialized);
        expect(deserialized.eventId).to.equal(instance.eventId);
        expect(deserialized.oraclePubkey).to.deep.equal(instance.oraclePubkey);
        expect(deserialized.outcomes).to.deep.equal(instance.outcomes);
      });
    });

    describe('Lava attestation', () => {
      let instance: OracleAttestation;

      before(() => {
        const announcementBuf = Buffer.from(
          testVectors.lava.announcement,
          'hex',
        );
        OracleAnnouncement.deserialize(announcementBuf); // ensure announcement deserializes
        const attestationBuf = Buffer.from(testVectors.lava.attestation, 'hex');
        instance = OracleAttestation.deserialize(attestationBuf);
      });

      it('deserializes Lava oracle attestation', () => {
        expect(Number(instance.length)).to.be.greaterThan(0);
        expect(instance.eventId).to.be.a('string');
        expect(instance.oraclePubkey).to.be.instanceOf(Buffer);
        expect(instance.oraclePubkey.length).to.equal(32);
        expect(instance.signatures).to.be.an('array');
        expect(instance.outcomes).to.be.an('array');
        expect(instance.signatures.length).to.equal(instance.outcomes.length);
      });

      it('has correct number of signatures for digit decomposition', () => {
        expect(instance.signatures).to.have.length(18); // 18-digit binary decomposition
        expect(instance.outcomes).to.have.length(18);
      });

      it('has binary outcomes (0 or 1)', () => {
        instance.outcomes.forEach((outcome) => {
          expect(['0', '1']).to.include(outcome);
        });
      });

      it('round-trip serialization works', () => {
        const serialized = instance.serialize();
        const deserialized = OracleAttestation.deserialize(serialized);
        expect(deserialized.eventId).to.equal(instance.eventId);
        expect(deserialized.oraclePubkey).to.deep.equal(instance.oraclePubkey);
        expect(deserialized.outcomes).to.deep.equal(instance.outcomes);
      });
    });

    describe('rust-dlc enum oracle', () => {
      let instance: OracleAttestation;

      before(() => {
        const announcementBuf = Buffer.from(
          testVectors.rust_dlc_enum.announcement,
          'hex',
        );
        OracleAnnouncement.deserialize(announcementBuf); // ensure announcement deserializes
        const attestationBuf = Buffer.from(
          testVectors.rust_dlc_enum.attestation,
          'hex',
        );
        instance = OracleAttestation.deserialize(attestationBuf);
      });

      it('deserializes rust-dlc enum oracle attestation', () => {
        expect(Number(instance.length)).to.be.greaterThan(0);
        expect(instance.eventId).to.equal('sports-match-001');
        expect(instance.oraclePubkey).to.be.instanceOf(Buffer);
        expect(instance.oraclePubkey.length).to.equal(32);
        expect(instance.signatures).to.be.an('array');
        expect(instance.outcomes).to.be.an('array');
        expect(instance.signatures.length).to.equal(instance.outcomes.length);
      });

      it('has single signature for enum event', () => {
        expect(instance.signatures).to.have.length(1);
        expect(instance.outcomes).to.have.length(1);
      });

      it('has valid enum outcome', () => {
        expect(instance.outcomes[0]).to.equal('win');
        expect(['win', 'lose', 'draw']).to.include(instance.outcomes[0]);
      });

      it('round-trip serialization works', () => {
        const serialized = instance.serialize();
        const deserialized = OracleAttestation.deserialize(serialized);
        expect(deserialized.eventId).to.equal(instance.eventId);
        expect(deserialized.oraclePubkey).to.deep.equal(instance.oraclePubkey);
        expect(deserialized.outcomes).to.deep.equal(instance.outcomes);
      });
    });

    describe('rust-dlc numeric oracle', () => {
      let instance: OracleAttestation;

      before(() => {
        const attestationBuf = Buffer.from(
          testVectors.rust_dlc_numeric.attestation,
          'hex',
        );
        instance = OracleAttestation.deserialize(attestationBuf);
      });

      it('deserializes rust-dlc numeric oracle attestation', () => {
        expect(Number(instance.length)).to.be.greaterThan(0);
        expect(instance.eventId).to.equal('btc-price-test');
        expect(instance.oraclePubkey).to.be.instanceOf(Buffer);
        expect(instance.oraclePubkey.length).to.equal(32);
        expect(instance.signatures).to.be.an('array');
        expect(instance.outcomes).to.be.an('array');
        expect(instance.signatures.length).to.equal(instance.outcomes.length);
      });

      it('has correct number of signatures for 8-digit decomposition', () => {
        expect(instance.signatures).to.have.length(8); // 8-digit binary decomposition
        expect(instance.outcomes).to.have.length(8);
      });

      it('has binary outcomes (0 or 1)', () => {
        instance.outcomes.forEach((outcome) => {
          expect(['0', '1']).to.include(outcome);
        });
      });

      it('represents number 42 in binary (00101010)', () => {
        // Outcomes are in little-endian order (LSB first)
        const expectedBinary = ['0', '1', '0', '1', '0', '1', '0', '0'];
        expect(instance.outcomes).to.deep.equal(expectedBinary);
      });

      it('round-trip serialization works', () => {
        const serialized = instance.serialize();
        const deserialized = OracleAttestation.deserialize(serialized);
        expect(deserialized.eventId).to.equal(instance.eventId);
        expect(deserialized.oraclePubkey).to.deep.equal(instance.oraclePubkey);
        expect(deserialized.outcomes).to.deep.equal(instance.outcomes);
      });
    });

    describe('cross-validation tests', () => {
      it('attestations have consistent event IDs with announcements', () => {
        const testCases = [
          {
            announcement: testVectors.atomic.announcement,
            attestation: testVectors.atomic.attestation,
          },
          {
            announcement: testVectors.lava.announcement,
            attestation: testVectors.lava.attestation,
          },
          {
            announcement: testVectors.rust_dlc_enum.announcement,
            attestation: testVectors.rust_dlc_enum.attestation,
          },
          {
            announcement: testVectors.rust_dlc_numeric.announcement,
            attestation: testVectors.rust_dlc_numeric.attestation,
          },
        ];
        testCases.forEach((testCase) => {
          const announcement = OracleAnnouncement.deserialize(
            Buffer.from(testCase.announcement, 'hex'),
          );
          const attestation = OracleAttestation.deserialize(
            Buffer.from(testCase.attestation, 'hex'),
          );
          expect(attestation.eventId).to.equal(announcement.getEventId());
        });
      });
    });
  });
});
