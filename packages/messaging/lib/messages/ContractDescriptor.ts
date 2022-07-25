import { BufferReader, BufferWriter } from '@node-lightning/bufio';
import assert from 'assert';

import { IDlcMessage } from './DlcMessage';
import { PayoutFunction, PayoutFunctionJSON } from './PayoutFunction';
import {
  ContractDescriptorPre163,
  ContractDescriptorV0,
  ContractDescriptorV1,
} from './pre-163/ContractDescriptor';
import { IRoundingIntervalsJSON, RoundingIntervals } from './RoundingIntervals';

export enum ContractDescriptorType {
  Enumerated = 0,
  Numeric = 1,
}
export abstract class ContractDescriptor {
  public static deserialize(
    reader: Buffer | BufferReader,
  ): EnumeratedContractDescriptor | NumericContractDescriptor {
    if (reader instanceof Buffer) reader = new BufferReader(reader);

    const tempReader = new BufferReader(reader.peakBytes());
    const type = Number(tempReader.readBigSize());

    switch (type) {
      case ContractDescriptorType.Enumerated:
        return EnumeratedContractDescriptor.deserialize(reader);
      case ContractDescriptorType.Numeric:
        return NumericContractDescriptor.deserialize(reader);
      default:
        throw new Error(
          `Contract Descriptor type must be Enumerated or Numeric`,
        );
    }
  }

  public static from163(
    contractDescriptor: ContractDescriptorPre163,
  ): ContractDescriptor {
    if (contractDescriptor instanceof ContractDescriptorV0) {
      return EnumeratedContractDescriptor.fromPre163(contractDescriptor);
    } else if (contractDescriptor instanceof ContractDescriptorV1) {
      return NumericContractDescriptor.fromPre163(contractDescriptor);
    } else {
      throw new Error(
        'Contract Descriptor must be ContractDescriptorV0 or ContractDescriptorV1',
      );
    }
  }

  public abstract type: number;

  public abstract toJSON():
    | EnumContractDescriptorJSON
    | NumericContractDescriptorJSON;

  public abstract serialize(): Buffer;
}

/**
 * EnumeratedContractDescriptor contains information about a contract's outcomes
 * and their corresponding payouts.
 */
export class EnumeratedContractDescriptor
  extends ContractDescriptor
  implements IDlcMessage {
  public static type = ContractDescriptorType.Enumerated;

  /**
   * Deserializes an enumerated_contract_descriptor message
   * @param buf
   */
  public static deserialize(
    reader: Buffer | BufferReader,
  ): EnumeratedContractDescriptor {
    if (reader instanceof Buffer) reader = new BufferReader(reader);

    const instance = new EnumeratedContractDescriptor();

    const type = reader.readBigSize(); // read type
    assert(
      Number(type) === this.type,
      `Expected Enumerated Contract Descriptor, got type ${this.type}`,
    );
    const numOutcomes = reader.readBigSize(); // num_outcomes

    for (let i = 0; i < numOutcomes; i++) {
      const strLen = reader.readBigSize();
      const strBuf = reader.readBytes(Number(strLen));

      instance.outcomes.push({
        outcome: strBuf.toString('utf8'),
        localPayout: reader.readUInt64BE(),
      });
    }

    return instance;
  }

  public static fromPre163(
    contractDescriptor: ContractDescriptorV0,
  ): EnumeratedContractDescriptor {
    const instance = new EnumeratedContractDescriptor();

    instance.outcomes = contractDescriptor.outcomes.map((outcome) => {
      return {
        outcome: outcome.outcome.toString('utf8'),
        localPayout: outcome.localPayout,
      };
    });

    return instance;
  }

  /**
   * The type for enumerated_contract_descriptor message
   */
  public type = EnumeratedContractDescriptor.type;

  public outcomes: IOutcome[] = [];

  /**
   * Converts enumerated_contract_descriptor to JSON
   */
  public toJSON(): EnumContractDescriptorJSON {
    return {
      enumeratedContractDescriptor: {
        payouts: this.outcomes.map((payout) => {
          return {
            outcome: payout.outcome,
            localPayout: Number(payout.localPayout),
          };
        }),
      },
    };
  }

  /**
   * Serializes the enumerated_contract_descriptor message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeBigSize(this.outcomes.length);

    for (const outcome of this.outcomes) {
      dataWriter.writeBigSize(outcome.outcome.length);
      dataWriter.writeBytes(Buffer.from(outcome.outcome));
      dataWriter.writeUInt64BE(outcome.localPayout);
    }

    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

/**
 * NumericContractDescriptor contains information about a contract's outcomes
 * and their corresponding payouts.
 */
export class NumericContractDescriptor
  extends ContractDescriptor
  implements IDlcMessage {
  public static type = ContractDescriptorType.Numeric;

  /**
   * Deserializes an contract_descriptor_v1 message
   * @param buf
   */
  public static deserialize(
    reader: Buffer | BufferReader,
  ): NumericContractDescriptor {
    if (reader instanceof Buffer) reader = new BufferReader(reader);
    const instance = new NumericContractDescriptor();

    reader.readBigSize(); // read type
    instance.numDigits = reader.readUInt16BE(); // num_digits
    instance.payoutFunction = PayoutFunction.deserialize(reader);
    instance.roundingIntervals = RoundingIntervals.deserialize(reader);

    return instance;
  }

  public static fromPre163(
    contractDescriptor: ContractDescriptorV1,
  ): NumericContractDescriptor {
    const instance = new NumericContractDescriptor();

    instance.numDigits = contractDescriptor.numDigits;
    instance.payoutFunction = PayoutFunction.fromPre163(
      contractDescriptor.payoutFunction,
    );
    instance.roundingIntervals = RoundingIntervals.from163(
      contractDescriptor.roundingIntervals,
    );

    return instance;
  }

  /**
   * The type for contract_descriptor_v1 message. contract_descriptor_v1 = 42784
   */
  public type = NumericContractDescriptor.type;

  public numDigits: number;

  public payoutFunction: PayoutFunction;

  public roundingIntervals: RoundingIntervals;

  /**
   * Validates correctness of all fields in the message
   * https://github.com/discreetlogcontracts/dlcspecs/blob/master/Messaging.md#the-contract_descriptor-type
   * @throws Will throw an error if validation fails
   */
  public validate(): void {
    this.roundingIntervals.validate();
  }

  /**
   * Converts contract_descriptor_v1 to JSON
   */
  public toJSON(): NumericContractDescriptorJSON {
    return {
      numericOutcomeContractDescriptor: {
        numDigits: this.numDigits,
        payoutFunction: this.payoutFunction.toJSON(),
        roundingIntervals: this.roundingIntervals.toJSON(),
      },
    };
  }

  /**
   * Serializes the contract_descriptor_v1 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeUInt16BE(this.numDigits);
    dataWriter.writeBytes(this.payoutFunction.serialize());
    dataWriter.writeBytes(this.roundingIntervals.serialize());

    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

interface IOutcome {
  outcome: string;
  localPayout: bigint;
}

interface IOutcomeJSON {
  outcome: string;
  localPayout: number;
}

export interface EnumContractDescriptorJSON {
  enumeratedContractDescriptor: {
    payouts: IOutcomeJSON[];
  };
}

export interface NumericContractDescriptorJSON {
  numericOutcomeContractDescriptor: {
    numDigits: number;
    payoutFunction: PayoutFunctionJSON;
    roundingIntervals: IRoundingIntervalsJSON;
  };
}
