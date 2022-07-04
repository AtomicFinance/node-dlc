import { BufferReader, BufferWriter } from '@node-lightning/bufio';
import { math, verify } from 'bip-schnorr';

import { MessageType } from '../MessageType';
import { getTlv } from '../serialize/getTlv';
import { IDlcMessage } from './DlcMessage';
import { IOracleEventV0JSON, OracleEventV0 } from './OracleEventV0';

/**
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
export class OracleAnnouncementV0 implements IDlcMessage {
  public static type = MessageType.OracleAnnouncementV0;

  /**
   * Deserializes an oracle_announcement_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): OracleAnnouncementV0 {
    const instance = new OracleAnnouncementV0();
    const reader = new BufferReader(buf);

    console.log('deserialize OracleAnnouncementV0 1');
    console.log('buf', buf.toString('hex'));
    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();
    console.log('deserialize OracleAnnouncementV0 2');
    instance.announcementSig = reader.readBytes(64);
    console.log('deserialize OracleAnnouncementV0 3');
    instance.oraclePubkey = reader.readBytes(32);
    instance.oracleEvent = OracleEventV0.deserialize(getTlv(reader));

    return instance;
  }

  /**
   * The type for oracle_announcement_v0 message. oracle_announcement_v0 = 55332
   */
  public type = OracleAnnouncementV0.type;

  public length: bigint;

  public announcementSig: Buffer;

  public oraclePubkey: Buffer;

  public oracleEvent: OracleEventV0;

  public validate(): void {
    this.oracleEvent.validate();

    // Verify announcement sig
    const msg = math.taggedHash(
      'DLC/oracle/announcement/v0',
      this.oracleEvent.serialize(),
    );
    verify(this.oraclePubkey, msg, this.announcementSig);
  }

  /**
   * Converts oracle_announcement_v0 to JSON
   */
  public toJSON(): OracleAnnouncementV0JSON {
    return {
      announcementSignature: this.announcementSig.toString('hex'),
      oraclePublicKey: this.oraclePubkey.toString('hex'),
      oracleEvent: this.oracleEvent.toJSON(),
    };
  }

  /**
   * Serializes the oracle_announcement_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeBytes(this.announcementSig);
    dataWriter.writeBytes(this.oraclePubkey);
    dataWriter.writeBytes(this.oracleEvent.serialize());

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

export interface OracleAnnouncementV0JSON {
  announcementSignature: string;
  oraclePublicKey: string;
  oracleEvent: IOracleEventV0JSON;
}
