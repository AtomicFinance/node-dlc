import { BufferReader, BufferWriter } from "@node-lightning/bufio";

export class Tlv {
    /**
     * Deserializes an tlv message
     * @param buf
     */
    public static deserialize(buf: Buffer): Tlv {
        const instance = new Tlv();
        const reader = new BufferReader(buf);

        instance.type = Number(reader.readBigSize()); // read type
        instance.length = reader.readBigSize();
        instance.body = reader.readBytes(Number(instance.length));

        return instance;
    }

    public type: number;

    public length: bigint;

    public body: Buffer;

    /**
     * Serializes the tlv message into a Buffer
     */
    public serialize(): Buffer {
        const writer = new BufferWriter();
        writer.writeBigSize(this.type);
        writer.writeBigSize(this.length);
        writer.writeBytes(this.body);

        return writer.toBuffer();
    }
}
