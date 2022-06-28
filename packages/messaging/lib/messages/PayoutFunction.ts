import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { MessageType } from '../MessageType';
import { getTlv } from '../serialize/getTlv';
import { IDlcMessage } from './DlcMessage';
import {
  HyperbolaPayoutCurvePieceJSON,
  PayoutCurvePiece,
  PolynomialPayoutCurvePieceJSON,
} from './PayoutCurvePiece';

export enum PayoutFunctionType {
  PayoutFunction = 0,
}
export abstract class PayoutFunction {
  public static deserialize(buf: Buffer): PayoutFunctionV0 {
    const reader = new BufferReader(buf);

    const type = Number(reader.readBigSize());

    switch (type) {
      case PayoutFunctionType.PayoutFunction:
        return PayoutFunctionV0.deserialize(buf);
      default:
        throw new Error(`Payout function TLV type must be PayoutFunctionV0`);
    }
  }

  public abstract type: number;

  public abstract length: bigint;

  public abstract toJSON(): PayoutFunctionV0JSON;

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
    reader.readBigSize(); // num_pieces
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
        endpoint: {
          eventOutcome: endpoint,
          outcomePayout: endpointPayout,
          extraPrecision,
        },
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

  public lastEndpoint: IEndpoint;

  public pieces: IPayoutCurvePieces[] = [];

  /**
   * Converts payout_function_v0 to JSON
   */
  public toJSON(): PayoutFunctionV0JSON {
    return {
      lastEndpoint: {
        eventOutcome: Number(this.endpoint0),
        outcomePayout: Number(this.endpointPayout0),
        extraPrecision: this.extraPrecision0,
      },
      payoutFunctionPieces: this.pieces.map((piece) => {
        return {
          payoutCurvePiece: piece.payoutCurvePiece.toJSON(),
          endpoint: {
            eventOutcome: Number(piece.endpoint.eventOutcome),
            outcomePayout: Number(piece.endpoint.outcomePayout),
            extraPrecision: piece.endpoint.extraPrecision,
          },
        };
      }),
    };
  }

  /**
   * Serializes the payout_function_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeUInt16BE(this.pieces.length);
    dataWriter.writeBigSize(this.endpoint0);
    dataWriter.writeBigSize(this.endpointPayout0);
    dataWriter.writeUInt16BE(this.extraPrecision0);

    for (const piece of this.pieces) {
      dataWriter.writeBytes(piece.payoutCurvePiece.serialize());
      dataWriter.writeBigSize(piece.endpoint.eventOutcome);
      dataWriter.writeBigSize(piece.endpoint.outcomePayout);
      dataWriter.writeUInt16BE(piece.endpoint.extraPrecision);
    }

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

interface IEndpoint {
  eventOutcome: bigint;
  outcomePayout: bigint;
  extraPrecision: number;
}

interface IEndpointJSON {
  eventOutcome: number;
  outcomePayout: number;
  extraPrecision: number;
}

interface IPayoutCurvePieces {
  payoutCurvePiece: PayoutCurvePiece;
  endpoint: IEndpoint;
}

interface IPayoutCurvePiecesJSON {
  payoutCurvePiece:
    | PolynomialPayoutCurvePieceJSON
    | HyperbolaPayoutCurvePieceJSON;
  endpoint: IEndpointJSON;
}

export interface PayoutFunctionV0JSON {
  payoutFunctionPieces: IPayoutCurvePiecesJSON[];
  lastEndpoint: IEndpointJSON;
}
