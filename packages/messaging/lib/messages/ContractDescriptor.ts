import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { ContractDescriptorType, MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';
import { PayoutFunction, PayoutFunctionV0JSON } from './PayoutFunction';
import { IRoundingIntervalsJSON, RoundingIntervals } from './RoundingIntervals';

export abstract class ContractDescriptor {
  public static deserialize(
    buf: Buffer,
  ): EnumeratedDescriptor | NumericalDescriptor {
    const reader = new BufferReader(buf);
    const typeId = Number(reader.readBigSize());

    switch (typeId) {
      case ContractDescriptorType.Enumerated:
        return EnumeratedDescriptor.deserialize(buf);
      case ContractDescriptorType.NumericOutcome:
        return NumericalDescriptor.deserialize(buf);
      default:
        throw new Error(
          `Contract descriptor type must be Enumerated (0) or NumericOutcome (1), got ${typeId}`,
        );
    }
  }

  /**
   * Creates a ContractDescriptor from JSON data (e.g., from test vectors)
   * @param json JSON object representing a contract descriptor
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): ContractDescriptor {
    if (!json) {
      throw new Error('contractDescriptor is required');
    }

    // Handle enumerated contract descriptor
    if (
      json.enumeratedContractDescriptor ||
      json.enumerated_contract_descriptor
    ) {
      return EnumeratedDescriptor.fromJSON(
        json.enumeratedContractDescriptor ||
          json.enumerated_contract_descriptor,
      );
    }
    // Handle numeric outcome contract descriptor
    else if (
      json.numericOutcomeContractDescriptor ||
      json.numeric_outcome_contract_descriptor
    ) {
      return NumericalDescriptor.fromJSON(
        json.numericOutcomeContractDescriptor ||
          json.numeric_outcome_contract_descriptor,
      );
    } else {
      throw new Error(
        'contractDescriptor must have either enumeratedContractDescriptor or numericOutcomeContractDescriptor',
      );
    }
  }

  public abstract contractDescriptorType: ContractDescriptorType;
  public abstract type: number; // For backward compatibility
  public abstract toJSON(): EnumeratedDescriptorJSON | NumericalDescriptorJSON;
  public abstract serialize(): Buffer;
}

/**
 * EnumeratedContractDescriptor contains information about a contract's outcomes
 * and their corresponding payouts (for enumerated outcomes).
 * This corresponds to the previous ContractDescriptorV0.
 */
export class EnumeratedDescriptor
  extends ContractDescriptor
  implements IDlcMessage {
  public static contractDescriptorType = ContractDescriptorType.Enumerated;

  /**
   * Creates an EnumeratedContractDescriptor from JSON data
   * @param json JSON object representing an enumerated contract descriptor
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): EnumeratedDescriptor {
    const instance = new EnumeratedDescriptor();

    const payouts = json.payouts || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    instance.outcomes = payouts.map((payout: any) => ({
      outcome: payout.outcome,
      localPayout: BigInt(payout.offerPayout || 0), // Use canonical offerPayout field
    }));

    return instance;
  }

  /**
   * Deserializes an enumerated_contract_descriptor message
   * @param buf
   */
  public static deserialize(buf: Buffer): EnumeratedDescriptor {
    const instance = new EnumeratedDescriptor();
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
  public toJSON(): EnumeratedDescriptorJSON {
    // Return enum variant format for Rust compatibility
    return {
      enumeratedContractDescriptor: {
        payouts: this.outcomes.map((outcome) => ({
          outcome: outcome.outcome,
          offerPayout: Number(outcome.localPayout), // Use offerPayout to match Rust
        })),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
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
export class NumericalDescriptor
  extends ContractDescriptor
  implements IDlcMessage {
  public static contractDescriptorType = ContractDescriptorType.NumericOutcome;

  /**
   * Creates a NumericOutcomeContractDescriptor from JSON data
   * @param json JSON object representing a numeric outcome contract descriptor
   */
  public static fromJSON(json: any): NumericalDescriptor {
    const instance = new NumericalDescriptor();

    instance.numDigits = json.numDigits || json.num_digits || 0;

    // Parse payout function using proper fromJSON method
    instance.payoutFunction = PayoutFunction.fromJSON(
      json.payoutFunction || json.payout_function,
    );

    // Parse rounding intervals using proper fromJSON method
    instance.roundingIntervals = RoundingIntervals.fromJSON(
      json.roundingIntervals || json.rounding_intervals,
    );

    return instance;
  }

  /**
   * Deserializes a numeric_outcome_contract_descriptor message
   * @param buf
   */
  public static deserialize(buf: Buffer): NumericalDescriptor {
    const instance = new NumericalDescriptor();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type (1)
    instance.numDigits = reader.readUInt16BE();

    // Parse payout function - need to calculate its size to avoid consuming all bytes
    const payoutFunctionStartPos = reader.position;
    const tempPayoutFunction = PayoutFunction.deserialize(
      reader.buffer.subarray(reader.position),
    );
    instance.payoutFunction = tempPayoutFunction;

    // Skip past the payout function bytes
    const payoutFunctionSize = tempPayoutFunction.serialize().length;
    reader.position = payoutFunctionStartPos + payoutFunctionSize;

    // Parse remaining bytes as rounding intervals
    instance.roundingIntervals = RoundingIntervals.deserialize(
      reader.buffer.subarray(reader.position),
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
   * Converts numeric_outcome_contract_descriptor to JSON
   */
  public toJSON(): NumericalDescriptorJSON {
    // Return enum variant format for Rust compatibility
    return {
      numericOutcomeContractDescriptor: {
        numDigits: this.numDigits,
        payoutFunction: this.payoutFunction.toJSON(),
        roundingIntervals: this.roundingIntervals.toJSON(),
      },
    } as any;
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
export const ContractDescriptorV0 = EnumeratedDescriptor;
export const ContractDescriptorV1 = NumericalDescriptor;
export type ContractDescriptorV0 = EnumeratedDescriptor;
export type ContractDescriptorV1 = NumericalDescriptor;

interface IOutcome {
  outcome: string;
  localPayout: bigint;
}

interface IOutcomeJSON {
  outcome: string;
  localPayout: number;
}

export interface EnumeratedDescriptorJSON {
  type?: number; // Made optional for rust-dlc compatibility
  contractDescriptorType?: ContractDescriptorType; // Made optional for rust-dlc compatibility
  outcomes: IOutcomeJSON[];
}

export interface NumericalDescriptorJSON {
  type?: number; // Made optional for rust-dlc compatibility
  contractDescriptorType?: ContractDescriptorType; // Made optional for rust-dlc compatibility
  numDigits: number;
  payoutFunction: PayoutFunctionV0JSON;
  roundingIntervals: IRoundingIntervalsJSON;
}

// Legacy interfaces for backward compatibility
export type ContractDescriptorV0JSON = EnumeratedDescriptorJSON;
export type ContractDescriptorV1JSON = NumericalDescriptorJSON;
