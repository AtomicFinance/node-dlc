import { BufferReader, BufferWriter } from '@node-lightning/bufio';
import { sigToDER } from '@node-lightning/crypto';

import { MessageType } from '../MessageType';
import {
  CetAdaptorSignatures,
  ICetAdaptorSignaturesJSON,
} from './CetAdaptorSignatures';
import { IDlcMessage } from './DlcMessage';
import { FundingSignatures, IFundingSignaturesJSON } from './FundingSignatures';

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
    console.log('test1');
    instance.protocolVersion = reader.readUInt32BE();
    console.log('test2');
    instance.contractId = reader.readBytes(32);
    console.log('test3');
    instance.cetSignatures = CetAdaptorSignatures.deserialize(reader);
    console.log('test4');
    instance.refundSignature = reader.readBytes(64);
    console.log('test5');
    console.log('instance', instance);
    instance.fundingSignatures = FundingSignatures.deserialize(reader);

    return instance;
  }

  /**
   * The type for sign_dlc_v0 message. sign_dlc_v0 = 42782
   */
  public type = DlcSignV0.type;

  public protocolVersion: number;

  public contractId: Buffer;

  public cetSignatures: CetAdaptorSignatures;

  public refundSignature: Buffer;

  public fundingSignatures: FundingSignatures;

  /**
   * Converts sign_dlc_v0 to JSON
   */
  public toJSON(): IDlcSignV0JSON {
    return {
      message: {
        protocolVersion: this.protocolVersion,
        contractId: this.contractId.toString('hex'),
        cetAdaptorSignatures: this.cetSignatures.toJSON(),
        refundSignature: sigToDER(this.refundSignature).toString('hex'),
        fundingSignatures: this.fundingSignatures.toJSON(),
      },
      serialized: this.serialize().toString('hex'),
    };
  }

  /**
   * Serializes the sign_dlc_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeUInt16BE(this.type);
    writer.writeUInt32BE(this.protocolVersion);
    writer.writeBytes(this.contractId);
    writer.writeBytes(this.cetSignatures.serialize());
    writer.writeBytes(this.refundSignature);
    writer.writeBytes(this.fundingSignatures.serialize());

    return writer.toBuffer();
  }
}

export interface IDlcSignV0JSON {
  message: {
    protocolVersion: number;
    contractId: string;
    cetAdaptorSignatures: ICetAdaptorSignaturesJSON;
    refundSignature: string;
    fundingSignatures: IFundingSignaturesJSON;
  };
  serialized: string;
}
