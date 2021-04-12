import { BufferReader, BufferWriter } from '@node-lightning/bufio';
import { MessageType } from '../MessageType';
import { getTlv } from '../serialize/getTlv';
import { CetAdaptorSignaturesV0 } from './CetAdaptorSignaturesV0';
import { IDlcMessage } from './DlcMessage';
import { FundingInputV0 } from './FundingInput';
import { NegotiationFields } from './NegotiationFields';

export abstract class DlcAccept implements IDlcMessage {
  public static deserialize(buf: Buffer): DlcAcceptV0 {
    const reader = new BufferReader(buf);

    const type = Number(reader.readUInt16BE());

    switch (type) {
      case MessageType.DlcAcceptV0:
        return DlcAcceptV0.deserialize(buf);
      default:
        throw new Error(`Dlc Accept message type must be DlcAcceptV0`);
    }
  }

  public abstract type: number;

  public abstract serialize(): Buffer;
}

/**
 * DlcAccept contains information about a node and indicates its
 * acceptance of the new DLC, as well as its CET and refund
 * transaction signatures. This is the second step toward creating
 * the funding transaction and closing transactions.
 */
export class DlcAcceptV0 implements IDlcMessage {
  public static type = MessageType.DlcAcceptV0;

  /**
   * Deserializes an oracle_info message
   * @param buf
   */
  public static deserialize(buf: Buffer): DlcAcceptV0 {
    const instance = new DlcAcceptV0();
    const reader = new BufferReader(buf);

    reader.readUInt16BE(); // read type
    instance.tempContractId = reader.readBytes(32);
    instance.acceptCollateralSatoshis = reader.readUInt64BE();
    instance.fundingPubKey = reader.readBytes(33);
    const payoutSPKLen = reader.readUInt16BE();
    instance.payoutSPK = reader.readBytes(payoutSPKLen);
    instance.payoutSerialId = reader.readUInt64BE();
    const fundingInputsLen = reader.readUInt16BE();
    for (let i = 0; i < fundingInputsLen; i++) {
      instance.fundingInputs.push(FundingInputV0.deserialize(getTlv(reader)));
    }
    const changeSPKLen = reader.readUInt16BE();
    instance.changeSPK = reader.readBytes(changeSPKLen);
    instance.changeSerialId = reader.readUInt64BE();
    instance.cetSignatures = CetAdaptorSignaturesV0.deserialize(getTlv(reader));
    instance.refundSignature = reader.readBytes(64);
    instance.negotiationFields = NegotiationFields.deserialize(getTlv(reader));

    return instance;
  }

  /**
   * The type for accept_channel message. accept_channel = 33
   */
  public type = DlcAcceptV0.type;

  public tempContractId: Buffer;

  public acceptCollateralSatoshis: bigint;

  public fundingPubKey: Buffer;

  public payoutSPK: Buffer;

  public payoutSerialId: bigint;

  public fundingInputs: FundingInputV0[] = [];

  public changeSPK: Buffer;

  public changeSerialId: bigint;

  public cetSignatures: CetAdaptorSignaturesV0;

  public refundSignature: Buffer;

  public negotiationFields: NegotiationFields;

  /**
   * Serializes the accept_channel message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeUInt16BE(this.type);
    writer.writeBytes(this.tempContractId);
    writer.writeUInt64BE(this.acceptCollateralSatoshis);
    writer.writeBytes(this.fundingPubKey);
    writer.writeUInt16BE(this.payoutSPK.length);
    writer.writeBytes(this.payoutSPK);
    writer.writeUInt64BE(this.payoutSerialId);
    writer.writeUInt16BE(this.fundingInputs.length);

    for (const fundingInput of this.fundingInputs) {
      writer.writeBytes(fundingInput.serialize());
    }

    writer.writeUInt16BE(this.changeSPK.length);
    writer.writeBytes(this.changeSPK);
    writer.writeUInt64BE(this.changeSerialId);
    writer.writeBytes(this.cetSignatures.serialize());
    writer.writeBytes(this.refundSignature);
    writer.writeBytes(this.negotiationFields.serialize());

    return writer.toBuffer();
  }

  public withoutSigs(): DlcAcceptWithoutSigs {
    return new DlcAcceptWithoutSigs(
      this.tempContractId,
      this.acceptCollateralSatoshis,
      this.fundingPubKey,
      this.payoutSPK,
      this.payoutSerialId,
      this.fundingInputs,
      this.changeSPK,
      this.changeSerialId,
      this.negotiationFields,
    );
  }
}

export class DlcAcceptWithoutSigs {
  constructor(
    readonly tempContractId: Buffer,
    readonly acceptCollateralSatoshis: bigint,
    readonly fundingPubKey: Buffer,
    readonly payoutSPK: Buffer,
    readonly payoutSerialId: bigint,
    readonly fundingInputs: FundingInputV0[],
    readonly changeSPK: Buffer,
    readonly changeSerialId: bigint,
    readonly negotiationFields: NegotiationFields,
  ) {}
}
