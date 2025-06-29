import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import { bigIntToNumber, toBigInt } from '../util';
import { IDlcMessage } from './DlcMessage';
import {
  HyperbolaPayoutCurvePiece,
  HyperbolaPayoutCurvePieceJSON,
  PayoutCurvePiece,
  PolynomialPayoutCurvePieceJSON,
} from './PayoutCurvePiece';

/**
 * PayoutFunction contains the payout curve definition for numeric outcome contracts.
 * Updated to match rust-dlc format exactly.
 */
export class PayoutFunction implements IDlcMessage {
  public static type = MessageType.PayoutFunction;

  /**
   * Creates a PayoutFunction from JSON data
   * @param json JSON object representing a payout function
   */
  public static fromJSON(json: any): PayoutFunction {
    const instance = new PayoutFunction();

    // Parse payout function pieces
    const pieces =
      json.payoutFunctionPieces || json.payout_function_pieces || [];
    instance.payoutFunctionPieces = pieces.map(
      (pieceJson: any, index: number) => {
        const piece = {
          endPoint: {
            eventOutcome: toBigInt(pieceJson.endPoint?.eventOutcome),
            outcomePayout: toBigInt(pieceJson.endPoint?.outcomePayout),
            extraPrecision: pieceJson.endPoint?.extraPrecision || 0,
          },
          payoutCurvePiece: PayoutCurvePiece.fromJSON(
            pieceJson.payoutCurvePiece || pieceJson.payout_curve_piece,
          ),
        };

        // For HyperbolaPayoutCurvePiece, set the left and right end points
        if (piece.payoutCurvePiece instanceof HyperbolaPayoutCurvePiece) {
          const hyperbola = piece.payoutCurvePiece as HyperbolaPayoutCurvePiece;

          // Left end point is this piece's endPoint
          hyperbola.leftEndPoint = piece.endPoint;

          // Right end point is the next piece's endPoint, or lastEndpoint if this is the last piece
          if (index < pieces.length - 1) {
            const nextPiece = pieces[index + 1];
            hyperbola.rightEndPoint = {
              eventOutcome: toBigInt(nextPiece.endPoint?.eventOutcome),
              outcomePayout: toBigInt(nextPiece.endPoint?.outcomePayout),
              extraPrecision: nextPiece.endPoint?.extraPrecision || 0,
            };
          } else {
            // Use lastEndpoint for the final piece
            const lastEndpoint = json.lastEndpoint || json.last_endpoint || {};
            hyperbola.rightEndPoint = {
              eventOutcome: toBigInt(lastEndpoint.eventOutcome),
              outcomePayout: toBigInt(lastEndpoint.outcomePayout),
              extraPrecision: lastEndpoint.extraPrecision || 0,
            };
          }
        }

        return piece;
      },
    );

    // Parse last endpoint
    const lastEndpoint = json.lastEndpoint || json.last_endpoint;
    if (lastEndpoint) {
      instance.lastEndpoint = {
        eventOutcome: toBigInt(lastEndpoint.eventOutcome),
        outcomePayout: toBigInt(lastEndpoint.outcomePayout),
        extraPrecision: lastEndpoint.extraPrecision || 0,
      };
    } else {
      // Default last endpoint if not provided
      instance.lastEndpoint = {
        eventOutcome: BigInt(0),
        outcomePayout: BigInt(0),
        extraPrecision: 0,
      };
    }

    return instance;
  }

  /**
   * Deserializes a payout_function message
   * @param buf
   */
  public static deserialize(buf: Buffer): PayoutFunction {
    const instance = new PayoutFunction();
    const reader = new BufferReader(buf);

    // Read payout function pieces (as vec)
    const numPieces = Number(reader.readBigSize());

    for (let i = 0; i < numPieces; i++) {
      // Read end_point first
      const eventOutcome = reader.readUInt64BE();
      const outcomePayout = reader.readUInt64BE();
      const extraPrecision = reader.readUInt16BE();

      // Read payout curve piece
      const payoutCurvePieceStartPos = reader.position;
      const payoutCurvePiece = PayoutCurvePiece.deserialize(
        reader.buffer.subarray(reader.position),
      );

      // Skip past the payout curve piece bytes
      const payoutCurvePieceSize = payoutCurvePiece.serialize().length;
      reader.position = payoutCurvePieceStartPos + payoutCurvePieceSize;

      instance.payoutFunctionPieces.push({
        endPoint: {
          eventOutcome,
          outcomePayout,
          extraPrecision,
        },
        payoutCurvePiece,
      });
    }

    // Read last_endpoint
    instance.lastEndpoint = {
      eventOutcome: reader.readUInt64BE(),
      outcomePayout: reader.readUInt64BE(),
      extraPrecision: reader.readUInt16BE(),
    };

    return instance;
  }

  /**
   * The type for payout_function message. payout_function = 42790
   */
  public type = PayoutFunction.type;

  public payoutFunctionPieces: IPayoutFunctionPiece[] = [];
  public lastEndpoint: IPayoutPoint;

  /**
   * Constructor that ensures proper initialization
   */
  constructor() {
    // Explicitly initialize arrays to handle file-linking issues
    this.payoutFunctionPieces = [];
  }

  /**
   * Converts payout_function to JSON
   */
  public toJSON(): PayoutFunctionJSON {
    return {
      payoutFunctionPieces: this.payoutFunctionPieces.map((piece) => ({
        endPoint: {
          eventOutcome: bigIntToNumber(piece.endPoint.eventOutcome),
          outcomePayout: bigIntToNumber(piece.endPoint.outcomePayout),
          extraPrecision: piece.endPoint.extraPrecision,
        },
        payoutCurvePiece: piece.payoutCurvePiece.toJSON(),
      })),
      lastEndpoint: {
        eventOutcome: bigIntToNumber(this.lastEndpoint.eventOutcome),
        outcomePayout: bigIntToNumber(this.lastEndpoint.outcomePayout),
        extraPrecision: this.lastEndpoint.extraPrecision,
      },
    };
  }

  /**
   * Serializes the payout_function message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();

    // Write payout_function_pieces as vec (length + elements)
    writer.writeBigSize(this.payoutFunctionPieces.length);

    for (const piece of this.payoutFunctionPieces) {
      // Write end_point first (matches rust order)
      writer.writeUInt64BE(piece.endPoint.eventOutcome);
      writer.writeUInt64BE(piece.endPoint.outcomePayout);
      writer.writeUInt16BE(piece.endPoint.extraPrecision);

      // Write payout_curve_piece second
      writer.writeBytes(piece.payoutCurvePiece.serialize());
    }

    // Write last_endpoint
    writer.writeUInt64BE(this.lastEndpoint.eventOutcome);
    writer.writeUInt64BE(this.lastEndpoint.outcomePayout);
    writer.writeUInt16BE(this.lastEndpoint.extraPrecision);

    return writer.toBuffer();
  }
}

// Legacy support
export const PayoutFunctionV0 = PayoutFunction;
export type PayoutFunctionV0 = PayoutFunction;

interface IPayoutPoint {
  eventOutcome: bigint;
  outcomePayout: bigint;
  extraPrecision: number;
}

interface IPayoutPointJSON {
  eventOutcome: number;
  outcomePayout: number;
  extraPrecision: number;
}

interface IPayoutFunctionPiece {
  endPoint: IPayoutPoint;
  payoutCurvePiece: PayoutCurvePiece;
}

interface IPayoutFunctionPieceJSON {
  endPoint: IPayoutPointJSON;
  payoutCurvePiece:
    | PolynomialPayoutCurvePieceJSON
    | HyperbolaPayoutCurvePieceJSON;
}

export interface PayoutFunctionJSON {
  type?: number; // Optional for rust-dlc compatibility
  payoutFunctionPieces: IPayoutFunctionPieceJSON[];
  lastEndpoint: IPayoutPointJSON;
}

// Legacy interface
export type PayoutFunctionV0JSON = PayoutFunctionJSON;
