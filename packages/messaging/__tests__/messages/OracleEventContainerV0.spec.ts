import { expect } from 'chai';

import { EnumEventDescriptorV0 } from '../../lib/messages/EventDescriptor';
import { OracleAnnouncement } from '../../lib/messages/OracleAnnouncement';
import { OracleAttestation } from '../../lib/messages/OracleAttestation';
import { OracleEventContainerV0 } from '../../lib/messages/OracleEventContainerV0';
import { OracleEvent } from '../../lib/messages/OracleEvent';

describe('OracleEventContainerV0', () => {
  function createTestOracleAnnouncement(): OracleAnnouncement {
    const announcement = new OracleAnnouncement();
    announcement.announcementSig = Buffer.from(
      'fab22628f6e2602e1671c286a2f63a9246794008627a1749639217f4214cb4a9494c93d1a852221080f44f697adb4355df59eb339f6ba0f9b01ba661a8b108d4',
      'hex',
    );
    announcement.oraclePubkey = Buffer.from(
      'da078bbb1d34e7729e38e2ae34236e776da121af442626fa31e31ae55a279a0b',
      'hex',
    );

    const oracleEvent = new OracleEvent();
    oracleEvent.oracleNonces = [
      Buffer.from(
        '3cfba011378411b20a5ab773cb95daab93e9bcd1e4cce44986a7dda84e01841b',
        'hex',
      ),
    ];
    oracleEvent.eventMaturityEpoch = 0;

    const eventDescriptor = new EnumEventDescriptorV0();
    eventDescriptor.outcomes = ['dummy1', 'dummy2'];
    oracleEvent.eventDescriptor = eventDescriptor;
    oracleEvent.eventId = 'dummy';

    announcement.oracleEvent = oracleEvent;
    return announcement;
  }

  function createTestOracleAttestation(): OracleAttestation {
    const attestation = new OracleAttestation();
    attestation.eventId = 'BTC-USD-OVER-50K-COINBASE';
    attestation.oraclePubkey = Buffer.from(
      '1d5dcdba2e64cb116cc0c375a0856298f0058b778f46bfe625ac6576204889e4',
      'hex',
    );
    attestation.signatures.push(
      Buffer.from(
        '424c11a44c2e522f90bbe4abab6ec1bc8ab44c9b29316ce6e1d0d7d08385a474de6b75f1da183a2a4f9ad144b48bf1026cee9687221df58f04128db79ca17e2a',
        'hex',
      ),
    );
    attestation.outcomes.push('NO');
    return attestation;
  }

  describe('serialize', () => {
    it('serializes', () => {
      const instance = new OracleEventContainerV0();

      instance.oracleName = 'Atomic';
      instance.uri = '';
      instance.announcement = createTestOracleAnnouncement();
      instance.attestation = createTestOracleAttestation();
      instance.outcome = '45354';

      // Test that it serializes without errors (new dlcspecs PR #163 format)
      const serialized = instance.serialize();
      expect(serialized).to.be.instanceof(Buffer);
      expect(serialized.length).to.be.greaterThan(0);
    });
  });

  describe('deserialize', () => {
    it('deserializes', () => {
      // Create a test instance and serialize it first for round-trip testing
      const originalInstance = new OracleEventContainerV0();
      originalInstance.oracleName = 'Atomic';
      originalInstance.uri = '';
      originalInstance.announcement = createTestOracleAnnouncement();
      originalInstance.attestation = createTestOracleAttestation();
      originalInstance.outcome = '45354';

      // Serialize and then deserialize to ensure round-trip consistency
      const serialized = originalInstance.serialize();
      const instance = OracleEventContainerV0.deserialize(serialized);

      expect(Number(instance.length)).to.be.greaterThan(0); // Length is calculated automatically
      expect(instance.oracleName).to.equal('Atomic');
      expect(instance.uri).to.equal('');
      expect(instance.announcement).to.be.instanceof(OracleAnnouncement);
      expect(instance.attestation).to.be.instanceof(OracleAttestation);
      expect(instance.outcome).to.equal('45354');
    });
  });
});
