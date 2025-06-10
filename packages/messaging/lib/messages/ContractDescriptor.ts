import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { ContractDescriptorType, MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';
import { PayoutFunction, PayoutFunctionV0JSON } from './PayoutFunction';
import {
  IRoundingIntervalsV0JSON,
  RoundingIntervalsV0,
} from './RoundingIntervalsV0';

export abstract class ContractDescriptor {
  public static deserialize(
    buf: Buffer,
  ): EnumeratedContractDescriptor | NumericOutcomeContractDescriptor {
    const reader = new BufferReader(buf);
    const typeId = Number(reader.readBigSize());

    switch (typeId) {
      case ContractDescriptorType.Enumerated:
        return EnumeratedContractDescriptor.deserialize(buf);
      case ContractDescriptorType.NumericOutcome:
        return NumericOutcomeContractDescriptor.deserialize(buf);
      default:
        throw new Error(
          `Contract descriptor type must be Enumerated (0) or NumericOutcome (1), got ${typeId}`,
        );
    }
  }

  public abstract contractDescriptorType: ContractDescriptorType;
  public abstract type: number; // For backward compatibility
  public abstract toJSON():
    | EnumeratedContractDescriptorJSON
    | NumericOutcomeContractDescriptorJSON;
  public abstract serialize(): Buffer;
}

/**
 * EnumeratedContractDescriptor contains information about a contract's outcomes
 * and their corresponding payouts (for enumerated outcomes).
 * This corresponds to the previous ContractDescriptorV0.
 */
export class EnumeratedContractDescriptor
  extends ContractDescriptor
  implements IDlcMessage {
  public static contractDescriptorType = ContractDescriptorType.Enumerated;

  /**
   * Deserializes an enumerated_contract_descriptor message
   * @param buf
   */
  public static deserialize(buf: Buffer): EnumeratedContractDescriptor {
    const instance = new EnumeratedContractDescriptor();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type (0)
    const numOutcomes = Number(reader.readBigSize());

    for (let i = 0; i < numOutcomes; i++) {
      const outcomeLen = Number(reader.readBigSize());
      const outcome = reader.readBytes(outcomeLen).toString();
      const localPayout = reader.readUInt64BE();

      instance.outcomes.push({
        outcome,
        localPayout,
      });
    }

    return instance;
  }

  /**
   * The type for enumerated_contract_descriptor message - using MessageType for IDlcMessage compatibility
   */
  public type = MessageType.ContractDescriptorV0; // For IDlcMessage compatibility

  /**
   * The contract descriptor type for new format
   */
  public contractDescriptorType = ContractDescriptorType.Enumerated;

  public outcomes: IOutcome[] = [];

  /**
   * Converts enumerated_contract_descriptor to JSON
   */
  public toJSON(): EnumeratedContractDescriptorJSON {
    return {
      type: this.type,
      contractDescriptorType: this.contractDescriptorType,
      outcomes: this.outcomes.map((outcome) => {
        return {
          outcome: outcome.outcome,
          localPayout: Number(outcome.localPayout),
        };
      }),
    };
  }

  /**
   * Serializes the enumerated_contract_descriptor message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();

    writer.writeBigSize(this.contractDescriptorType);
    writer.writeBigSize(this.outcomes.length);

    for (const outcome of this.outcomes) {
      writer.writeBigSize(outcome.outcome.length);
      writer.writeBytes(Buffer.from(outcome.outcome));
      writer.writeUInt64BE(outcome.localPayout);
    }

    return writer.toBuffer();
  }
}

/**
 * NumericOutcomeContractDescriptor contains information about a contract's outcomes
 * and their corresponding payouts (for numeric outcomes).
 * This corresponds to the previous ContractDescriptorV1.
 */
export class NumericOutcomeContractDescriptor
  extends ContractDescriptor
  implements IDlcMessage {
  public static contractDescriptorType = ContractDescriptorType.NumericOutcome;

  /**
   * Deserializes a numeric_outcome_contract_descriptor message
   * @param buf
   */
  public static deserialize(buf: Buffer): NumericOutcomeContractDescriptor {
    const instance = new NumericOutcomeContractDescriptor();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type (1)
    instance.numDigits = reader.readUInt16BE();

    // Parse payout function - need to calculate its size to avoid consuming all bytes
    const payoutFunctionStartPos = reader.position;
    const tempPayoutFunction = PayoutFunction.deserialize(
      reader.buffer.slice(reader.position),
    );
    instance.payoutFunction = tempPayoutFunction;

    // Skip past the payout function bytes
    const payoutFunctionSize = tempPayoutFunction.serialize().length;
    reader.position = payoutFunctionStartPos + payoutFunctionSize;

    // Parse remaining bytes as rounding intervals
    instance.roundingIntervals = RoundingIntervalsV0.deserialize(
      reader.buffer.slice(reader.position),
    );

    return instance;
  }

  /**
   * The type for numeric_outcome_contract_descriptor message - using MessageType for IDlcMessage compatibility
   */
  public type = MessageType.ContractDescriptorV1; // For IDlcMessage compatibility

  /**
   * The contract descriptor type for new format
   */
  public contractDescriptorType = ContractDescriptorType.NumericOutcome;

  public numDigits: number;

  public payoutFunction: PayoutFunction;

  public roundingIntervals: RoundingIntervalsV0;

  /**
   * Validates correctness of all fields in the message
   * https://github.com/discreetlogcontracts/dlcspecs/blob/master/Messaging.md#the-contract_descriptor-type
   * @throws Will throw an error if validation fails
   */
  public validate(): void {
    this.roundingIntervals.validate();
  }

  /**
   * Converts numeric_outcome_contract_descriptor to JSON
   */
  public toJSON(): NumericOutcomeContractDescriptorJSON {
    return {
      type: this.type,
      contractDescriptorType: this.contractDescriptorType,
      numDigits: this.numDigits,
      payoutFunction: this.payoutFunction.toJSON(),
      roundingIntervals: this.roundingIntervals.toJSON(),
    };
  }

  /**
   * Serializes the numeric_outcome_contract_descriptor message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();

    writer.writeBigSize(this.contractDescriptorType);
    writer.writeUInt16BE(this.numDigits);
    writer.writeBytes(this.payoutFunction.serialize());
    writer.writeBytes(this.roundingIntervals.serialize());

    return writer.toBuffer();
  }
}

// Legacy support - keeping old class names as aliases
export const ContractDescriptorV0 = EnumeratedContractDescriptor;
export const ContractDescriptorV1 = NumericOutcomeContractDescriptor;
export type ContractDescriptorV0 = EnumeratedContractDescriptor;
export type ContractDescriptorV1 = NumericOutcomeContractDescriptor;

interface IOutcome {
  outcome: string;
  localPayout: bigint;
}

interface IOutcomeJSON {
  outcome: string;
  localPayout: number;
}

export interface EnumeratedContractDescriptorJSON {
  type: number;
  contractDescriptorType: ContractDescriptorType;
  outcomes: IOutcomeJSON[];
}

export interface NumericOutcomeContractDescriptorJSON {
  type: number;
  contractDescriptorType: ContractDescriptorType;
  numDigits: number;
  payoutFunction: PayoutFunctionV0JSON;
  roundingIntervals: IRoundingIntervalsV0JSON;
}

// Legacy interfaces for backward compatibility
export type ContractDescriptorV0JSON = EnumeratedContractDescriptorJSON;
export type ContractDescriptorV1JSON = NumericOutcomeContractDescriptorJSON;
