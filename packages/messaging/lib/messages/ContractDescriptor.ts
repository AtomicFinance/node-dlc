import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { IDlcMessage } from './DlcMessage';
import { PayoutFunction, PayoutFunctionV0JSON } from './PayoutFunction';
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
          `Contract Descriptor TLV type must be Enumerated or Numeric`,
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
 * ContractDescriptor V0 contains information about a contract's outcomes
 * and their corresponding payouts.
 */
export class EnumeratedContractDescriptor
  extends ContractDescriptor
  implements IDlcMessage {
  public static type = ContractDescriptorType.Enumerated;

  /**
   * Deserializes an contract_descriptor_v0 message
   * @param buf
   */
  public static deserialize(
    reader: Buffer | BufferReader,
  ): EnumeratedContractDescriptor {
    if (reader instanceof Buffer) reader = new BufferReader(reader);

    const instance = new EnumeratedContractDescriptor();

    reader.readBigSize(); // read type
    const numOutcomes = reader.readBigSize(); // num_outcomes

    for (let i = 0; i < numOutcomes; i++) {
      instance.outcomes.push({
        outcome: reader.readBytes(32),
        localPayout: reader.readUInt64BE(),
      });
    }

    return instance;
  }

  /**
   * The type for contract_descriptor_v0 message. contract_descriptor_v0 = 42768
   */
  public type = EnumeratedContractDescriptor.type;

  public outcomes: IOutcome[] = [];

  /**
   * Converts contract_descriptor_v0 to JSON
   */
  public toJSON(): EnumContractDescriptorJSON {
    return {
      enumeratedContractDescriptor: {
        payouts: this.outcomes.map((payout) => {
          return {
            outcome: payout.outcome.toString('hex'),
            localPayout: Number(payout.localPayout),
          };
        }),
      },
    };
  }

  /**
   * Serializes the contract_descriptor_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeBigSize(this.outcomes.length);

    for (const outcome of this.outcomes) {
      dataWriter.writeBytes(outcome.outcome);
      dataWriter.writeUInt64BE(outcome.localPayout);
    }

    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

/**
 * ContractDescriptor V1 contains information about a contract's outcomes
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
    console.log('10');
    instance.numDigits = reader.readUInt16BE(); // num_digits
    console.log('numeric contract descriptor numdigits', instance.numDigits);
    console.log('11');

    instance.payoutFunction = PayoutFunction.deserialize(reader);
    console.log('12');
    instance.roundingIntervals = RoundingIntervals.deserialize(reader);

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
  outcome: Buffer;
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
    payoutFunction: PayoutFunctionV0JSON;
    roundingIntervals: IRoundingIntervalsJSON;
  };
}
