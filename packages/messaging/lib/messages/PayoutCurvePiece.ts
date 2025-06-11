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

  /**
   * Creates a PayoutCurvePiece from JSON data
   * @param json JSON object representing a payout curve piece
   */
  public static fromJSON(json: any): PayoutCurvePiece {
    if (!json) {
      throw new Error('payoutCurvePiece is required');
    }

    // Determine type by checking for specific fields
    if (json.points !== undefined) {
      return PolynomialPayoutCurvePiece.fromJSON(json);
    } else if (json.usePositivePiece !== undefined) {
      return HyperbolaPayoutCurvePiece.fromJSON(json);
    } else {
      throw new Error(
        'payoutCurvePiece must be either polynomial (with points) or hyperbola (with usePositivePiece)',
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
   * Creates a PolynomialPayoutCurvePiece from JSON data
   * @param json JSON object representing a polynomial payout curve piece
   */
  public static fromJSON(json: any): PolynomialPayoutCurvePiece {
    const instance = new PolynomialPayoutCurvePiece();

    const points = json.points || [];
    instance.points = points.map((point: any) => ({
      eventOutcome: BigInt(point.eventOutcome || point.event_outcome || 0),
      outcomePayout: BigInt(point.outcomePayout || point.outcome_payout || 0),
      extraPrecision: point.extraPrecision || point.extra_precision || 0,
    }));

    return instance;
  }

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
   * Creates a HyperbolaPayoutCurvePiece from JSON data
   * @param json JSON object representing a hyperbola payout curve piece
   */
  public static fromJSON(json: any): HyperbolaPayoutCurvePiece {
    const instance = new HyperbolaPayoutCurvePiece();

    instance.usePositivePiece =
      json.usePositivePiece || json.use_positive_piece || false;
    instance.translateOutcomeSign =
      json.translateOutcomeSign || json.translate_outcome_sign || false;
    instance.translateOutcome = BigInt(
      json.translateOutcome || json.translate_outcome || 0,
    );
    instance.translateOutcomeExtraPrecision =
      json.translateOutcomeExtraPrecision ||
      json.translate_outcome_extra_precision ||
      0;
    instance.translatePayoutSign =
      json.translatePayoutSign || json.translate_payout_sign || false;
    instance.translatePayout = BigInt(
      json.translatePayout || json.translate_payout || 0,
    );
    instance.translatePayoutExtraPrecision =
      json.translatePayoutExtraPrecision ||
      json.translate_payout_extra_precision ||
      0;
    instance.aSign = json.aSign || json.a_sign || false;
    instance.a = BigInt(json.a || 0);
    instance.aExtraPrecision =
      json.aExtraPrecision || json.a_extra_precision || 0;
    instance.bSign = json.bSign || json.b_sign || false;
    instance.b = BigInt(json.b || 0);
    instance.bExtraPrecision =
      json.bExtraPrecision || json.b_extra_precision || 0;
    instance.cSign = json.cSign || json.c_sign || false;
    instance.c = BigInt(json.c || 0);
    instance.cExtraPrecision =
      json.cExtraPrecision || json.c_extra_precision || 0;
    instance.dSign = json.dSign || json.d_sign || false;
    instance.d = BigInt(json.d || 0);
    instance.dExtraPrecision =
      json.dExtraPrecision || json.d_extra_precision || 0;

    return instance;
  }

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
