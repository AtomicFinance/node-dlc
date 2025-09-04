import { BufferReader, BufferWriter } from '@node-dlc/bufio';
import { math, verify } from 'bip-schnorr';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';
import { OracleAnnouncement } from './OracleAnnouncement';

/**
 * Oracle attestation providing signatures over an outcome value.
 * This represents the oracle's actual attestation to a specific outcome.
 * Updated to match rust-dlc specification with 2-byte count prefixes.
 *
 * An attestation from an oracle providing signatures over an outcome value.
 * This is what the oracle publishes when they want to attest to a specific outcome.
 */
export class OracleAttestation implements IDlcMessage {
  public static type = MessageType.OracleAttestation;

  /**
   * Creates an Attestation from JSON data
   * @param json JSON object representing oracle announcement
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): OracleAttestation {
    const instance = new OracleAttestation();

    // Handle different field name variations
    instance.eventId = json.eventId;
    instance.oraclePublicKey = Buffer.from(
      json.oraclePublicKey || json.oraclePubkey || json.oracle_public_key,
      'hex',
    );

    instance.signatures = json.signatures.map((signature: string) =>
      Buffer.from(signature, 'hex'),
    );

    instance.outcomes = json.outcomes;

    return instance;
  }

  /**
   * Deserializes an oracle_attestation message
   * @param buf
   */
  public static deserialize(buf: Buffer): OracleAttestation {
    const instance = new OracleAttestation();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();

    // Detect format: old rust-dlc 0.4.0 (no event_id) vs new rust-dlc (with event_id)
    const currentPos = reader.position;

    try {
      // Try reading as new format (with event_id)
      const eventIdLength = reader.readBigSize();

      // If event ID length is reasonable (0-100 bytes), assume new format
      if (eventIdLength >= BigInt('0') && eventIdLength <= BigInt('100')) {
        if (eventIdLength === BigInt('0')) {
          instance.eventId = '';
        } else {
          const eventIdBuf = reader.readBytes(Number(eventIdLength));
          instance.eventId = eventIdBuf.toString();
        }
        instance.oraclePublicKey = reader.readBytes(32);
      } else {
        // Event ID length is unreasonable, probably old format without event_id
        reader.position = currentPos;
        instance.eventId = ''; // Default empty event ID for old format
        instance.oraclePublicKey = reader.readBytes(32);
      }
    } catch (error) {
      // If reading fails, assume old format without event_id
      reader.position = currentPos;
      instance.eventId = ''; // Default empty event ID for old format
      instance.oraclePublicKey = reader.readBytes(32);
    }

    const numSignatures = reader.readUInt16BE();

    for (let i = 0; i < numSignatures; i++) {
      const signature = reader.readBytes(64);
      instance.signatures.push(signature);
    }

    // Handle both rust-dlc format (with u16 count prefix) and DLCSpecs format (no count prefix)
    // Try to detect format by checking if next 2 bytes look like a reasonable outcome count
    if (!reader.eof) {
      const currentPos = reader.position;

      try {
        // Try reading as rust-dlc format (with u16 count prefix)
        const numOutcomes = reader.readUInt16BE();

        // Validate that this looks like a reasonable count
        // If it's > 1000 or the remaining bytes can't accommodate this many outcomes,
        // it's probably not a count prefix
        const remainingBytes = reader.buffer.length - reader.position;

        if (
          numOutcomes > 0 &&
          numOutcomes <= 1000 &&
          remainingBytes >= numOutcomes * 2
        ) {
          // Looks like rust-dlc format with u16 count prefix
          for (let i = 0; i < numOutcomes; i++) {
            const outcomeLen = reader.readBigSize();
            const outcomeBuf = reader.readBytes(Number(outcomeLen));
            instance.outcomes.push(outcomeBuf.toString());
          }
        } else {
          // Reset and try DLCSpecs format (no count prefix)
          reader.position = currentPos;
          while (!reader.eof) {
            const outcomeLen = reader.readBigSize();
            const outcomeBuf = reader.readBytes(Number(outcomeLen));
            instance.outcomes.push(outcomeBuf.toString());
          }
        }
      } catch (error) {
        // If reading as rust-dlc format fails, reset and try DLCSpecs format
        reader.position = currentPos;
        while (!reader.eof) {
          const outcomeLen = reader.readBigSize();
          const outcomeBuf = reader.readBytes(Number(outcomeLen));
          instance.outcomes.push(outcomeBuf.toString());
        }
      }
    }

    return instance;
  }

  /**
   * The type for oracle_attestation message. oracle_attestation = 55400
   */
  public type = OracleAttestation.type;

  public length: bigint;

  /** The identifier of the announcement. */
  public eventId: string;

  /** The public key of the oracle (32 bytes, x-only). */
  public oraclePublicKey: Buffer;

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
  public validate(announcement?: OracleAnnouncement): void {
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
    if (!this.oraclePublicKey || this.oraclePublicKey.length !== 32) {
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
        verify(this.oraclePublicKey, msg, sig);
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
  private validateAgainstAnnouncement(announcement: OracleAnnouncement): void {
    // Validate oracle public key matches announcement
    if (!this.oraclePublicKey.equals(announcement.oraclePublicKey)) {
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
   * Converts oracle_attestation to JSON
   */
  public toJSON(): OracleAttestationJSON {
    return {
      type: this.type,
      eventId: this.eventId,
      oraclePublicKey: this.oraclePublicKey.toString('hex'),
      signatures: this.signatures.map((sig) => sig.toString('hex')),
      outcomes: this.outcomes,
    };
  }

  /**
   * Serializes the oracle_attestation message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeBigSize(this.eventId.length);
    dataWriter.writeBytes(Buffer.from(this.eventId));
    dataWriter.writeBytes(this.oraclePublicKey);
    dataWriter.writeUInt16BE(this.signatures.length);

    for (const signature of this.signatures) {
      dataWriter.writeBytes(signature);
    }

    // Write outcomes with u16 count prefix (matching rust-dlc format)
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

export interface OracleAttestationJSON {
  type?: number; // Made optional for rust-dlc compatibility
  eventId: string;
  oraclePublicKey: string;
  signatures: string[];
  outcomes: string[];
}
