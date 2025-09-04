import { BufferReader, BufferWriter } from '@node-dlc/bufio';
import { math, verify } from 'bip-schnorr';

import { MessageType } from '../MessageType';
import { getTlv } from '../serialize/getTlv';
import { IDlcMessage } from './DlcMessage';
import { IOracleEventJSON, OracleEvent } from './OracleEvent';

/**
 * Oracle announcement that describe an event and the way that an oracle will
 * attest to it. Updated to be rust-dlc compliant.
 *
 * In order to make it possible to hold oracles accountable in cases where
 * they do not release a signature for an event outcome, there needs to be
 * a proof that an oracle has committed to a given outcome. This proof is
 * given in a so-called oracle announcement, which contains an oracle event
 * together with the oracle public key and a signature over its serialization,
 * which must be valid with respect to the specified public key.
 *
 * This also makes it possible for users to obtain oracle event information
 * from an un-trusted peer while being guaranteed that it originates from a
 * given oracle.
 */
export class OracleAnnouncement implements IDlcMessage {
  public static type = MessageType.OracleAnnouncement;

  /**
   * Creates an OracleAnnouncement from JSON data
   * @param json JSON object representing oracle announcement
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): OracleAnnouncement {
    const instance = new OracleAnnouncement();

    // Handle different field name variations
    instance.announcementSig = Buffer.from(
      json.announcementSignature ||
        json.announcementSig ||
        json.announcement_signature,
      'hex',
    );
    instance.oraclePublicKey = Buffer.from(
      json.oraclePublicKey || json.oraclePubkey || json.oracle_public_key,
      'hex',
    );
    instance.oracleEvent = OracleEvent.fromJSON(
      json.oracleEvent || json.oracle_event,
    );

    return instance;
  }

  /**
   * Deserializes an oracle_announcement message
   * @param buf
   */
  public static deserialize(buf: Buffer): OracleAnnouncement {
    const instance = new OracleAnnouncement();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();
    instance.announcementSig = reader.readBytes(64);
    instance.oraclePublicKey = reader.readBytes(32);
    instance.oracleEvent = OracleEvent.deserialize(getTlv(reader));

    return instance;
  }

  /**
   * The type for oracle_announcement message. oracle_announcement = 55332
   */
  public type = OracleAnnouncement.type;

  public length: bigint;

  /** The signature enabling verifying the origin of the announcement. */
  public announcementSig: Buffer;

  /** The public key of the oracle (32 bytes, x-only). */
  public oraclePublicKey: Buffer;

  /** The description of the event and attesting. */
  public oracleEvent: OracleEvent;

  /**
   * Validates the oracle announcement according to rust-dlc specification.
   * This includes validating the oracle event and verifying the announcement signature.
   * @throws Will throw an error if validation fails
   */
  public validate(): void {
    // Validate oracle event first
    this.oracleEvent.validate();

    // Validate oracle public key format (32 bytes for x-only)
    if (!this.oraclePublicKey || this.oraclePublicKey.length !== 32) {
      throw new Error('Oracle public key must be 32 bytes (x-only format)');
    }

    // Validate announcement signature format (64 bytes for Schnorr)
    if (!this.announcementSig || this.announcementSig.length !== 64) {
      throw new Error(
        'Announcement signature must be 64 bytes (Schnorr format)',
      );
    }

    // Verify announcement signature over the oracle event
    try {
      const msg = math.taggedHash(
        'DLC/oracle/announcement/v0',
        this.oracleEvent.serialize(),
      );
      verify(this.oraclePublicKey, msg, this.announcementSig);
    } catch (error) {
      throw new Error(`Invalid announcement signature: ${error.message}`);
    }
  }

  /**
   * Returns the nonces from the oracle event.
   * This is useful for finding matching oracle announcements.
   */
  public getNonces(): Buffer[] {
    return this.oracleEvent.oracleNonces;
  }

  /**
   * Returns the event maturity epoch from the oracle event.
   */
  public getEventMaturityEpoch(): number {
    return this.oracleEvent.eventMaturityEpoch;
  }

  /**
   * Returns the event ID from the oracle event.
   */
  public getEventId(): string {
    return this.oracleEvent.eventId;
  }

  /**
   * Converts oracle_announcement to JSON (canonical rust-dlc format)
   */
  public toJSON(): OracleAnnouncementJSON {
    return {
      announcementSignature: this.announcementSig.toString('hex'),
      oraclePublicKey: this.oraclePublicKey.toString('hex'),
      oracleEvent: this.oracleEvent.toJSON(),
    };
  }

  /**
   * Serializes the oracle_announcement message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeBytes(this.announcementSig);
    dataWriter.writeBytes(this.oraclePublicKey);
    dataWriter.writeBytes(this.oracleEvent.serialize());

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

export interface OracleAnnouncementJSON {
  type?: number; // Made optional for rust-dlc compatibility
  announcementSignature: string; // Canonical field name
  oraclePublicKey: string; // Canonical field name
  oracleEvent: IOracleEventJSON;
}
