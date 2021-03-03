import { BufferReader, BufferWriter } from "@node-lightning/bufio";
import { MessageType } from "../MessageType";
import { getTlv } from "../serialize/getTlv";
import { DlcMessage } from "./DlcMessage";
import { CetAdaptorSignaturesV0 } from "./CetAdaptorSignaturesV0";
import { FundingSignaturesV0 } from "./FundingSignaturesV0"

/**
 * SignDlc gives all of the initiator's signatures, which allows the
 * receiver to broadcast the funding transaction with both parties being
 * fully committed to all closing transactions.
 */
export class SignDlcV0 implements DlcMessage {
    public static type = MessageType.SignDlcV0;

    /**
     * Deserializes an sign_dlc_v0 message
     * @param buf
     */
    public static deserialize(buf: Buffer): SignDlcV0 {
        const instance = new SignDlcV0();
        const reader = new BufferReader(buf);

        reader.readUInt16BE(); // read type
        instance.contractId = reader.readBytes(32)
        instance.cetSignatures = CetAdaptorSignaturesV0.deserialize(getTlv(reader))
        instance.refundSignature = reader.readBytes(64)
        instance.fundingSignatures = FundingSignaturesV0.deserialize(getTlv(reader))

        return instance;
    }

    /**
     * The type for sign_dlc_v0 message. sign_dlc_v0 = 42782
     */
    public type = SignDlcV0.type;

    public contractId: Buffer;

    public cetSignatures: CetAdaptorSignaturesV0;

    public refundSignature: Buffer;

    public fundingSignatures: FundingSignaturesV0;

    /**
     * Serializes the sign_dlc_v0 message into a Buffer
     */
    public serialize(): Buffer {
        const writer = new BufferWriter();
        writer.writeUInt16BE(this.type);
        writer.writeBytes(this.contractId)
        writer.writeBytes(this.cetSignatures.serialize())
        writer.writeBytes(this.refundSignature)
        writer.writeBytes(this.fundingSignatures.serialize())

        return writer.toBuffer();
    }
}
