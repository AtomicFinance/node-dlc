import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType, PayoutCurvePieceType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';

export abstract class PayoutCurvePiece {
  public static deserialize(
    buf: Buffer,
  ): PolynomialPayoutCurvePiece | HyperbolaPayoutCurvePiece {
    const reader = new BufferReader(buf);
    const typeId = Number(reader.readBigSize());

    switch (typeId) {
      case PayoutCurvePieceType.Polynomial:
        return PolynomialPayoutCurvePiece.deserialize(buf);
      case PayoutCurvePieceType.Hyperbola:
        return HyperbolaPayoutCurvePiece.deserialize(buf);
      default:
        throw new Error(
          `Payout curve piece type must be Polynomial (0) or Hyperbola (1), got ${typeId}`,
        );
    }
  }

  public abstract payoutCurvePieceType: PayoutCurvePieceType;
  public abstract type: number; // For backward compatibility
  public abstract toJSON():
    | PolynomialPayoutCurvePieceJSON
    | HyperbolaPayoutCurvePieceJSON;
  public abstract serialize(): Buffer;
}

/**
 * PolynomialPayoutCurvePiece defines a polynomial curve piece for payout functions.
 * This corresponds to type 0 in the sibling sub-type format.
 */
export class PolynomialPayoutCurvePiece
  extends PayoutCurvePiece
  implements IDlcMessage {
  public static payoutCurvePieceType = PayoutCurvePieceType.Polynomial;

  /**
   * Deserializes a polynomial_payout_curve_piece message
   * @param buf
   */
  public static deserialize(buf: Buffer): PolynomialPayoutCurvePiece {
    const instance = new PolynomialPayoutCurvePiece();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type (0)
    const numPts = Number(reader.readBigSize());

    for (let i = 0; i < numPts; i++) {
      const eventOutcome = reader.readUInt64BE();
      const outcomePayout = reader.readUInt64BE();
      const extraPrecision = reader.readUInt16BE();

      instance.points.push({
        eventOutcome,
        outcomePayout,
        extraPrecision,
      });
    }

    return instance;
  }

  /**
   * The type for polynomial_payout_curve_piece message - using MessageType for IDlcMessage compatibility
   */
  public type = MessageType.PolynomialPayoutCurvePiece; // For IDlcMessage compatibility

  /**
   * The payout curve piece type for new format
   */
  public payoutCurvePieceType = PayoutCurvePieceType.Polynomial;

  public points: IPoint[] = [];

  /**
   * Converts polynomial_payout_curve_piece to JSON
   */
  public toJSON(): PolynomialPayoutCurvePieceJSON {
    return {
      type: this.type,
      payoutCurvePieceType: this.payoutCurvePieceType,
      points: this.points.map((point) => {
        return {
          eventOutcome: Number(point.eventOutcome),
          outcomePayout: Number(point.outcomePayout),
          extraPrecision: Number(point.extraPrecision),
        };
      }),
    };
  }

  /**
   * Serializes the polynomial_payout_curve_piece message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();

    writer.writeBigSize(this.payoutCurvePieceType);
    writer.writeBigSize(this.points.length);

    for (const point of this.points) {
      writer.writeUInt64BE(point.eventOutcome);
      writer.writeUInt64BE(point.outcomePayout);
      writer.writeUInt16BE(point.extraPrecision);
    }

    return writer.toBuffer();
  }
}

/**
 * HyperbolaPayoutCurvePiece defines a hyperbola curve piece for payout functions.
 * This corresponds to type 1 in the sibling sub-type format.
 */
export class HyperbolaPayoutCurvePiece
  extends PayoutCurvePiece
  implements IDlcMessage {
  public static payoutCurvePieceType = PayoutCurvePieceType.Hyperbola;

  /**
   * Deserializes a hyperbola_payout_curve_piece message
   * @param buf
   */
  public static deserialize(buf: Buffer): HyperbolaPayoutCurvePiece {
    const instance = new HyperbolaPayoutCurvePiece();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type (1)
    instance.usePositivePiece = reader.readUInt8() === 1;
    instance.translateOutcomeSign = reader.readUInt8() === 1;
    instance.translateOutcome = reader.readUInt64BE();
    instance.translateOutcomeExtraPrecision = reader.readUInt16BE();
    instance.translatePayoutSign = reader.readUInt8() === 1;
    instance.translatePayout = reader.readUInt64BE();
    instance.translatePayoutExtraPrecision = reader.readUInt16BE();
    instance.aSign = reader.readUInt8() === 1;
    instance.a = reader.readUInt64BE();
    instance.aExtraPrecision = reader.readUInt16BE();
    instance.bSign = reader.readUInt8() === 1;
    instance.b = reader.readUInt64BE();
    instance.bExtraPrecision = reader.readUInt16BE();
    instance.cSign = reader.readUInt8() === 1;
    instance.c = reader.readUInt64BE();
    instance.cExtraPrecision = reader.readUInt16BE();
    instance.dSign = reader.readUInt8() === 1;
    instance.d = reader.readUInt64BE();
    instance.dExtraPrecision = reader.readUInt16BE();

    return instance;
  }

  /**
   * The type for hyperbola_payout_curve_piece message - using MessageType for IDlcMessage compatibility
   */
  public type = MessageType.HyperbolaPayoutCurvePiece; // For IDlcMessage compatibility

  /**
   * The payout curve piece type for new format
   */
  public payoutCurvePieceType = PayoutCurvePieceType.Hyperbola;

  public usePositivePiece: boolean;

  public translateOutcomeSign: boolean;
  public translateOutcome: bigint;
  public translateOutcomeExtraPrecision: number;

  public translatePayoutSign: boolean;
  public translatePayout: bigint;
  public translatePayoutExtraPrecision: number;

  public aSign: boolean;
  public a: bigint;
  public aExtraPrecision: number;

  public bSign: boolean;
  public b: bigint;
  public bExtraPrecision: number;

  public cSign: boolean;
  public c: bigint;
  public cExtraPrecision: number;

  public dSign: boolean;
  public d: bigint;
  public dExtraPrecision: number;

  /**
   * Converts hyperbola_payout_curve_piece to JSON
   */
  public toJSON(): HyperbolaPayoutCurvePieceJSON {
    return {
      type: this.type,
      payoutCurvePieceType: this.payoutCurvePieceType,
      usePositivePiece: this.usePositivePiece,
      translateOutcomeSign: this.translateOutcomeSign,
      translateOutcome: Number(this.translateOutcome),
      translateOutcomeExtraPrecision: this.translateOutcomeExtraPrecision,
      translatePayoutSign: this.translatePayoutSign,
      translatePayout: Number(this.translatePayout),
      translatePayoutExtraPrecision: this.translatePayoutExtraPrecision,
      aSign: this.aSign,
      a: Number(this.a),
      aExtraPrecision: this.aExtraPrecision,
      bSign: this.bSign,
      b: Number(this.b),
      bExtraPrecision: this.bExtraPrecision,
      cSign: this.cSign,
      c: Number(this.c),
      cExtraPrecision: this.cExtraPrecision,
      dSign: this.dSign,
      d: Number(this.d),
      dExtraPrecision: this.dExtraPrecision,
    };
  }

  /**
   * Serializes the hyperbola_payout_curve_piece message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();

    writer.writeBigSize(this.payoutCurvePieceType);
    writer.writeUInt8(this.usePositivePiece ? 1 : 0);
    writer.writeUInt8(this.translateOutcomeSign ? 1 : 0);
    writer.writeUInt64BE(this.translateOutcome);
    writer.writeUInt16BE(this.translateOutcomeExtraPrecision);
    writer.writeUInt8(this.translatePayoutSign ? 1 : 0);
    writer.writeUInt64BE(this.translatePayout);
    writer.writeUInt16BE(this.translatePayoutExtraPrecision);
    writer.writeUInt8(this.aSign ? 1 : 0);
    writer.writeUInt64BE(this.a);
    writer.writeUInt16BE(this.aExtraPrecision);
    writer.writeUInt8(this.bSign ? 1 : 0);
    writer.writeUInt64BE(this.b);
    writer.writeUInt16BE(this.bExtraPrecision);
    writer.writeUInt8(this.cSign ? 1 : 0);
    writer.writeUInt64BE(this.c);
    writer.writeUInt16BE(this.cExtraPrecision);
    writer.writeUInt8(this.dSign ? 1 : 0);
    writer.writeUInt64BE(this.d);
    writer.writeUInt16BE(this.dExtraPrecision);

    return writer.toBuffer();
  }
}

interface IPoint {
  eventOutcome: bigint;
  outcomePayout: bigint;
  extraPrecision: number;
}

interface IPointJSON {
  eventOutcome: number;
  outcomePayout: number;
  extraPrecision: number;
}

export interface PolynomialPayoutCurvePieceJSON {
  type: number;
  payoutCurvePieceType: PayoutCurvePieceType;
  points: IPointJSON[];
}

export interface HyperbolaPayoutCurvePieceJSON {
  type: number;
  payoutCurvePieceType: PayoutCurvePieceType;
  usePositivePiece: boolean;
  translateOutcomeSign: boolean;
  translateOutcome: number;
  translateOutcomeExtraPrecision: number;
  translatePayoutSign: boolean;
  translatePayout: number;
  translatePayoutExtraPrecision: number;
  aSign: boolean;
  a: number;
  aExtraPrecision: number;
  bSign: boolean;
  b: number;
  bExtraPrecision: number;
  cSign: boolean;
  c: number;
  cExtraPrecision: number;
  dSign: boolean;
  d: number;
  dExtraPrecision: number;
}
