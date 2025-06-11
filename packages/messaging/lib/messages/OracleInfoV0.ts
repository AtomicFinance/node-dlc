import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
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
   * Creates an OracleParams from JSON data
   * @param json JSON object representing oracle params
   */
  public static fromJSON(json: any): OracleParams {
    const instance = new OracleParams();
    instance.maxErrorExp = json.maxErrorExp || json.max_error_exp || 0;
    instance.minFailExp = json.minFailExp || json.min_fail_exp || 0;
    instance.maximizeCoverage =
      json.maximizeCoverage || json.maximize_coverage || false;
    return instance;
  }

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
   * Creates a SingleOracleInfo from JSON data
   * @param json JSON object representing single oracle info
   */
  public static fromJSON(json: any): SingleOracleInfo {
    const instance = new SingleOracleInfo();

    const announcementData = json.announcement || json.oracleAnnouncement;
    if (!announcementData) {
      throw new Error(
        'announcement or oracleAnnouncement is required for single oracle info',
      );
    }

    // Parse announcement using proper fromJSON method
    instance.announcement = OracleAnnouncementV0.fromJSON(announcementData);

    return instance;
  }

  /**
   * Deserializes single oracle info
   */
  public static deserialize(buf: Buffer): SingleOracleInfo {
    const instance = new SingleOracleInfo();
    const reader = new BufferReader(buf);

    // Read the type and length that serialize() writes
    reader.readBigSize(); // read type
    instance.length = reader.readBigSize(); // read length

    // Read the announcement data
    instance.announcement = OracleAnnouncementV0.deserialize(
      reader.readBytes(Number(instance.length)),
    );

    return instance;
  }

  public type = SingleOracleInfo.type;
  public length: bigint;

  /** The oracle announcement from the oracle. */
  public announcement: OracleAnnouncementV0;

  /**
   * Returns the closest maturity date amongst all events
   */
  public getClosestMaturityDate(): number {
    return this.announcement.oracleEvent.eventMaturityEpoch;
  }

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

  /**
   * Serializes the body without TLV wrapper (for embedding in ContractInfo)
   * This matches rust-dlc behavior where OracleInfo.write() doesn't add type_id
   */
  public serializeBody(): Buffer {
    return this.announcement.serialize();
  }

  /**
   * Deserializes the body without TLV wrapper (for embedding in ContractInfo)
   * This matches rust-dlc behavior where OracleInfo is read without type_id
   */
  public static deserializeBody(buf: Buffer): SingleOracleInfo {
    const instance = new SingleOracleInfo();
    // No type/length to read - just the announcement data directly
    instance.announcement = OracleAnnouncementV0.deserialize(buf);
    return instance;
  }
}

/**
 * MultiOracleInfo contains information about multiple oracles used in multi-oracle based contracts.
 */
export class MultiOracleInfo implements IDlcMessage {
  public static type = MessageType.OracleInfoV1; // Using V1 for multi-oracle

  /**
   * Creates a MultiOracleInfo from JSON data
   * @param json JSON object representing multi oracle info
   */
  public static fromJSON(json: any): MultiOracleInfo {
    const instance = new MultiOracleInfo();

    instance.threshold = json.threshold || 1;

    // Parse oracle announcements using proper fromJSON method
    const announcements =
      json.oracleAnnouncements || json.oracle_announcements || [];
    instance.announcements = announcements.map((announcementJson: any) =>
      OracleAnnouncementV0.fromJSON(announcementJson),
    );

    // Parse oracle params if present (null means explicitly absent)
    const oracleParamsData = json.oracleParams || json.oracle_params;
    if (oracleParamsData !== null && oracleParamsData !== undefined) {
      // Create OracleParams from JSON data using the fromJSON method
      instance.oracleParams = OracleParams.fromJSON(oracleParamsData);
    } else {
      // Explicitly null/undefined - will serialize as 00 (not present)
      instance.oracleParams = undefined;
    }

    return instance;
  }

  /**
   * Deserializes multi oracle info
   */
  public static deserialize(buf: Buffer): MultiOracleInfo {
    const instance = new MultiOracleInfo();
    const reader = new BufferReader(buf);

    // Read the type and length that serialize() writes
    reader.readBigSize(); // read type
    instance.length = reader.readBigSize(); // read length

    // In rust-dlc format, MultiOracleInfo body is: threshold + announcements + optional oracle params
    instance.threshold = reader.readUInt16BE();

    const numAnnouncements = Number(reader.readBigSize()); // Changed from readUInt16BE to readBigSize to match rust-dlc vec_cb
    for (let i = 0; i < numAnnouncements; i++) {
      instance.announcements.push(
        OracleAnnouncementV0.deserialize(getTlv(reader)),
      );
    }

    // Optional oracle params using Optional sub-type format
    const oracleParamsData = reader.readOptional();
    if (oracleParamsData) {
      instance.oracleParams = OracleParams.deserialize(oracleParamsData);
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
    // writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeUInt16BE(this.threshold);
    dataWriter.writeBigSize(this.announcements.length); // Changed from writeUInt16BE to writeBigSize to match rust-dlc vec_cb

    for (const announcement of this.announcements) {
      dataWriter.writeBytes(announcement.serialize());
    }

    // Use Optional serialization for oracle params
    const oracleParamsData = this.oracleParams
      ? this.oracleParams.serialize()
      : null;
    dataWriter.writeOptional(oracleParamsData);

    // writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }

  /**
   * Serializes the body without TLV wrapper (for embedding in ContractInfo)
   * This matches rust-dlc behavior where OracleInfo.write() doesn't add type_id
   */
  public serializeBody(): Buffer {
    const writer = new BufferWriter();
    writer.writeUInt16BE(this.threshold);
    writer.writeBigSize(this.announcements.length); // Changed from writeUInt16BE to writeBigSize to match rust-dlc vec_cb

    for (const announcement of this.announcements) {
      writer.writeBytes(announcement.serialize());
    }

    // Use Optional serialization for oracle params
    const oracleParamsData = this.oracleParams
      ? this.oracleParams.serialize()
      : null;
    writer.writeOptional(oracleParamsData);

    return writer.toBuffer();
  }

  /**
   * Deserializes the body without TLV wrapper (for embedding in ContractInfo)
   * This matches rust-dlc behavior where OracleInfo is read without type_id
   */
  public static deserializeBody(buf: Buffer): MultiOracleInfo {
    const instance = new MultiOracleInfo();
    const reader = new BufferReader(buf);

    // No type/length to read - directly read the multi-oracle body
    instance.threshold = reader.readUInt16BE();

    const numAnnouncements = Number(reader.readBigSize()); // BigSize for announcements count
    for (let i = 0; i < numAnnouncements; i++) {
      instance.announcements.push(
        OracleAnnouncementV0.deserialize(getTlv(reader)),
      );
    }

    // Optional oracle params using Optional sub-type format
    const oracleParamsData = reader.readOptional();
    if (oracleParamsData) {
      instance.oracleParams = OracleParams.deserialize(oracleParamsData);
    }

    return instance;
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

  /**
   * Creates an OracleInfo from JSON data (e.g., from test vectors)
   * @param json JSON object representing oracle info
   */
  public static fromJSON(json: any): OracleInfo {
    if (!json) {
      throw new Error('oracleInfo is required');
    }

    // Handle direct single oracle (legacy format)
    if (json.announcement) {
      return SingleOracleInfo.fromJSON(json);
    }
    // Handle wrapped single oracle
    else if (json.single) {
      return SingleOracleInfo.fromJSON(json.single);
    }
    // Handle multi oracle
    else if (json.multi) {
      return MultiOracleInfo.fromJSON(json.multi);
    } else {
      throw new Error(
        'oracleInfo must have either announcement, single, or multi',
      );
    }
  }

  public abstract type: number;
  public abstract validate(): void;
  public abstract toJSON(): SingleOracleInfoJSON | MultiOracleInfoJSON;
  public abstract serialize(): Buffer;
  public abstract serializeBody(): Buffer;

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
  /**
   * Creates an OracleInfoV0 from JSON data (alias for SingleOracleInfo.fromJSON)
   * @param json JSON object representing oracle info
   */
  public static fromJSON(json: any): OracleInfoV0 {
    return SingleOracleInfo.fromJSON(json) as OracleInfoV0;
  }
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
