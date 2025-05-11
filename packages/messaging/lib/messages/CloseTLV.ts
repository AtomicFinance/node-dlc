import { OutPoint } from '@node-lightning/bitcoin';
import { BufferWriter, StreamReader } from '@node-lightning/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';

export class CloseTLV implements IDlcMessage {
  public static type = MessageType.CloseTLV;
  /**
   * Deserializes a close_tlv message
   * @param buf
   */
  public static deserialize(buf: Buffer): CloseTLV {
    const instance = new CloseTLV();
    const reader = StreamReader.fromBuffer(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();
    instance.contractId = reader.readBytes(32);
    instance.offerPayoutSatoshis = reader.readBigUInt64BE();
    instance.offerFundingPubKey = reader.readBytes(33);
    instance.acceptFundingPubkey = reader.readBytes(33);
    instance.outpoint = OutPoint.parse(reader);

    return instance;
  }

  public type = CloseTLV.type;

  public length: bigint;

  public contractId: Buffer;

  public offerPayoutSatoshis: bigint;

  public offerFundingPubKey: Buffer;

  public acceptFundingPubkey: Buffer;

  public outpoint: OutPoint;

  /**
   * Converts close_tlv to JSON
   */
  public toJSON(): ICloseTLVJSON {
    return {
      type: this.type,
      contractId: this.contractId.toString('hex'),
      offerPayoutSatoshis: Number(this.offerPayoutSatoshis),
      offerFundingPubKey: this.offerFundingPubKey.toString('hex'),
      acceptFundingPubkey: this.acceptFundingPubkey.toString('hex'),
      outpoint: this.outpoint.toJSON(), // Use OutPoint's toJSON method
    };
  }

  /**
   * Serializes the close_tlv message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(CloseTLV.type);

    const dataWriter = new BufferWriter();

    dataWriter.writeBytes(this.contractId);
    dataWriter.writeUInt64BE(this.offerPayoutSatoshis);
    dataWriter.writeBytes(this.offerFundingPubKey);
    dataWriter.writeBytes(this.acceptFundingPubkey);
    dataWriter.writeBytes(this.outpoint.serialize()); // Use OutPoint's serialize method

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

export interface ICloseTLVJSON {
  type: number;
  contractId: string;
  offerPayoutSatoshis: number;
  offerFundingPubKey: string;
  acceptFundingPubkey: string;
  outpoint: {
    txid: string;
    index: number;
  };
}
