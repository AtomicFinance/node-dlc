import { BufferReader, BufferWriter } from '@node-dlc/bufio';
import { math, verify } from 'bip-schnorr';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';
import { OracleAnnouncementV0 } from './OracleAnnouncementV0';

/**
 * Oracle attestation providing signatures over an outcome value.
 * This represents the oracle's actual attestation to a specific outcome.
 * Updated to match rust-dlc specification.
 *
 * An attestation from an oracle providing signatures over an outcome value.
 * This is what the oracle publishes when they want to attest to a specific outcome.
 */
export class OracleAttestationV0 implements IDlcMessage {
  public static type = MessageType.OracleAttestationV0;

  /**
   * Deserializes an oracle_attestation_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): OracleAttestationV0 {
    const instance = new OracleAttestationV0();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();

    const eventIdLength = reader.readBigSize();
    const eventIdBuf = reader.readBytes(Number(eventIdLength));
    instance.eventId = eventIdBuf.toString();

    instance.oraclePubkey = reader.readBytes(32);

    const numSignatures = reader.readUInt16BE();

    for (let i = 0; i < numSignatures; i++) {
      const signature = reader.readBytes(64);
      instance.signatures.push(signature);
    }

    const numOutcomes = reader.readUInt16BE();
    for (let i = 0; i < numOutcomes; i++) {
      const outcomeLen = reader.readBigSize();
      const outcomeBuf = reader.readBytes(Number(outcomeLen));
      instance.outcomes.push(outcomeBuf.toString());
    }

    return instance;
  }

  /**
   * The type for oracle_attestation_v0 message. oracle_attestation_v0 = 55400
   */
  public type = OracleAttestationV0.type;

  public length: bigint;

  /** The identifier of the announcement. */
  public eventId: string;

  /** The public key of the oracle (32 bytes, x-only). */
  public oraclePubkey: Buffer;

  /** The signatures over the event outcome (64 bytes each, Schnorr format). */
  public signatures: Buffer[] = [];

  /** The set of strings representing the outcome value. */
  public outcomes: string[] = [];

  /**
   * Validates the oracle attestation according to rust-dlc specification.
   * This includes validating signatures and ensuring consistency with announcement.
   * @param announcement The corresponding oracle announcement for validation (optional)
   * @throws Will throw an error if validation fails
   */
  public validate(announcement?: OracleAnnouncementV0): void {
    // Basic structure validation
    if (this.signatures.length !== this.outcomes.length) {
      throw new Error('Number of signatures must match number of outcomes');
    }

    if (this.signatures.length === 0) {
      throw new Error('Must have at least one signature and outcome');
    }

    // Validate event ID
    if (!this.eventId || this.eventId.length === 0) {
      throw new Error('Event ID cannot be empty');
    }

    // Validate oracle public key format
    if (!this.oraclePubkey || this.oraclePubkey.length !== 32) {
      throw new Error('Oracle public key must be 32 bytes (x-only format)');
    }

    // Validate signature formats
    this.signatures.forEach((sig, index) => {
      if (!sig || sig.length !== 64) {
        throw new Error(
          `Signature at index ${index} must be 64 bytes (Schnorr format)`,
        );
      }
    });

    // Validate outcomes are not empty
    this.outcomes.forEach((outcome, index) => {
      if (!outcome || outcome.length === 0) {
        throw new Error(`Outcome at index ${index} cannot be empty`);
      }
    });

    // Verify signatures over outcomes using tagged hash
    this.signatures.forEach((sig, index) => {
      const outcome = this.outcomes[index];
      try {
        const msg = math.taggedHash('DLC/oracle/attestation/v0', outcome);
        verify(this.oraclePubkey, msg, sig);
      } catch (error) {
        throw new Error(
          `Invalid signature for outcome "${outcome}" at index ${index}: ${error.message}`,
        );
      }
    });

    // If announcement is provided, validate consistency
    if (announcement) {
      this.validateAgainstAnnouncement(announcement);
    }
  }

  /**
   * Validates the attestation against the corresponding oracle announcement.
   * This ensures the attestation is consistent with the original announcement.
   * @param announcement The oracle announcement to validate against
   * @throws Will throw an error if validation fails
   */
  private validateAgainstAnnouncement(
    announcement: OracleAnnouncementV0,
  ): void {
    // Validate oracle public key matches announcement
    if (!this.oraclePubkey.equals(announcement.oraclePubkey)) {
      throw new Error('Oracle public key must match announcement');
    }

    // Validate event ID matches
    if (this.eventId !== announcement.getEventId()) {
      throw new Error('Event ID must match announcement');
    }

    // Validate that the number of signatures matches the number of nonces in announcement
    const announcementNonces = announcement.getNonces();
    if (this.signatures.length !== announcementNonces.length) {
      throw new Error(
        'Number of signatures must match number of nonces in announcement',
      );
    }

    // Extract nonces from signatures (first 32 bytes) and compare with announcement nonces
    // This validates that the signatures were created using the committed nonces
    this.signatures.forEach((sig, index) => {
      const nonceFromSig = sig.slice(0, 32);
      const expectedNonce = announcementNonces[index];

      if (!nonceFromSig.equals(expectedNonce)) {
        throw new Error(
          `Signature nonce mismatch at index ${index}: signature was not created with announced nonce`,
        );
      }
    });
  }

  /**
   * Returns the nonces used by the oracle to sign the event outcome.
   * This is used for finding the matching oracle announcement.
   * The nonce is extracted from the first 32 bytes of each signature.
   */
  public getNonces(): Buffer[] {
    return this.signatures.map((sig) => sig.slice(0, 32));
  }

  /**
   * Converts oracle_attestation_v0 to JSON
   */
  public toJSON(): OracleAttestationV0JSON {
    return {
      type: this.type,
      eventId: this.eventId,
      oraclePubkey: this.oraclePubkey.toString('hex'),
      signatures: this.signatures.map((sig) => sig.toString('hex')),
      outcomes: this.outcomes,
    };
  }

  /**
   * Serializes the oracle_attestation_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeBigSize(this.eventId.length);
    dataWriter.writeBytes(Buffer.from(this.eventId));
    dataWriter.writeBytes(this.oraclePubkey);
    dataWriter.writeUInt16BE(this.signatures.length);

    for (const signature of this.signatures) {
      dataWriter.writeBytes(signature);
    }

    dataWriter.writeUInt16BE(this.outcomes.length);
    for (const outcome of this.outcomes) {
      dataWriter.writeBigSize(outcome.length);
      dataWriter.writeBytes(Buffer.from(outcome));
    }

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

export interface OracleAttestationV0JSON {
  type: number;
  eventId: string;
  oraclePubkey: string;
  signatures: string[];
  outcomes: string[];
}
