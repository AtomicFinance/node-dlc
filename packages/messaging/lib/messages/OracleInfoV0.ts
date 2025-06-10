import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType, OracleInfoType } from '../MessageType';
import { deserializeTlv } from '../serialize/deserializeTlv';
import { getTlv } from '../serialize/getTlv';
import { IDlcMessage } from './DlcMessage';
import {
  OracleAnnouncementV0,
  OracleAnnouncementV0JSON,
} from './OracleAnnouncementV0';

/**
 * OracleParams describe allowed differences between oracles in
 * numerical outcome contracts, as per rust-dlc specification.
 */
export class OracleParams implements IDlcMessage {
  public static type = MessageType.OracleParamsV0;

  /**
   * Deserializes oracle_params_v0 message
   */
  public static deserialize(buf: Buffer): OracleParams {
    const instance = new OracleParams();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();
    instance.maxErrorExp = reader.readUInt16BE();
    instance.minFailExp = reader.readUInt16BE();
    instance.maximizeCoverage = reader.readUInt8() === 1;

    return instance;
  }

  public type = OracleParams.type;
  public length: bigint;

  /** The maximum allowed difference between oracle expressed as a power of 2. */
  public maxErrorExp: number;

  /** The minimum allowed difference that should be supported by the contract expressed as a power of 2. */
  public minFailExp: number;

  /** Whether to maximize coverage of the interval between maxErrorExp and minFailExp. */
  public maximizeCoverage: boolean;

  public validate(): void {
    if (this.maxErrorExp < 0) {
      throw new Error('maxErrorExp must be greater than or equal to 0');
    }
    if (this.minFailExp < 0) {
      throw new Error('minFailExp must be greater than or equal to 0');
    }
    if (this.maxErrorExp >= this.minFailExp) {
      throw new Error('maxErrorExp must be less than minFailExp');
    }
  }

  public toJSON(): OracleParamsJSON {
    return {
      type: this.type,
      maxErrorExp: this.maxErrorExp,
      minFailExp: this.minFailExp,
      maximizeCoverage: this.maximizeCoverage,
    };
  }

  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeUInt16BE(this.maxErrorExp);
    dataWriter.writeUInt16BE(this.minFailExp);
    dataWriter.writeUInt8(this.maximizeCoverage ? 1 : 0);

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

/**
 * SingleOracleInfo contains information about a single oracle.
 */
export class SingleOracleInfo implements IDlcMessage {
  public static type = MessageType.OracleInfoV0; // Using existing type for single oracle

  /**
   * Deserializes single oracle info
   */
  public static deserialize(buf: Buffer): SingleOracleInfo {
    const instance = new SingleOracleInfo();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();
    instance.announcement = OracleAnnouncementV0.deserialize(getTlv(reader));

    return instance;
  }

  public type = SingleOracleInfo.type;
  public length: bigint;

  /** The oracle announcement from the oracle. */
  public announcement: OracleAnnouncementV0;

  public validate(): void {
    this.announcement.validate();
  }

  public toJSON(): SingleOracleInfoJSON {
    return {
      type: this.type,
      announcement: this.announcement.toJSON(),
    };
  }

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

/**
 * MultiOracleInfo contains information about multiple oracles used in multi-oracle based contracts.
 */
export class MultiOracleInfo implements IDlcMessage {
  public static type = MessageType.OracleInfoV1; // Using V1 for multi-oracle

  /**
   * Deserializes multi oracle info
   */
  public static deserialize(buf: Buffer): MultiOracleInfo {
    const instance = new MultiOracleInfo();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();
    instance.threshold = reader.readUInt16BE();

    const numAnnouncements = reader.readUInt16BE();
    for (let i = 0; i < numAnnouncements; i++) {
      instance.announcements.push(
        OracleAnnouncementV0.deserialize(getTlv(reader)),
      );
    }

    // Optional oracle params for numerical outcome contracts
    if (!reader.eof) {
      // Check if there's an oracle params TLV
      const remainingBuf = reader.readBytes(); // Read all remaining bytes
      const paramsReader = new BufferReader(remainingBuf);
      const { type } = deserializeTlv(paramsReader);

      if (Number(type) === MessageType.OracleParamsV0) {
        instance.oracleParams = OracleParams.deserialize(remainingBuf);
      }
    }

    return instance;
  }

  public type = MultiOracleInfo.type;
  public length: bigint;

  /** The threshold to be used for the contract (e.g. 2 of 3). */
  public threshold: number;

  /** The set of oracle announcements. */
  public announcements: OracleAnnouncementV0[] = [];

  /** The parameters to be used when allowing differences between oracle outcomes in numerical outcome contracts. */
  public oracleParams?: OracleParams;

  public validate(): void {
    if (this.threshold <= 0) {
      throw new Error('threshold must be greater than 0');
    }
    if (this.threshold > this.announcements.length) {
      throw new Error(
        'threshold cannot be greater than number of announcements',
      );
    }
    if (this.announcements.length === 0) {
      throw new Error('must have at least one announcement');
    }

    // Validate all announcements
    this.announcements.forEach((announcement) => announcement.validate());

    // Validate oracle params if present
    if (this.oracleParams) {
      this.oracleParams.validate();
    }
  }

  /**
   * Returns the closest maturity date amongst all events
   */
  public getClosestMaturityDate(): number {
    return Math.min(
      ...this.announcements.map((a) => a.oracleEvent.eventMaturityEpoch),
    );
  }

  public toJSON(): MultiOracleInfoJSON {
    return {
      type: this.type,
      threshold: this.threshold,
      announcements: this.announcements.map((a) => a.toJSON()),
      oracleParams: this.oracleParams?.toJSON(),
    };
  }

  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeUInt16BE(this.threshold);
    dataWriter.writeUInt16BE(this.announcements.length);

    for (const announcement of this.announcements) {
      dataWriter.writeBytes(announcement.serialize());
    }

    if (this.oracleParams) {
      dataWriter.writeBytes(this.oracleParams.serialize());
    }

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

/**
 * OracleInfo contains information about the oracles to be used in
 * executing a DLC. Updated to support both single and multi-oracle
 * patterns as per rust-dlc specification.
 */
export abstract class OracleInfo implements IDlcMessage {
  public static deserialize(buf: Buffer): SingleOracleInfo | MultiOracleInfo {
    const reader = new BufferReader(buf);
    const type = Number(reader.readBigSize());

    switch (type) {
      case MessageType.OracleInfoV0:
        return SingleOracleInfo.deserialize(buf);
      case MessageType.OracleInfoV1:
        return MultiOracleInfo.deserialize(buf);
      default:
        throw new Error(`Unknown oracle info type: ${type}`);
    }
  }

  public abstract type: number;
  public abstract validate(): void;
  public abstract toJSON(): SingleOracleInfoJSON | MultiOracleInfoJSON;
  public abstract serialize(): Buffer;

  /**
   * Returns the closest maturity date amongst all events
   */
  public getClosestMaturityDate(): number {
    if (this instanceof SingleOracleInfo) {
      return this.announcement.oracleEvent.eventMaturityEpoch;
    } else if (this instanceof MultiOracleInfo) {
      return this.getClosestMaturityDate();
    }
    throw new Error('Unknown oracle info type');
  }
}

// For backward compatibility, keep the V0 class as alias to SingleOracleInfo
export class OracleInfoV0 extends SingleOracleInfo {
  // Inherits all functionality from SingleOracleInfo
}

// JSON interfaces
export interface OracleParamsJSON {
  type: number;
  maxErrorExp: number;
  minFailExp: number;
  maximizeCoverage: boolean;
}

export interface SingleOracleInfoJSON {
  type: number;
  announcement: OracleAnnouncementV0JSON;
}

export interface MultiOracleInfoJSON {
  type: number;
  threshold: number;
  announcements: OracleAnnouncementV0JSON[];
  oracleParams?: OracleParamsJSON;
}

// Backward compatibility type alias
export type OracleInfoV0JSON = SingleOracleInfoJSON;
