import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { MessageType } from '../../MessageType';
import { getTlv } from '../../serialize/getTlv';
import {
  OracleAnnouncementV0,
  OracleAnnouncementV0JSON,
} from '../pre-167/OracleAnnouncementV0';
import { IDlcMessage } from './DlcMessage';

/**
 * OracleInfo contains information about the oracles to be used in
 * executing a DLC.
 */
export class OracleInfoV0 implements IDlcMessage {
  public static type = MessageType.OracleInfoV0;

  /**
   * Deserializes an oracle_info_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): OracleInfoV0 {
    const instance = new OracleInfoV0();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();
    instance.announcement = OracleAnnouncementV0.deserialize(getTlv(reader));

    return instance;
  }

  /**
   * The type for oracle_info_v0 message. oracle_info_v0 = 42770
   */
  public type = OracleInfoV0.type;

  public length: bigint;

  public announcement: OracleAnnouncementV0;

  public validate(): void {
    this.announcement.validate();
  }

  /**
   * Converts oracle_info_v0 to JSON
   */
  public toJSON(): OracleInfoV0JSON {
    return {
      type: this.type,
      announcement: this.announcement.toJSON(),
    };
  }

  /**
   * Serializes the oracle_info_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeBytes(this.announcement.serialize());

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

export interface OracleInfoV0JSON {
  type: number;
  announcement: OracleAnnouncementV0JSON;
}
