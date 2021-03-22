import { BufferReader, BufferWriter } from '@node-lightning/bufio';
import { MessageType } from '../MessageType';
import { getTlv } from '../serialize/getTlv';
import { IDlcMessage } from './DlcMessage';
import { PayoutFunction } from './PayoutFunction';
import { RoundingIntervalsV0 } from './RoundingIntervalsV0';

export abstract class ContractDescriptor {
  public static deserialize(
    buf: Buffer,
  ): ContractDescriptorV0 | ContractDescriptorV1 {
    const reader = new BufferReader(buf);

    const type = Number(reader.readBigSize());

    switch (type) {
      case MessageType.ContractDescriptorV0:
        return ContractDescriptorV0.deserialize(buf);
      case MessageType.ContractDescriptorV1:
        return ContractDescriptorV1.deserialize(buf);
      default:
        throw new Error(
          `Payout function TLV type must be ContractDescriptorV0 or ContractDescriptorV1`,
        );
    }
  }

  public abstract type: number;

  public abstract length: bigint;

  public abstract serialize(): Buffer;
}

/**
 * ContractDescriptor V0 contains information about a contract's outcomes
 * and their corresponding payouts.
 */
export class ContractDescriptorV0
  extends ContractDescriptor
  implements IDlcMessage {
  public static type = MessageType.ContractDescriptorV0;

  /**
   * Deserializes an contract_descriptor_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): ContractDescriptorV0 {
    const instance = new ContractDescriptorV0();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();
    reader.readBigSize(); // num_outcomes

    while (!reader.eof) {
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
  public type = ContractDescriptorV0.type;

  public length: bigint;

  public outcomes: IOutcome[] = [];

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

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

/**
 * ContractDescriptor V1 contains information about a contract's outcomes
 * and their corresponding payouts.
 */
export class ContractDescriptorV1
  extends ContractDescriptor
  implements IDlcMessage {
  public static type = MessageType.ContractDescriptorV1;

  /**
   * Deserializes an contract_descriptor_v1 message
   * @param buf
   */
  public static deserialize(buf: Buffer): ContractDescriptorV1 {
    const instance = new ContractDescriptorV1();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();
    instance.numDigits = reader.readUInt16BE(); // num_digits

    instance.payoutFunction = PayoutFunction.deserialize(getTlv(reader));
    instance.roundingIntervals = RoundingIntervalsV0.deserialize(
      getTlv(reader),
    );

    return instance;
  }

  /**
   * The type for contract_descriptor_v1 message. contract_descriptor_v1 = 42784
   */
  public type = ContractDescriptorV1.type;

  public length: bigint;

  public numDigits: number;

  public payoutFunction: PayoutFunction;

  public roundingIntervals: RoundingIntervalsV0;

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

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

interface IOutcome {
  outcome: Buffer;
  localPayout: bigint;
}
