import { BufferReader, BufferWriter } from '@node-lightning/bufio';
import { MessageType } from '../MessageType';
import { getTlv } from '../serialize/getTlv';
import { IDlcMessage } from './DlcMessage';
import { PayoutCurvePiece } from './PayoutCurvePiece';

export abstract class PayoutFunction {
  public static deserialize(buf: Buffer): PayoutFunctionV0 {
    const reader = new BufferReader(buf);

    const type = Number(reader.readBigSize());

    switch (type) {
      case MessageType.PayoutFunctionV0:
        return PayoutFunctionV0.deserialize(buf);
      default:
        throw new Error(`Payout function TLV type must be PayoutFunctionV0`);
    }
  }

  public abstract type: number;

  public abstract length: bigint;

  public abstract serialize(): Buffer;
}

/**
 * PayoutFunction V0
 */
export class PayoutFunctionV0 extends PayoutFunction implements IDlcMessage {
  public static type = MessageType.PayoutFunctionV0;

  /**
   * Deserializes an payout_function_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): PayoutFunctionV0 {
    const instance = new PayoutFunctionV0();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize(); // need to fix this
    reader.readUInt16BE(); // num_pieces
    instance.endpoint0 = reader.readBigSize();
    instance.endpointPayout0 = reader.readBigSize();
    instance.extraPrecision0 = reader.readUInt16BE();

    while (!reader.eof) {
      const payoutCurvePiece = PayoutCurvePiece.deserialize(getTlv(reader));
      const endpoint = reader.readBigSize();
      const endpointPayout = reader.readBigSize();
      const extraPrecision = reader.readUInt16BE();

      instance.pieces.push({
        payoutCurvePiece,
        endpoint,
        endpointPayout,
        extraPrecision,
      });
    }

    return instance;
  }

  /**
   * The type for payout_function_v0 message. payout_function_v0 = 42790
   */
  public type = PayoutFunctionV0.type;

  public length: bigint;

  public endpoint0: bigint;
  public endpointPayout0: bigint;
  public extraPrecision0: number;

  public pieces: IPayoutCurvePieces[];

  /**
   * Serializes the payout_function_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);
    writer.writeBigSize(this.length);

    const dataWriter = new BufferWriter();
    dataWriter.writeUInt16BE(this.pieces.length);
    dataWriter.writeBigSize(this.endpoint0);
    dataWriter.writeBigSize(this.endpointPayout0);
    dataWriter.writeUInt16BE(this.extraPrecision0);

    for (const piece of this.pieces) {
      dataWriter.writeBytes(piece.payoutCurvePiece.serialize());
      dataWriter.writeBigSize(piece.endpoint);
      dataWriter.writeBigSize(piece.endpointPayout);
      dataWriter.writeUInt16BE(piece.extraPrecision);
    }

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

interface IPayoutCurvePieces {
  payoutCurvePiece: PayoutCurvePiece;
  endpoint: bigint;
  endpointPayout: bigint;
  extraPrecision: number;
}
