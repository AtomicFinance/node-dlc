import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { getTlv } from '../serialize/getTlv';
import { IDlcMessage } from './DlcMessage';
import {
  OracleAnnouncementV0,
  OracleAnnouncementV0JSON,
} from './OracleAnnouncementV0';

export enum OracleInfoType {
  Single = 0,
}

/**
 * OracleInfo contains information about the oracles to be used in
 * executing a DLC.
 */
export class SingleOracleInfo implements IDlcMessage {
  public static type = OracleInfoType.Single;

  /**
   * Deserializes an oracle_info_v0 message
   * @param buf
   */
  public static deserialize(reader: Buffer | BufferReader): SingleOracleInfo {
    if (reader instanceof Buffer) reader = new BufferReader(reader);

    const instance = new SingleOracleInfo();

    reader.readBigSize(); // read type
    instance.announcement = OracleAnnouncementV0.deserialize(getTlv(reader));

    return instance;
  }

  /**
   * The type for oracle_info_v0 message. oracle_info_v0 = 42770
   */
  public type = SingleOracleInfo.type;

  public announcement: OracleAnnouncementV0;

  public validate(): void {
    this.announcement.validate();
  }

  /**
   * Converts oracle_info_v0 to JSON
   */
  public toJSON(): SingleOracleInfoJSON {
    return {
      single: {
        oracleAnnouncement: this.announcement.toJSON(),
      },
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

    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

export interface SingleOracleInfoJSON {
  single: {
    oracleAnnouncement: OracleAnnouncementV0JSON;
  };
}
