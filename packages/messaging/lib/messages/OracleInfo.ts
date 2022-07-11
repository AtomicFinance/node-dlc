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
    const type = reader.readBigSize(); // read type
    console.log('type', type);
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
    instance.hasOracleParams = reader.readUInt8() === 1;
    if (instance.hasOracleParams) {
      instance.oracleParams = OracleParams.deserialize(reader);
    }

    return instance;
  }

  /**
   * The type for oracle_info_v0 message. oracle_info_v0 = 42770
   */
  public type = MultiOracleInfo.type;

  public threshold: number;

  public announcements: OracleAnnouncementV0[] = [];

  public hasOracleParams: boolean;

  public oracleParams: OracleParams;

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
        threshold: this.threshold,
        oracleAnnouncements: this.announcements.map((announcement) =>
          announcement.toJSON(),
        ),
        oracleParams: this.hasOracleParams ? this.oracleParams.toJSON() : null,
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
    dataWriter.writeBigSize(this.announcements.length);
    this.announcements.forEach((announcement) => {
      dataWriter.writeBytes(announcement.serialize());
    });
    dataWriter.writeUInt8(this.hasOracleParams ? 1 : 0);
    if (this.hasOracleParams) {
      dataWriter.writeBytes(this.oracleParams.serialize());
    }

    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

export class OracleParams implements IDlcMessage {
  /**
   * Deserializes an oracle_info_v0 message
   * @param buf
   */
  public static deserialize(reader: Buffer | BufferReader): OracleParams {
    if (reader instanceof Buffer) reader = new BufferReader(reader);

    const instance = new OracleParams();

    instance.maxErrorExp = reader.readUInt16BE();
    instance.minFailExp = reader.readUInt16BE();
    instance.maximizeCoverage = reader.readUInt8() === 1;

    return instance;
  }

  public maxErrorExp: number;

  public minFailExp: number;

  public maximizeCoverage: boolean;

  /**
   * Converts oracle_info_v0 to JSON
   */
  public toJSON(): IOracleParamsJSON {
    return {
      maxErrorExp: this.maxErrorExp,
      minFailExp: this.minFailExp,
      maximizeCoverage: this.maximizeCoverage,
    };
  }

  public serialize(): Buffer {
    const writer = new BufferWriter();

    const dataWriter = new BufferWriter();
    dataWriter.writeUInt16BE(this.maxErrorExp);
    dataWriter.writeUInt16BE(this.minFailExp);
    dataWriter.writeUInt8(this.maximizeCoverage ? 1 : 0);

    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

export interface IOracleParamsJSON {
  maxErrorExp: number;
  minFailExp: number;
  maximizeCoverage: boolean;
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
    oracleParams: IOracleParamsJSON | null;
  };
}
