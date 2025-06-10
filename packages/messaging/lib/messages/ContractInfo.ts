import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { ContractInfoType, MessageType } from '../MessageType';
import {
  ContractDescriptor,
  ContractDescriptorV0JSON,
  ContractDescriptorV1JSON,
} from './ContractDescriptor';
import { DlcMessage, IDlcMessage } from './DlcMessage';
import { OracleInfoV0, OracleInfoV0JSON } from './OracleInfoV0';

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
  public static type = MessageType.ContractInfoV0; // For backward compatibility

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
      reader.buffer.slice(reader.position),
    );
    // Skip past the contract descriptor we just read
    const contractDescriptorLength =
      instance.contractDescriptor.serialize().length;
    reader.position += contractDescriptorLength;

    // Read oracle info as sibling type (starts with its own type prefix)
    instance.oracleInfo = OracleInfoV0.deserialize(
      reader.buffer.slice(reader.position),
    );

    return instance;
  }

  /**
   * The type for single_contract_info message - using MessageType for IDlcMessage compatibility
   */
  public type = MessageType.ContractInfoV0; // For IDlcMessage compatibility

  /**
   * The contract info type for new format
   */
  public contractInfoType = ContractInfoType.Single;

  public totalCollateral: bigint;

  public contractDescriptor: ContractDescriptor;

  public oracleInfo: OracleInfoV0;

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
    return {
      type: this.type,
      contractInfoType: this.contractInfoType,
      totalCollateral: Number(this.totalCollateral),
      contractDescriptor: this.contractDescriptor.toJSON(),
      oracleInfo: this.oracleInfo.toJSON(),
    };
  }

  /**
   * Serializes the single_contract_info message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();

    writer.writeBigSize(this.contractInfoType);
    writer.writeUInt64BE(this.totalCollateral);
    writer.writeBytes(this.contractDescriptor.serialize());
    writer.writeBytes(this.oracleInfo.serialize());

    return writer.toBuffer();
  }
}

/**
 * DisjointContractInfo contains information about multiple disjoint contract events.
 * This corresponds to the previous ContractInfoV1.
 */
export class DisjointContractInfo extends ContractInfo implements IDlcMessage {
  public static contractInfoType = ContractInfoType.Disjoint;
  public static type = MessageType.ContractInfoV1; // For backward compatibility

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
      // For now, assume fixed-size parsing until we implement proper TLV handling
      const contractDescriptorData = reader.readBytes(100); // Temporary
      const contractDescriptor = ContractDescriptor.deserialize(
        contractDescriptorData,
      );

      const oracleInfoData = reader.readBytes(100); // Temporary
      const oracleInfo = OracleInfoV0.deserialize(oracleInfoData);

      instance.contractOraclePairs.push({ contractDescriptor, oracleInfo });
    }

    return instance;
  }

  /**
   * The type for disjoint_contract_info message - using MessageType for IDlcMessage compatibility
   */
  public type = MessageType.ContractInfoV1; // For IDlcMessage compatibility

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
    return {
      type: this.type,
      contractInfoType: this.contractInfoType,
      totalCollateral: Number(this.totalCollateral),
      contractOraclePairs: this.contractOraclePairs.map((pair) => ({
        contractDescriptor: pair.contractDescriptor.toJSON(),
        oracleInfo: pair.oracleInfo.toJSON(),
      })),
    };
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
      writer.writeBytes(pair.oracleInfo.serialize());
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
  oracleInfo: OracleInfoV0;
}

interface IContractOraclePairJSON {
  contractDescriptor: ContractDescriptorV0JSON | ContractDescriptorV1JSON;
  oracleInfo: OracleInfoV0JSON;
}

export interface ISingleContractInfoJSON {
  type: number;
  contractInfoType: ContractInfoType;
  totalCollateral: number;
  contractDescriptor: ContractDescriptorV0JSON | ContractDescriptorV1JSON;
  oracleInfo: OracleInfoV0JSON;
}

export interface IDisjointContractInfoJSON {
  type: number;
  contractInfoType: ContractInfoType;
  totalCollateral: number;
  contractOraclePairs: IContractOraclePairJSON[];
}

// Legacy type aliases for backward compatibility (same as the new interfaces)
export type IContractInfoV0JSON = ISingleContractInfoJSON;
export type IContractInfoV1JSON = IDisjointContractInfoJSON;
