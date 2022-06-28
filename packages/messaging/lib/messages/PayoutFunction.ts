import { Value } from '@node-dlc/bitcoin';
import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';
import {
  HyperbolaPayoutCurvePieceJSON,
  PayoutCurvePiece,
  PolynomialPayoutCurvePieceJSON,
} from './PayoutCurvePiece';

/**
 * PayoutFunction V0
 */
export class PayoutFunction implements IDlcMessage {
  public static type = MessageType.PayoutFunctionV0;

  /**
   * Deserializes an payout_function_v0 message
   * @param buf
   */
  public static deserialize(reader: Buffer | BufferReader): PayoutFunction {
    if (reader instanceof Buffer) reader = new BufferReader(reader);
    const instance = new PayoutFunction();

    console.log('15');
    const numPieces = reader.readBigSize(); // num_pieces
    console.log('15-1');
    console.log('numPieces', numPieces);

    for (let i = 0; i < numPieces; i++) {
      console.log('15-2');
      const eventOutcome = reader.readUInt64BE();
      console.log('16');
      const outcomePayout = reader.readUInt64BE();
      const extraPrecision = reader.readUInt16BE();
      console.log('17');
      const payoutCurvePiece = PayoutCurvePiece.deserialize(reader);
      console.log('18');

      console.log('eventOutcome', eventOutcome);
      console.log('outcomePayout', outcomePayout);
      console.log('extraPrecision', extraPrecision);
      console.log('payoutCurvePiece', payoutCurvePiece);

      instance.pieces.push({
        payoutCurvePiece,
        endpoint: {
          eventOutcome,
          outcomePayout: Value.fromSats(outcomePayout),
          extraPrecision,
        },
      });
    }

    console.log('30');

    instance.lastEndpoint.eventOutcome = reader.readUInt64BE(); // endpoint0
    console.log('30-a');
    instance.lastEndpoint.outcomePayout = Value.fromSats(reader.readUInt64BE()); // endpointPayout0
    console.log('30-b');
    instance.lastEndpoint.extraPrecision = reader.readUInt16BE();

    console.log('31');

    return instance;
  }

  /**
   * The type for payout_function_v0 message. payout_function_v0 = 42790
   */
  public type = PayoutFunction.type;

  public pieces: IPayoutCurvePieces[] = [];
  public lastEndpoint: IEndpoint = {
    eventOutcome: 0n,
    outcomePayout: Value.fromSats(0n),
    extraPrecision: 0,
  };

  /**
   * Converts payout_function_v0 to JSON
   */
  public toJSON(): PayoutFunctionJSON {
    return {
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
      lastEndpoint: {
        eventOutcome: Number(this.lastEndpoint.eventOutcome),
        outcomePayout: Number(this.lastEndpoint.outcomePayout.sats),
        extraPrecision: this.lastEndpoint.extraPrecision,
      },
    };
  }

  /**
   * Serializes the payout_function_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();

    const dataWriter = new BufferWriter();
    dataWriter.writeBigSize(this.pieces.length);

    for (const piece of this.pieces) {
      dataWriter.writeUInt64BE(piece.endpoint.eventOutcome);
      dataWriter.writeUInt64BE(piece.endpoint.outcomePayout.sats);
      dataWriter.writeUInt16BE(piece.endpoint.extraPrecision);
      dataWriter.writeBytes(piece.payoutCurvePiece.serialize());
    }

    dataWriter.writeUInt64BE(this.lastEndpoint.eventOutcome);
    dataWriter.writeUInt64BE(this.lastEndpoint.outcomePayout.sats);
    dataWriter.writeUInt16BE(this.lastEndpoint.extraPrecision);

    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

interface IEndpoint {
  eventOutcome: bigint;
  outcomePayout: Value;
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
  endpoint: IEndpointJSON;
  payoutCurvePiece:
    | PolynomialPayoutCurvePieceJSON
    | HyperbolaPayoutCurvePieceJSON;
}

export interface PayoutFunctionJSON {
  payoutFunctionPieces: IPayoutCurvePiecesJSON[];
  lastEndpoint: IEndpointJSON;
}
