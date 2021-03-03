import { BufferReader, BufferWriter } from "@node-lightning/bufio";
import { MessageType } from "../MessageType";
import { DlcMessage } from "./DlcMessage";

/**
 * NegotiationFields V0 contains preferences of the accepter of a DLC
 * which are taken into account during DLC construction.
 */
export class NegotiationFieldsV0 implements DlcMessage {
    public static type = MessageType.NegotiationFieldsV0;

    /**
     * Deserializes an negotiation_fields_v0 message
     * @param buf
     */
    public static deserialize(buf: Buffer): NegotiationFieldsV0 {
        const instance = new NegotiationFieldsV0();
        const reader = new BufferReader(buf);

        reader.readBigSize(); // read type
        instance.length = reader.readBigSize();

        return instance;
    }

    /**
     * The type for negotiation_fields_v0 message. negotiation_fields_v0 = 55334
     */
    public type = NegotiationFieldsV0.type;

    public length: bigint;

    /**
     * Serializes the negotiation_fields_v0 message into a Buffer
     */
    public serialize(): Buffer {
        const writer = new BufferWriter();
        writer.writeBigSize(this.type);
        writer.writeBigSize(this.length);

        return writer.toBuffer();
    }
}
