import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { MessageType } from '../MessageType';
import {
  ContractDescriptor,
  ContractDescriptorType,
  EnumContractDescriptorJSON,
  NumericContractDescriptor,
  NumericContractDescriptorJSON,
} from './ContractDescriptor';
import { IDlcMessage } from './DlcMessage';
import { DigitDecompositionEventDescriptorV0 } from './EventDescriptor';
import { OracleEventV0 } from './OracleEventV0';
import { SingleOracleInfo, SingleOracleInfoJSON } from './OracleInfo';

export enum ContractInfoType {
  Single = 0,
  Disjoint = 1,
}
export abstract class ContractInfo implements IDlcMessage {
  public static deserialize(
    reader: Buffer | BufferReader,
  ): SingleContractInfo | DisjointContractInfo {
    if (reader instanceof Buffer) reader = new BufferReader(reader);

    const tempReader = new BufferReader(reader.peakBytes());
    const type = Number(tempReader.readBigSize());

    console.log('type', type);

    switch (type) {
      case ContractInfoType.Single:
        return SingleContractInfo.deserialize(reader);
      case ContractInfoType.Disjoint:
        return DisjointContractInfo.deserialize(reader);
      default:
        throw new Error(
          `Contract info TLV type must be ContractInfoV0 or ContractInfoV1`,
        );
    }
  }

  public abstract type: number;

  public abstract totalCollateral: bigint;

  public abstract validate(): void;

  public abstract toJSON(): ISingleContractInfoJSON | IDisjointContractInfoJSON;

  public abstract serialize(): Buffer;
}

/**
 * ContractInfo V0 contains information about a contract's outcomes,
 * their corresponding payouts, and the oracles to be used.
 */
export class SingleContractInfo implements IDlcMessage {
  public static type = ContractInfoType.Single;

  /**
   * Deserializes an contract_info_v0 message
   * @param buf
   */
  public static deserialize(reader: Buffer | BufferReader): SingleContractInfo {
    if (reader instanceof Buffer) reader = new BufferReader(reader);

    const instance = new SingleContractInfo();

    const type = reader.readBigSize(); // read type
    console.log('type', type);
    console.log('test5');
    instance.totalCollateral = reader.readUInt64BE();
    console.log('test6');
    instance.contractDescriptor = ContractDescriptor.deserialize(reader);
    console.log('test7');
    console.log('instance.contractdescriptor', instance.contractDescriptor);
    instance.oracleInfo = SingleOracleInfo.deserialize(reader);

    return instance;
  }

  /**
   * The type for contract_info_v0 message. contract_info_v0 = 55342
   */
  public type = SingleContractInfo.type;

  public totalCollateral: bigint;

  public contractDescriptor: ContractDescriptor;

  public oracleInfo: SingleOracleInfo;

  /**
   * Validates correctness of all fields in the message
   * https://github.com/discreetlogcontracts/dlcspecs/blob/master/Messaging.md#the-contract_info-type
   * @throws Will throw an error if validation fails
   */
  public validate(): void {
    this.oracleInfo.validate();
    switch (this.contractDescriptor.type) {
      case ContractInfoType.Single:
        // eslint-disable-next-line no-case-declarations
        const contractDescriptor = this
          .contractDescriptor as NumericContractDescriptor;
        contractDescriptor.validate();

        // roundingmod should not be greater than totalCollateral
        for (const interval of contractDescriptor.roundingIntervals.intervals) {
          if (interval.roundingMod > this.totalCollateral) {
            throw new Error(
              `Rounding modulus ${interval.roundingMod} is greater than total collateral ${this.totalCollateral}`,
            );
          }
        }

        switch (this.oracleInfo.announcement.oracleEvent.eventDescriptor.type) {
          case MessageType.DigitDecompositionEventDescriptorV0:
            // eslint-disable-next-line no-case-declarations
            const eventDescriptor = this.oracleInfo.announcement.oracleEvent
              .eventDescriptor as DigitDecompositionEventDescriptorV0;
            if (eventDescriptor.nbDigits !== contractDescriptor.numDigits)
              throw new Error(
                'DigitDecompositionEventDescriptorV0 and ContractDescriptorV1 must have the same numDigits',
              );

            // Sanity check. Shouldn't be hit since there are other validations which should catch this in OracleEventV0.
            // eslint-disable-next-line no-case-declarations
            const oracleEvent = this.oracleInfo.announcement
              .oracleEvent as OracleEventV0;
            if (
              oracleEvent.oracleNonces.length !== contractDescriptor.numDigits
            ) {
              throw new Error(
                'oracleEvent.oracleNonces.length and contractDescriptor.numDigits must be the same',
              );
            }
            break;
          default:
            throw new Error(
              'Only ContractDescriptorV1 can be used with DigitDecompositionEventDescriptor',
            );
        }
    }
  }

  /**
   * Converts contract_info_v0 to JSON
   */
  public toJSON(): ISingleContractInfoJSON {
    return {
      singleContractInfo: {
        totalCollateral: Number(this.totalCollateral),
        contractInfo: {
          contractDescriptor: this.contractDescriptor.toJSON(),
          oracleInfo: this.oracleInfo.toJSON(),
        },
      },
    };
  }

  /**
   * Serializes the contract_info_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();

    dataWriter.writeUInt64BE(this.totalCollateral);
    dataWriter.writeBytes(this.contractDescriptor.serialize());
    dataWriter.writeBytes(this.oracleInfo.serialize());

    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

/**
 * ContractInfo V1 contains information about a contract's outcomes,
 * their corresponding payouts, and the oracles to be used.
 */
export class DisjointContractInfo implements IDlcMessage {
  public static type = MessageType.ContractInfoV1;

  /**
   * Deserializes an contract_info_v0 message
   * @param buf
   */
  public static deserialize(
    reader: Buffer | BufferReader,
  ): DisjointContractInfo {
    if (reader instanceof Buffer) reader = new BufferReader(reader);

    const instance = new DisjointContractInfo();

    reader.readBigSize(); // read type
    instance.totalCollateral = reader.readUInt64BE();

    const numDisjointEvents = reader.readBigSize(); // read num_disjoint_events
    for (let i = 0; i < numDisjointEvents; i++) {
      const contractDescriptor = ContractDescriptor.deserialize(reader);
      const oracleInfo = SingleOracleInfo.deserialize(reader);

      instance.contractOraclePairs.push({ contractDescriptor, oracleInfo });
    }

    return instance;
  }

  /**
   * The type for contract_info_v1 message. contract_info_v0 = 55342
   */
  public type = DisjointContractInfo.type;

  public totalCollateral: bigint;

  public contractOraclePairs: IContractOraclePair[] = [];

  /**
   * Validates correctness of all fields in the message
   * https://github.com/discreetlogcontracts/dlcspecs/blob/master/Messaging.md#the-contract_info-type
   * @throws Will throw an error if validation fails
   */
  public validate(): void {
    this.contractOraclePairs.forEach((oraclePair) => {
      oraclePair.oracleInfo.validate();
      switch (oraclePair.contractDescriptor.type) {
        case ContractDescriptorType.Numeric:
          // eslint-disable-next-line no-case-declarations
          const contractDescriptor = oraclePair.contractDescriptor as NumericContractDescriptor;
          contractDescriptor.validate();

          switch (
            oraclePair.oracleInfo.announcement.oracleEvent.eventDescriptor.type
          ) {
            case MessageType.DigitDecompositionEventDescriptorV0:
              // eslint-disable-next-line no-case-declarations
              const eventDescriptor = oraclePair.oracleInfo.announcement
                .oracleEvent
                .eventDescriptor as DigitDecompositionEventDescriptorV0;
              if (eventDescriptor.nbDigits !== contractDescriptor.numDigits)
                throw new Error(
                  'DigitDecompositionEventDescriptorV0 and ContractDescriptorV1 must have the same numDigits',
                );
              // eslint-disable-next-line no-case-declarations
              const oracleEvent = oraclePair.oracleInfo.announcement
                .oracleEvent as OracleEventV0;
              if (
                oracleEvent.oracleNonces.length !== contractDescriptor.numDigits
              ) {
                throw new Error(
                  'oracleEvent.oracleNonces.length and contractDescriptor.numDigits must be the same',
                );
              }
          }
      }
    });
  }

  /**
   * Converts contract_info_v1 to JSON
   */
  public toJSON(): IDisjointContractInfoJSON {
    return {
      disjointContractInfo: {
        totalCollateral: Number(this.totalCollateral),
        contractInfos: this.contractOraclePairs.map((oraclePairs) => {
          return {
            contractDescriptor: oraclePairs.contractDescriptor.toJSON(),
            oracleInfo: oraclePairs.oracleInfo.toJSON(),
          };
        }),
      },
    };
  }

  /**
   * Serializes the contract_info_v1 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeUInt64BE(this.totalCollateral);
    dataWriter.writeBigSize(this.contractOraclePairs.length);

    for (const contractOraclePair of this.contractOraclePairs) {
      const { contractDescriptor, oracleInfo } = contractOraclePair;
      dataWriter.writeBytes(contractDescriptor.serialize());
      dataWriter.writeBytes(oracleInfo.serialize());
    }

    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

interface IContractOraclePair {
  contractDescriptor: ContractDescriptor;
  oracleInfo: SingleOracleInfo;
}

interface IContractOraclePairJSON {
  contractDescriptor:
    | EnumContractDescriptorJSON
    | NumericContractDescriptorJSON;
  oracleInfo: SingleOracleInfoJSON;
}

export interface ISingleContractInfoJSON {
  singleContractInfo: {
    totalCollateral: number;
    contractInfo: {
      contractDescriptor:
        | EnumContractDescriptorJSON
        | NumericContractDescriptorJSON;
      oracleInfo: SingleOracleInfoJSON;
    };
  };
}

export interface IDisjointContractInfoJSON {
  disjointContractInfo: {
    totalCollateral: number;
    contractInfos: IContractOraclePairJSON[];
  };
}
