import { BufferReader, BufferWriter } from "@node-lightning/bufio";
import { MessageType } from "../MessageType";
import { getTlv } from "../serialize/getTlv";
import { CetAdaptorSignaturesV0 } from "./CetAdaptorSignaturesV0";
import { IDlcMessage } from "./DlcMessage";
import { FundingInputV0 } from "./FundingInputV0";
import { NegotiationFieldsV0 } from "./NegotiationFieldsV0";

/**
 * AcceptChannelMessage represents the accept_channel message defined in
 * BOLT #2 of the Lightning Specification. This message is sent by the
 * receiving node in reply to an open_channel message. This message
 * signals agreement to open a channel with the using the values both
 * message. After this message is received by the initiating peer, the
 * initiating peer will create a funding transaction and send the
 * funding_created message.
 */
export class AcceptDlcV0 implements IDlcMessage {
    public static type = MessageType.AcceptDlcV0;

    /**
     * Deserializes an oracle_info message
     * @param buf
     */
    public static deserialize(buf: Buffer): AcceptDlcV0 {
        const instance = new AcceptDlcV0();
        const reader = new BufferReader(buf);

        reader.readUInt16BE(); // read type
        instance.tempContractId = reader.readBytes(32);
        instance.totalCollateralSatoshis = reader.readUInt64BE();
        instance.fundingPubKey = reader.readBytes(33);
        const payoutSPKLen = reader.readUInt16BE();
        instance.payoutSPK = reader.readBytes(payoutSPKLen);
        const fundingInputsLen = reader.readUInt16BE();
        for (let i = 0; i < fundingInputsLen; i++) {
          instance.fundingInputs.push(FundingInputV0.deserialize(getTlv(reader)));
        }
        const changeSPKLen = reader.readUInt16BE();
        instance.changeSPK = reader.readBytes(changeSPKLen);
        instance.cetSignatures = CetAdaptorSignaturesV0.deserialize(getTlv(reader));
        instance.refundSignature = reader.readBytes(64);
        instance.negotiationFields = NegotiationFieldsV0.deserialize(getTlv(reader));

        return instance;
    }

    /**
     * The type for accept_channel message. accept_channel = 33
     */
    public type = AcceptDlcV0.type;

    public tempContractId: Buffer;

    public totalCollateralSatoshis: bigint;

    public fundingPubKey: Buffer;

    public payoutSPK: Buffer;

    public fundingInputs: FundingInputV0[] = [];

    public changeSPK: Buffer;

    public cetSignatures: CetAdaptorSignaturesV0;

    public refundSignature: Buffer;

    public negotiationFields: NegotiationFieldsV0;

    /**
     * Serializes the accept_channel message into a Buffer
     */
    public serialize(): Buffer {
        const writer = new BufferWriter();
        writer.writeUInt16BE(this.type);
        writer.writeBytes(this.tempContractId);
        writer.writeUInt64BE(this.totalCollateralSatoshis);
        writer.writeBytes(this.fundingPubKey);
        writer.writeUInt16BE(this.payoutSPK.length);
        writer.writeBytes(this.payoutSPK);
        writer.writeUInt16BE(this.fundingInputs.length);

        for (const fundingInput of this.fundingInputs) {
          writer.writeBytes(fundingInput.serialize());
        }

        writer.writeUInt16BE(this.changeSPK.length);
        writer.writeBytes(this.changeSPK);
        writer.writeBytes(this.cetSignatures.serialize());
        writer.writeBytes(this.refundSignature);
        writer.writeBytes(this.negotiationFields.serialize());

        return writer.toBuffer();
    }
}
