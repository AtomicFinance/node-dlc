import { BufferReader, BufferWriter } from '@node-lightning/bufio';
import { MessageType } from '../MessageType';
import { getTlv } from '../serialize/getTlv';
import { CetAdaptorSignaturesV0 } from './CetAdaptorSignaturesV0';
import { IDlcMessage } from './DlcMessage';
import { FundingSignaturesV0 } from './FundingSignaturesV0';

export abstract class DlcSign {
  public static deserialize(buf: Buffer): DlcSignV0 {
    const reader = new BufferReader(buf);

    const type = Number(reader.readBigSize());

    switch (type) {
      case MessageType.DlcOfferV0:
        return DlcSignV0.deserialize(buf);
      default:
        throw new Error(`Payout function TLV type must be DlcSignV0`);
    }
  }

  public abstract type: number;

  public abstract serialize(): Buffer;
}

/**
 * DlcSign gives all of the initiator's signatures, which allows the
 * receiver to broadcast the funding transaction with both parties being
 * fully committed to all closing transactions.
 */
export class DlcSignV0 implements IDlcMessage {
  public static type = MessageType.DlcSignV0;

  /**
   * Deserializes an sign_dlc_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): DlcSignV0 {
    const instance = new DlcSignV0();
    const reader = new BufferReader(buf);

    reader.readUInt16BE(); // read type
    instance.contractId = reader.readBytes(32);
    instance.cetSignatures = CetAdaptorSignaturesV0.deserialize(getTlv(reader));
    instance.refundSignature = reader.readBytes(64);
    instance.fundingSignatures = FundingSignaturesV0.deserialize(
      getTlv(reader),
    );

    return instance;
  }

  /**
   * The type for sign_dlc_v0 message. sign_dlc_v0 = 42782
   */
  public type = DlcSignV0.type;

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
    writer.writeBytes(this.contractId);
    writer.writeBytes(this.cetSignatures.serialize());
    writer.writeBytes(this.refundSignature);
    writer.writeBytes(this.fundingSignatures.serialize());

    return writer.toBuffer();
  }
}
