import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { getTlv } from '../serialize/getTlv';
import { IDlcMessage } from './DlcMessage';
import {
  OracleAnnouncementV0,
  OracleAnnouncementV0JSON,
} from './OracleAnnouncementV0';

export enum OracleInfoType {
  Single = 0,
  Multi = 1,
}

export abstract class OracleInfo implements IDlcMessage {
  public static deserialize(
    reader: Buffer | BufferReader,
  ): SingleOracleInfo | MultiOracleInfo {
    if (reader instanceof Buffer) reader = new BufferReader(reader);

    const tempReader = new BufferReader(reader.peakBytes());
    const type = Number(tempReader.readBigSize());

    console.log('type', type);

    switch (type) {
      case OracleInfoType.Single:
        return SingleOracleInfo.deserialize(reader);
      case OracleInfoType.Multi:
        return MultiOracleInfo.deserialize(reader);
      default:
        throw new Error(
          `Contract info TLV type must be ContractInfoV0 or ContractInfoV1`,
        );
    }
  }

  public abstract type: number;

  public abstract validate(): void;

  public abstract toJSON(): ISingleOracleInfoJSON | IMultiOracleInfoJSON;

  public abstract serialize(): Buffer;
}

/**
 * OracleInfo contains information about the oracles to be used in
 * executing a DLC.
 */
export class SingleOracleInfo extends OracleInfo implements IDlcMessage {
  public static type = OracleInfoType.Single;

  /**
   * Deserializes an oracle_info_v0 message
   * @param buf
   */
  public static deserialize(reader: Buffer | BufferReader): SingleOracleInfo {
    if (reader instanceof Buffer) reader = new BufferReader(reader);

    const instance = new SingleOracleInfo();

    console.log('deserialize singleoracleinfo');
    reader.readBigSize(); // read type
    console.log('deserialize singleoracleinfo 1');
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
  public toJSON(): ISingleOracleInfoJSON {
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

/**
 * OracleInfo contains information about the oracles to be used in
 * executing a DLC.
 */
export class MultiOracleInfo extends OracleInfo implements IDlcMessage {
  public static type = OracleInfoType.Multi;

  /**
   * Deserializes an oracle_info_v0 message
   * @param buf
   */
  public static deserialize(reader: Buffer | BufferReader): MultiOracleInfo {
    if (reader instanceof Buffer) reader = new BufferReader(reader);

    const instance = new MultiOracleInfo();

    console.log('deserialize MultiOracleInfo');
    reader.readBigSize(); // read type
    console.log('deserialize MultiOracleInfo 1');
    instance.threshold = reader.readUInt16BE();
    const numOracles = reader.readBigSize();
    for (let i = 0; i < numOracles; i++) {
      const announcement = OracleAnnouncementV0.deserialize(getTlv(reader));
      instance.announcements.push(announcement);
    }

    return instance;
  }

  /**
   * The type for oracle_info_v0 message. oracle_info_v0 = 42770
   */
  public type = MultiOracleInfo.type;

  public threshold: number;

  public announcements: OracleAnnouncementV0[] = [];

  public validate(): void {
    this.announcements.forEach((announcement) => {
      announcement.validate();
    });
  }

  /**
   * Converts oracle_info_v0 to JSON
   */
  public toJSON(): IMultiOracleInfoJSON {
    return {
      multi: {
        threshold: this.threshold, // TODO: UPDATE THRESHOLD
        oracleAnnouncements: this.announcements.map((announcement) =>
          announcement.toJSON(),
        ),
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
    dataWriter.writeUInt16BE(this.threshold);
    this.announcements.forEach((announcement) => {
      dataWriter.writeBytes(announcement.serialize());
    });

    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

export interface ISingleOracleInfoJSON {
  single: {
    oracleAnnouncement: OracleAnnouncementV0JSON;
  };
}
export interface IMultiOracleInfoJSON {
  multi: {
    threshold: number;
    oracleAnnouncements: OracleAnnouncementV0JSON[];
  };
}
