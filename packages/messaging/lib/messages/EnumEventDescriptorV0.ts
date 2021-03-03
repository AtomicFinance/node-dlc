import { BufferReader, BufferWriter } from "@node-lightning/bufio";
import { MessageType } from "../MessageType";
import { DlcMessage } from "./DlcMessage";

/**
 * EnumEventDescriptor V0 is a simple enumeration of outcomes
 */
export class EnumEventDescriptorV0 implements DlcMessage {
    public static type = MessageType.EnumEventDescriptorV0;

    /**
     * Deserializes an enum_event_descriptor_v0 message
     * @param buf
     */
    public static deserialize(buf: Buffer): EnumEventDescriptorV0 {
        const instance = new EnumEventDescriptorV0();
        const reader = new BufferReader(buf);

        reader.readBigSize(); // read type
        instance.length = reader.readBigSize(); // need to fix this
        reader.readUInt16BE(); // num_outcomes

        while (!reader.eof) {
          const outcomeLen = reader.readBigSize()
          instance.outcomes.push(reader.readBytes(Number(outcomeLen)))
        }

        return instance;
    }

    /**
     * The type for enum_event_descriptor_v0 message. enum_event_descriptor_v0 = 55302
     */
    public type = EnumEventDescriptorV0.type;

    public length: bigint;

    public outcomes: Buffer[] = [];

    /**
     * Serializes the enum_event_descriptor_v0 message into a Buffer
     */
    public serialize(): Buffer {
        const writer = new BufferWriter();
        writer.writeBigSize(this.type);
        writer.writeBigSize(this.length);
        writer.writeUInt16BE(this.outcomes.length)

        for (const outcome of this.outcomes) {
          writer.writeBigSize(outcome.length)
          writer.writeBytes(outcome)
        }

        return writer.toBuffer();
    }
}
