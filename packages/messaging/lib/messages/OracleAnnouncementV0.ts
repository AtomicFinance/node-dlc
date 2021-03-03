import { BufferReader, BufferWriter } from "@node-lightning/bufio";
import { MessageType } from "../MessageType";
import { getTlv } from "../serialize/getTlv"
import { DlcMessage } from "./DlcMessage";
import { OracleEventV0 } from "./OracleEventV0"

/**
 * In order to make it possible to hold oracles accountable in cases where
 * they do not release a signature for an event outcome, there needs to be
 * a proof that an oracle has committed to a given outcome. This proof is
 * given in a so-called oracle announcement, which contains an oracle event
 * together with the oracle public key and a signature over its serialization,
 * which must be valid with respect to the specified public key.
 * 
 * This also makes it possible for users to obtain oracle event information
 * from an un-trusted peer while being guaranteed that it originates from a
 * given oracle.
 */
export class OracleAnnouncementV0 implements DlcMessage {
    public static type = MessageType.OracleAnnouncementV0;

    /**
     * Deserializes an oracle_announcement_v0 message
     * @param buf
     */
    public static deserialize(buf: Buffer): OracleAnnouncementV0 {
        const instance = new OracleAnnouncementV0();
        const reader = new BufferReader(buf);

        reader.readBigSize(); // read type
        instance.length = reader.readBigSize();
        instance.announcementSig = reader.readBytes(64)
        instance.oraclePubkey = reader.readBytes(32)
        instance.oracleEvent = OracleEventV0.deserialize(getTlv(reader))

        return instance;
    }

    /**
     * The type for oracle_announcement_v0 message. oracle_announcement_v0 = 55332
     */
    public type = OracleAnnouncementV0.type;

    public length: bigint;

    public announcementSig: Buffer;

    public oraclePubkey: Buffer;

    public oracleEvent: OracleEventV0;

    /**
     * Serializes the oracle_announcement_v0 message into a Buffer
     */
    public serialize(): Buffer {
        const writer = new BufferWriter();
        writer.writeBigSize(this.type);
        writer.writeBigSize(this.length);
        writer.writeBytes(this.announcementSig)
        writer.writeBytes(this.oraclePubkey)
        writer.writeBytes(this.oracleEvent.serialize())

        return writer.toBuffer();
    }
}
