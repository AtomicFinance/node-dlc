import { BufferReader, BufferWriter } from "@node-lightning/bufio";
import { MessageType } from "../MessageType";
import { DlcMessage } from "./DlcMessage";

/**
 * ContractDescriptor V0 contains information about a contract's outcomes
 * and their corresponding payouts.
 */
export class ContractDescriptorV0 implements DlcMessage {
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
        reader.readBigSize() // num_outcomes

        while (!reader.eof) {
          instance.outcomes.push({ outcome: reader.readBytes(32), localPayout: reader.readUInt64BE() })
        }

        return instance;
    }

    /**
     * The type for contract_descriptor_v0 message. contract_descriptor_v0 = 42768
     */
    public type = ContractDescriptorV0.type;

    public length: bigint;

    public outcomes: Outcome[] = [];

    /**
     * Serializes the contract_descriptor_v0 message into a Buffer
     */
    public serialize(): Buffer {
        const writer = new BufferWriter();
        writer.writeBigSize(this.type);
        writer.writeBigSize(this.length);
        writer.writeBigSize(this.outcomes.length)

        for (const outcome of this.outcomes) {
          writer.writeBytes(outcome.outcome)
          writer.writeUInt64BE(outcome.localPayout)
        }

        return writer.toBuffer();
    }
}

interface Outcome {
  outcome: Buffer,
  localPayout: bigint
}
