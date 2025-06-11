import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';
import {
  HyperbolaPayoutCurvePieceJSON,
  PayoutCurvePiece,
  PolynomialPayoutCurvePieceJSON,
} from './PayoutCurvePiece';

/**
 * PayoutFunction contains the payout curve definition for numeric outcome contracts.
 * Updated to match dlcspecs format (no longer uses TLV).
 */
export class PayoutFunction implements IDlcMessage {
  public static type = MessageType.PayoutFunctionV0;

  /**
   * Creates a PayoutFunction from JSON data
   * @param json JSON object representing a payout function
   */
  public static fromJSON(json: any): PayoutFunction {
    const instance = new PayoutFunction();

    instance.endpoint0 = BigInt(json.endpoint0 || json.endpoint_0 || 0);
    instance.endpointPayout0 = BigInt(
      json.endpointPayout0 || json.endpoint_payout_0 || 0,
    );
    instance.extraPrecision0 =
      json.extraPrecision0 || json.extra_precision_0 || 0;

    const pieces = json.pieces || [];
    instance.pieces = pieces.map((pieceJson: any) => ({
      payoutCurvePiece: PayoutCurvePiece.fromJSON(
        pieceJson.payoutCurvePiece || pieceJson.payout_curve_piece,
      ),
      endpoint: BigInt(pieceJson.endpoint || 0),
      endpointPayout: BigInt(
        pieceJson.endpointPayout || pieceJson.endpoint_payout || 0,
      ),
      extraPrecision:
        pieceJson.extraPrecision || pieceJson.extra_precision || 0,
    }));

    return instance;
  }

  /**
   * Deserializes a payout_function message
   * @param buf
   */
  public static deserialize(buf: Buffer): PayoutFunction {
    const instance = new PayoutFunction();
    const reader = new BufferReader(buf);

    const numPieces = Number(reader.readBigSize());
    instance.endpoint0 = reader.readUInt64BE();
    instance.endpointPayout0 = reader.readUInt64BE();
    instance.extraPrecision0 = reader.readUInt16BE();

    for (let i = 0; i < numPieces; i++) {
      // Parse payout curve piece - need to calculate its size to avoid consuming all bytes
      const payoutCurvePieceStartPos = reader.position;
      const payoutCurvePiece = PayoutCurvePiece.deserialize(
        reader.buffer.subarray(reader.position),
      );

      // Skip past the payout curve piece bytes
      const payoutCurvePieceSize = payoutCurvePiece.serialize().length;
      reader.position = payoutCurvePieceStartPos + payoutCurvePieceSize;

      const endpoint = reader.readUInt64BE();
      const endpointPayout = reader.readUInt64BE();
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
   * The type for payout_function message. payout_function = 42790
   */
  public type = PayoutFunction.type;

  public endpoint0: bigint;
  public endpointPayout0: bigint;
  public extraPrecision0: number;

  public pieces: IPayoutCurvePieces[] = [];

  /**
   * Converts payout_function to JSON
   */
  public toJSON(): PayoutFunctionJSON {
    return {
      type: this.type,
      endpoint0: Number(this.endpoint0),
      endpointPayout0: Number(this.endpointPayout0),
      extraPrecision0: this.extraPrecision0,
      pieces: this.pieces.map((piece) => {
        return {
          payoutCurvePiece: piece.payoutCurvePiece.toJSON(),
          endpoint: Number(piece.endpoint),
          endpointPayout: Number(piece.endpointPayout),
          extraPrecision: piece.extraPrecision,
        };
      }),
    };
  }

  /**
   * Serializes the payout_function message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();

    writer.writeBigSize(this.pieces.length);
    writer.writeUInt64BE(this.endpoint0);
    writer.writeUInt64BE(this.endpointPayout0);
    writer.writeUInt16BE(this.extraPrecision0);

    for (const piece of this.pieces) {
      writer.writeBytes(piece.payoutCurvePiece.serialize());
      writer.writeUInt64BE(piece.endpoint);
      writer.writeUInt64BE(piece.endpointPayout);
      writer.writeUInt16BE(piece.extraPrecision);
    }

    return writer.toBuffer();
  }
}

// Legacy support
export const PayoutFunctionV0 = PayoutFunction;
export type PayoutFunctionV0 = PayoutFunction;

interface IPayoutCurvePieces {
  payoutCurvePiece: PayoutCurvePiece;
  endpoint: bigint;
  endpointPayout: bigint;
  extraPrecision: number;
}

interface IPayoutCurvePiecesJSON {
  payoutCurvePiece:
    | PolynomialPayoutCurvePieceJSON
    | HyperbolaPayoutCurvePieceJSON;
  endpoint: number;
  endpointPayout: number;
  extraPrecision: number;
}

export interface PayoutFunctionJSON {
  type: number;
  endpoint0: number;
  endpointPayout0: number;
  extraPrecision0: number;
  pieces: IPayoutCurvePiecesJSON[];
}

// Legacy interface
export type PayoutFunctionV0JSON = PayoutFunctionJSON;
