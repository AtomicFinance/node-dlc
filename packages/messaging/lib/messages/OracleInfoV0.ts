import { BufferReader, BufferWriter } from "@node-lightning/bufio";
import { MessageType } from "../MessageType";
import { getTlv } from "../serialize/getTlv"
import { DlcMessage } from "./DlcMessage";
import { OracleAnnouncementV0 } from "./OracleAnnouncementV0"

/**
 * OracleInfo contains information about the oracles to be used in
 * executing a DLC.
 */
export class OracleInfoV0 implements DlcMessage {
    public static type = MessageType.OracleInfoV0;

    /**
     * Deserializes an oracle_info_v0 message
     * @param buf
     */
    public static deserialize(buf: Buffer): OracleInfoV0 {
        const instance = new OracleInfoV0();
        const reader = new BufferReader(buf);

        reader.readBigSize(); // read type
        instance.length = reader.readBigSize();
        instance.announcement = OracleAnnouncementV0.deserialize(getTlv(reader))

        return instance;
    }

    /**
     * The type for oracle_info_v0 message. oracle_info_v0 = 42770
     */
    public type = OracleInfoV0.type;

    public length: bigint;

    public announcement: OracleAnnouncementV0;

    /**
     * Serializes the oracle_info_v0 message into a Buffer
     */
    public serialize(): Buffer {
        const writer = new BufferWriter();
        writer.writeBigSize(this.type);
        writer.writeBigSize(this.length);
        writer.writeBytes(this.announcement.serialize())

        return writer.toBuffer();
    }
}
