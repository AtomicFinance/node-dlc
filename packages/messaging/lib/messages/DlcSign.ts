import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import { deserializeTlv } from '../serialize/deserializeTlv';
import { getTlv } from '../serialize/getTlv';
import { BatchFundingGroup, IBatchFundingGroupJSON } from './BatchFundingGroup';
import {
  CetAdaptorSignaturesV0,
  ICetAdaptorSignaturesV0JSON,
} from './CetAdaptorSignaturesV0';
import { IDlcMessage } from './DlcMessage';
import {
  FundingSignaturesV0,
  IFundingSignaturesV0JSON,
} from './FundingSignaturesV0';

export abstract class DlcSign {
  public static deserialize(buf: Buffer): DlcSignV0 {
    const reader = new BufferReader(buf);

    const type = Number(reader.readUInt16BE());

    switch (type) {
      case MessageType.DlcSignV0:
        return DlcSignV0.deserialize(buf);
      default:
        throw new Error(`Dlc Sign message type must be DlcSignV0`);
    }
  }

  public abstract type: number;

  public abstract toJSON(): IDlcSignV0JSON;

  public abstract serialize(): Buffer;
}

/**
 * DlcSign gives all of the initiator's signatures, which allows the
 * receiver to broadcast the funding transaction with both parties being
 * fully committed to all closing transactions.
 */
export class DlcSignV0 extends DlcSign implements IDlcMessage {
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

    while (!reader.eof) {
      const buf = getTlv(reader);
      const tlvReader = new BufferReader(buf);
      const { type } = deserializeTlv(tlvReader);

      switch (Number(type)) {
        case MessageType.BatchFundingGroup:
          if (!instance.batchFundingGroups) {
            instance.batchFundingGroups = [];
          }
          instance.batchFundingGroups.push(BatchFundingGroup.deserialize(buf));
          break;
        default:
          break;
      }
    }

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

  public batchFundingGroups?: BatchFundingGroup[];

  /**
   * Converts sign_dlc_v0 to JSON
   */
  public toJSON(): IDlcSignV0JSON {
    const tlvs = [];

    if (this.batchFundingGroups) {
      this.batchFundingGroups.forEach((group) => {
        tlvs.push(group.serialize());
      });
    }

    return {
      type: this.type,
      contractId: this.contractId.toString('hex'),
      cetSignatures: this.cetSignatures.toJSON(),
      refundSignature: this.refundSignature.toString('hex'),
      fundingSignatures: this.fundingSignatures.toJSON(),
      tlvs,
    };
  }

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

    if (this.batchFundingGroups)
      this.batchFundingGroups.forEach((fundingInfo) =>
        writer.writeBytes(fundingInfo.serialize()),
      );

    return writer.toBuffer();
  }
}

export interface IDlcSignV0JSON {
  type: number;
  contractId: string;
  cetSignatures: ICetAdaptorSignaturesV0JSON;
  refundSignature: string;
  fundingSignatures: IFundingSignaturesV0JSON;
  tlvs: IBatchFundingGroupJSON[];
}

export class DlcSignContainer {
  private signs: DlcSign[] = [];

  /**
   * Adds a DlcSign to the container.
   * @param sign The DlcSign to add.
   */
  public addSign(sign: DlcSign): void {
    this.signs.push(sign);
  }

  /**
   * Returns all DlcSigns in the container.
   * @returns An array of DlcSign instances.
   */
  public getSigns(): DlcSign[] {
    return this.signs;
  }

  /**
   * Serializes all DlcSigns in the container to a Buffer.
   * @returns A Buffer containing the serialized DlcSigns.
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    // Write the number of signs in the container first.
    writer.writeBigSize(this.signs.length);
    // Serialize each sign and write it.
    this.signs.forEach((sign) => {
      const serializedSign = sign.serialize();
      // Optionally, write the length of the serialized sign for easier deserialization.
      writer.writeBigSize(serializedSign.length);
      writer.writeBytes(serializedSign);
    });
    return writer.toBuffer();
  }

  /**
   * Deserializes a Buffer into a DlcSignContainer with DlcSigns.
   * @param buf The Buffer to deserialize.
   * @returns A DlcSignContainer instance.
   */
  public static deserialize(buf: Buffer): DlcSignContainer {
    const reader = new BufferReader(buf);
    const container = new DlcSignContainer();
    const signsCount = reader.readBigSize();
    for (let i = 0; i < signsCount; i++) {
      // Optionally, read the length of the serialized sign if it was written during serialization.
      const signLength = reader.readBigSize();
      const signBuf = reader.readBytes(Number(signLength));
      const sign = DlcSign.deserialize(signBuf); // Adjust based on actual implementation.
      container.addSign(sign);
    }
    return container;
  }
}
