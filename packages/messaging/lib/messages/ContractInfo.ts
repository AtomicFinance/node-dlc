import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { ContractInfoType, MessageType } from '../MessageType';
import {
  ContractDescriptor,
  ContractDescriptorV0JSON,
  ContractDescriptorV1JSON,
} from './ContractDescriptor';
import { DlcMessage, IDlcMessage } from './DlcMessage';
import {
  MultiOracleInfo,
  MultiOracleInfoJSON,
  OracleInfo,
  SingleOracleInfo,
  SingleOracleInfoJSON,
} from './OracleInfo';

export abstract class ContractInfo extends DlcMessage {
  public static deserialize(
    buf: Buffer,
  ): SingleContractInfo | DisjointContractInfo {
    const reader = new BufferReader(buf);
    const typeId = Number(reader.readBigSize());

    switch (typeId) {
      case ContractInfoType.Single:
        return SingleContractInfo.deserialize(buf);
      case ContractInfoType.Disjoint:
        return DisjointContractInfo.deserialize(buf);
      default:
        throw new Error(
          `Contract info type must be Single (0) or Disjoint (1), got ${typeId}`,
        );
    }
  }

  /**
   * Creates a ContractInfo from JSON data (e.g., from test vectors)
   * @param json JSON object representing contract info
   */
  public static fromJSON(json: any): ContractInfo {
    if (!json) {
      throw new Error('contractInfo is required');
    }

    // Check if it's a single contract info or disjoint contract info
    if (json.singleContractInfo || json.single_contract_info) {
      return SingleContractInfo.fromJSON(
        json.singleContractInfo || json.single_contract_info,
      );
    } else if (json.disjointContractInfo || json.disjoint_contract_info) {
      return DisjointContractInfo.fromJSON(
        json.disjointContractInfo || json.disjoint_contract_info,
      );
    } else {
      throw new Error(
        'contractInfo must have either singleContractInfo or disjointContractInfo',
      );
    }
  }

  public abstract contractInfoType: ContractInfoType;
  public abstract totalCollateral: bigint;
  public abstract validate(): void;
  public abstract toJSON(): ISingleContractInfoJSON | IDisjointContractInfoJSON;
  public abstract serialize(): Buffer;

  // Method to get total collateral (for compatibility)
  public getTotalCollateral(): bigint {
    return this.totalCollateral;
  }
}

/**
 * SingleContractInfo contains information about a contract's outcomes,
 * their corresponding payouts, and the oracles to be used.
 * This corresponds to the previous ContractInfoV0.
 */
export class SingleContractInfo extends ContractInfo implements IDlcMessage {
  public static contractInfoType = ContractInfoType.Single;
  public static type = MessageType.SingleContractInfo;

  /**
   * Creates a SingleContractInfo from JSON data
   * @param json JSON object representing single contract info
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): SingleContractInfo {
    const instance = new SingleContractInfo();

    instance.totalCollateral = BigInt(
      json.totalCollateral || json.total_collateral || 0,
    );

    // Handle nested contractInfo structure (test vectors have double nesting)
    const contractInfoData = json.contractInfo || json.contract_info || json;

    // Parse contract descriptor using proper fromJSON method
    instance.contractDescriptor = ContractDescriptor.fromJSON(
      contractInfoData.contractDescriptor ||
        contractInfoData.contract_descriptor,
    );

    // Parse oracle info using proper fromJSON method
    instance.oracleInfo = OracleInfo.fromJSON(
      contractInfoData.oracleInfo || contractInfoData.oracle_info,
    );

    return instance;
  }

  /**
   * Deserializes a single_contract_info message
   * @param buf
   */
  public static deserialize(buf: Buffer): SingleContractInfo {
    const instance = new SingleContractInfo();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type (0)
    instance.totalCollateral = reader.readUInt64BE();

    // Read contract descriptor as sibling type (starts with its own type prefix)
    instance.contractDescriptor = ContractDescriptor.deserialize(
      reader.buffer.subarray(reader.position),
    );
    // Skip past the contract descriptor we just read
    const descLength = instance.contractDescriptor.serialize().length;
    reader.position += descLength;

    // Read oracle info with rust-dlc format - discriminator + body
    const oracleType = Number(reader.readBigSize());
    if (oracleType === 0) {
      // Single oracle
      instance.oracleInfo = SingleOracleInfo.deserializeBody(
        reader.buffer.subarray(reader.position),
      );
    } else if (oracleType === 1) {
      // Multi oracle
      instance.oracleInfo = MultiOracleInfo.deserializeBody(
        reader.buffer.subarray(reader.position),
      );
    } else {
      throw new Error(`Unknown oracle info type: ${oracleType}`);
    }

    return instance;
  }

  /**
   * The type for single_contract_info message - using MessageType for IDlcMessage compatibility
   */
  public type = MessageType.SingleContractInfo;

  /**
   * The contract info type for new format
   */
  public contractInfoType = ContractInfoType.Single;

  public totalCollateral: bigint;

  public contractDescriptor: ContractDescriptor;

  public oracleInfo: OracleInfo;

  // Compatibility property
  public get length(): bigint {
    return BigInt(this.serialize().length);
  }

  /**
   * Validates correctness of all fields in the message
   * @throws Will throw an error if validation fails
   */
  public validate(): void {
    if (this.totalCollateral <= 0) {
      throw new Error('totalCollateral must be greater than 0');
    }

    this.oracleInfo.validate();

    // TODO: Add contract descriptor validation once available
    // this.contractDescriptor.validate();
  }

  /**
   * Converts single_contract_info to JSON
   */
  public toJSON(): ISingleContractInfoJSON {
    // Return enum variant format for Rust compatibility
    return {
      singleContractInfo: {
        totalCollateral: Number(this.totalCollateral),
        contractInfo: {
          contractDescriptor: this.contractDescriptor.toJSON(),
          oracleInfo: this.oracleInfo.toJSON(),
        },
      },
    } as any;
  }

  /**
   * Serializes the single_contract_info message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();

    writer.writeBigSize(this.contractInfoType);
    writer.writeUInt64BE(this.totalCollateral);
    writer.writeBytes(this.contractDescriptor.serialize());

    // Use serializeBody() to match rust-dlc behavior - don't add extra TLV wrapper
    if (this.oracleInfo instanceof SingleOracleInfo) {
      writer.writeBigSize(0); // Single oracle discriminator
      writer.writeBytes(this.oracleInfo.serializeBody());
    } else {
      writer.writeBigSize(1); // Multi oracle discriminator
      writer.writeBytes(this.oracleInfo.serializeBody());
    }

    return writer.toBuffer();
  }
}

/**
 * DisjointContractInfo contains information about multiple disjoint contract events.
 * This corresponds to the previous ContractInfoV1.
 */
export class DisjointContractInfo extends ContractInfo implements IDlcMessage {
  public static contractInfoType = ContractInfoType.Disjoint;
  public static type = MessageType.DisjointContractInfo;

  /**
   * Creates a DisjointContractInfo from JSON data
   * @param json JSON object representing disjoint contract info
   */
  public static fromJSON(json: any): DisjointContractInfo {
    const instance = new DisjointContractInfo();

    instance.totalCollateral = BigInt(
      json.totalCollateral || json.total_collateral || 0,
    );

    // Parse contract infos array
    const contractInfosData = json.contractInfos || json.contract_infos || [];
    instance.contractOraclePairs = contractInfosData.map(
      (contractInfoData: any) => ({
        contractDescriptor: ContractDescriptor.fromJSON(
          contractInfoData.contractDescriptor ||
            contractInfoData.contract_descriptor,
        ),
        oracleInfo: OracleInfo.fromJSON(
          contractInfoData.oracleInfo || contractInfoData.oracle_info,
        ),
      }),
    );

    return instance;
  }

  /**
   * Deserializes a disjoint_contract_info message
   * @param buf
   */
  public static deserialize(buf: Buffer): DisjointContractInfo {
    const instance = new DisjointContractInfo();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type (1)
    instance.totalCollateral = reader.readUInt64BE();

    const numDisjointEvents = Number(reader.readBigSize());

    for (let i = 0; i < numDisjointEvents; i++) {
      // Read contract descriptor as sibling type (starts with its own type prefix)
      const contractDescriptor = ContractDescriptor.deserialize(
        reader.buffer.subarray(reader.position),
      );
      // Skip past the contract descriptor we just read
      const descLength = contractDescriptor.serialize().length;
      reader.position += descLength;

      // Read oracle info with rust-dlc format - discriminator + body (same as SingleContractInfo)
      const oracleType = Number(reader.readBigSize());
      let oracleInfo: OracleInfo;

      if (oracleType === 0) {
        // Single oracle
        oracleInfo = SingleOracleInfo.deserializeBody(
          reader.buffer.subarray(reader.position),
        );
      } else if (oracleType === 1) {
        // Multi oracle
        oracleInfo = MultiOracleInfo.deserializeBody(
          reader.buffer.subarray(reader.position),
        );
      } else {
        throw new Error(`Unknown oracle info type: ${oracleType}`);
      }

      // Skip past the oracle info we just read
      const oracleInfoLength = oracleInfo.serializeBody().length;
      reader.position += oracleInfoLength;

      instance.contractOraclePairs.push({ contractDescriptor, oracleInfo });
    }

    return instance;
  }

  /**
   * The type for disjoint_contract_info message - using MessageType for IDlcMessage compatibility
   */
  public type = MessageType.DisjointContractInfo;

  /**
   * The contract info type for new format
   */
  public contractInfoType = ContractInfoType.Disjoint;

  public totalCollateral: bigint;

  public contractOraclePairs: IContractOraclePair[] = [];

  // Compatibility property
  public get length(): bigint {
    return BigInt(this.serialize().length);
  }

  /**
   * Validates correctness of all fields in the message
   * @throws Will throw an error if validation fails
   */
  public validate(): void {
    if (this.totalCollateral <= 0) {
      throw new Error('totalCollateral must be greater than 0');
    }

    if (this.contractOraclePairs.length === 0) {
      throw new Error('contractOraclePairs cannot be empty');
    }

    this.contractOraclePairs.forEach((pair, index) => {
      try {
        pair.oracleInfo.validate();
        // TODO: Add contract descriptor validation once available
        // pair.contractDescriptor.validate();
      } catch (error) {
        throw new Error(
          `Validation failed for contract oracle pair ${index}: ${error.message}`,
        );
      }
    });
  }

  /**
   * Converts disjoint_contract_info to JSON
   */
  public toJSON(): IDisjointContractInfoJSON {
    // Return enum variant format for Rust compatibility
    return {
      disjointContractInfo: {
        totalCollateral: Number(this.totalCollateral),
        contractInfos: this.contractOraclePairs.map((pair) => ({
          contractDescriptor: pair.contractDescriptor.toJSON(),
          oracleInfo: pair.oracleInfo.toJSON(),
        })),
      },
    } as any;
  }

  /**
   * Serializes the disjoint_contract_info message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();

    writer.writeBigSize(this.contractInfoType);
    writer.writeUInt64BE(this.totalCollateral);
    writer.writeBigSize(this.contractOraclePairs.length);

    for (const pair of this.contractOraclePairs) {
      writer.writeBytes(pair.contractDescriptor.serialize());

      // Write oracle info with discriminator like SingleContractInfo does
      if (pair.oracleInfo instanceof SingleOracleInfo) {
        writer.writeBigSize(0); // Single oracle discriminator
        writer.writeBytes(pair.oracleInfo.serializeBody());
      } else {
        writer.writeBigSize(1); // Multi oracle discriminator
        writer.writeBytes(pair.oracleInfo.serializeBody());
      }
    }

    return writer.toBuffer();
  }
}

// Legacy support - keeping old class names as aliases (both value and type exports)
export const ContractInfoV0 = SingleContractInfo;
export const ContractInfoV1 = DisjointContractInfo;
export type ContractInfoV0 = SingleContractInfo;
export type ContractInfoV1 = DisjointContractInfo;

interface IContractOraclePair {
  contractDescriptor: ContractDescriptor;
  oracleInfo: OracleInfo;
}

interface IContractOraclePairJSON {
  contractDescriptor: ContractDescriptorV0JSON | ContractDescriptorV1JSON;
  oracleInfo: SingleOracleInfoJSON | MultiOracleInfoJSON;
}

export interface ISingleContractInfoJSON {
  type?: number; // Made optional for rust-dlc compatibility
  contractInfoType?: ContractInfoType; // Made optional for rust-dlc compatibility
  totalCollateral: number;
  contractInfo: {
    contractDescriptor: ContractDescriptorV0JSON | ContractDescriptorV1JSON;
    oracleInfo: SingleOracleInfoJSON | MultiOracleInfoJSON;
  };
}

export interface IDisjointContractInfoJSON {
  type?: number; // Made optional for rust-dlc compatibility
  contractInfoType?: ContractInfoType; // Made optional for rust-dlc compatibility
  totalCollateral: number;
  contractOraclePairs: IContractOraclePairJSON[];
}

// Legacy type aliases for backward compatibility (same as the new interfaces)
export type IContractInfoV0JSON = ISingleContractInfoJSON;
export type IContractInfoV1JSON = IDisjointContractInfoJSON;
