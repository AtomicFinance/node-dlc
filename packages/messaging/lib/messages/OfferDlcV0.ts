import { BufferReader, BufferWriter } from "@node-lightning/bufio";
import { MessageType } from "../MessageType";
import { getTlv } from "../serialize/getTlv";
import { ContractInfo } from "./ContractInfo";
import { IDlcMessage } from "./DlcMessage";
import { FundingInputV0 } from "./FundingInputV0";

/**
 * OfferDlc message contains information about a node and indicates its
 * desire to enter into a new contract. This is the first step toward
 * creating the funding transaction and CETs.
 */
export class OfferDlcV0 implements IDlcMessage {
    public static type = MessageType.OfferDlcV0;

    /**
     * Deserializes an offer_dlc_v0 message
     * @param buf
     */
    public static deserialize(buf: Buffer): OfferDlcV0 {
        const instance = new OfferDlcV0();
        const reader = new BufferReader(buf);

        reader.readUInt16BE(); // read type
        instance.contractFlags = reader.readBytes(1);
        instance.chainHash = reader.readBytes(32);
        instance.contractInfo = ContractInfo.deserialize(getTlv(reader));
        instance.fundingPubKey = reader.readBytes(33);
        const payoutSPKLen = reader.readUInt16BE();
        instance.payoutSPK = reader.readBytes(payoutSPKLen);
        instance.offerCollateralSatoshis = reader.readUInt64BE();
        const fundingInputsLen = reader.readUInt16BE();

        for (let i = 0; i < fundingInputsLen; i++) {
          instance.fundingInputs.push(FundingInputV0.deserialize(getTlv(reader)));
        }

        const changeSPKLen = reader.readUInt16BE();
        instance.changeSPK = reader.readBytes(changeSPKLen);
        instance.feeRate = reader.readUInt64BE();
        instance.contractMaturityBound = reader.readUInt32BE();
        instance.contractTimeout = reader.readUInt32BE();

        return instance;
    }

    /**
     * The type for offer_dlc_v0 message. offer_dlc_v0 = 42778
     */
    public type = OfferDlcV0.type;

    public contractFlags: Buffer;

    public chainHash: Buffer;

    public contractInfo: ContractInfo;

    public fundingPubKey: Buffer;

    public payoutSPK: Buffer;

    public offerCollateralSatoshis: bigint;

    public fundingInputs: FundingInputV0[] = [];

    public changeSPK: Buffer;

    public feeRate: bigint;

    public contractMaturityBound: number;

    public contractTimeout: number;

    /**
     * Serializes the offer_dlc_v0 message into a Buffer
     */
    public serialize(): Buffer {
        const writer = new BufferWriter();
        writer.writeUInt16BE(this.type);
        writer.writeBytes(this.contractFlags);
        writer.writeBytes(this.chainHash);
        writer.writeBytes(this.contractInfo.serialize());
        writer.writeBytes(this.fundingPubKey);
        writer.writeUInt16BE(this.payoutSPK.length);
        writer.writeBytes(this.payoutSPK);
        writer.writeUInt64BE(this.offerCollateralSatoshis);
        writer.writeUInt16BE(this.fundingInputs.length);

        for (const fundingInput of this.fundingInputs) {
          writer.writeBytes(fundingInput.serialize());
        }

        writer.writeUInt16BE(this.changeSPK.length);
        writer.writeBytes(this.changeSPK);
        writer.writeUInt64BE(this.feeRate);
        writer.writeUInt32BE(this.contractMaturityBound);
        writer.writeUInt32BE(this.contractTimeout);

        return writer.toBuffer();
    }
}
