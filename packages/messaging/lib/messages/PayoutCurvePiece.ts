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

    // Handle test vector format with nested types
    if (json.polynomialPayoutCurvePiece) {
      return PolynomialPayoutCurvePiece.fromJSON(
        json.polynomialPayoutCurvePiece,
      );
    } else if (json.hyperbolaPayoutCurvePiece) {
      return HyperbolaPayoutCurvePiece.fromJSON(json.hyperbolaPayoutCurvePiece);
    }
    // Handle direct format
    else if (json.points !== undefined || json.payoutPoints !== undefined) {
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

    const points = json.payoutPoints || json.points || [];
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
 * Updated to match latest DLC specs with u64 parameters.
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

    // These will be set by PayoutFunction when creating from test data
    instance.leftEndPoint = {
      eventOutcome: BigInt(0),
      outcomePayout: BigInt(0),
      extraPrecision: 0,
    };

    instance.rightEndPoint = {
      eventOutcome: BigInt(0),
      outcomePayout: BigInt(0),
      extraPrecision: 0,
    };

    instance.usePositivePiece =
      json.usePositivePiece || json.use_positive_piece || false;

    // Helper function to parse signed f64 values for sign+magnitude+precision encoding
    const parseSignedF64 = (value: any) => {
      const numValue = Number(value || 0);
      const isNegative = numValue < 0;
      const absValue = Math.abs(numValue);
      const magnitude = BigInt(Math.floor(absValue));
      // Convert fractional part to 16-bit precision (like PayoutPoint)
      const fractionalPart = absValue - Math.floor(absValue);
      const extraPrecision = Math.round(fractionalPart * (1 << 16));
      return {
        sign: isNegative,
        magnitude,
        extraPrecision,
      };
    };

    // Parse values using sign+magnitude+precision representation
    const translateOutcomeData = parseSignedF64(
      json.translateOutcome || json.translate_outcome,
    );
    instance.translateOutcomeSign = translateOutcomeData.sign;
    instance.translateOutcome = translateOutcomeData.magnitude;
    instance.translateOutcomeExtraPrecision =
      translateOutcomeData.extraPrecision;

    const translatePayoutData = parseSignedF64(
      json.translatePayout || json.translate_payout,
    );
    instance.translatePayoutSign = translatePayoutData.sign;
    instance.translatePayout = translatePayoutData.magnitude;
    instance.translatePayoutExtraPrecision = translatePayoutData.extraPrecision;

    const aData = parseSignedF64(json.a);
    instance.aSign = aData.sign;
    instance.a = aData.magnitude;
    instance.aExtraPrecision = aData.extraPrecision;

    const bData = parseSignedF64(json.b);
    instance.bSign = bData.sign;
    instance.b = bData.magnitude;
    instance.bExtraPrecision = bData.extraPrecision;

    const cData = parseSignedF64(json.c);
    instance.cSign = cData.sign;
    instance.c = cData.magnitude;
    instance.cExtraPrecision = cData.extraPrecision;

    const dData = parseSignedF64(json.d);
    instance.dSign = dData.sign;
    instance.d = dData.magnitude;
    instance.dExtraPrecision = dData.extraPrecision;

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

    // Read sign+magnitude+precision encoding for each f64 parameter
    // Each parameter: 1 byte sign + 8 bytes magnitude + 2 bytes precision = 11 bytes
    instance.translateOutcomeSign = reader.readUInt8() === 0; // 0 = negative
    instance.translateOutcome = reader.readUInt64BE();
    instance.translateOutcomeExtraPrecision = reader.readUInt16BE();

    instance.translatePayoutSign = reader.readUInt8() === 0; // 0 = negative
    instance.translatePayout = reader.readUInt64BE();
    instance.translatePayoutExtraPrecision = reader.readUInt16BE();

    instance.aSign = reader.readUInt8() === 0; // 0 = negative
    instance.a = reader.readUInt64BE();
    instance.aExtraPrecision = reader.readUInt16BE();

    instance.bSign = reader.readUInt8() === 0; // 0 = negative
    instance.b = reader.readUInt64BE();
    instance.bExtraPrecision = reader.readUInt16BE();

    instance.cSign = reader.readUInt8() === 0; // 0 = negative
    instance.c = reader.readUInt64BE();
    instance.cExtraPrecision = reader.readUInt16BE();

    instance.dSign = reader.readUInt8() === 0; // 0 = negative
    instance.d = reader.readUInt64BE();
    instance.dExtraPrecision = reader.readUInt16BE();

    // Note: leftEndPoint and rightEndPoint are not part of the serialization
    // They will be set by PayoutFunction when creating from JSON
    instance.leftEndPoint = {
      eventOutcome: BigInt(0),
      outcomePayout: BigInt(0),
      extraPrecision: 0,
    };

    instance.rightEndPoint = {
      eventOutcome: BigInt(0),
      outcomePayout: BigInt(0),
      extraPrecision: 0,
    };

    return instance;
  }

  /**
   * The type for hyperbola_payout_curve_piece message
   */
  public type = MessageType.HyperbolaPayoutCurvePiece;

  public payoutCurvePieceType = HyperbolaPayoutCurvePiece.payoutCurvePieceType;

  // Updated DLC specs format: sign+magnitude+precision encoding for f64 parameters
  public leftEndPoint: IPayoutPoint;
  public rightEndPoint: IPayoutPoint;
  public usePositivePiece: boolean;
  public translateOutcome: bigint; // magnitude
  public translateOutcomeSign: boolean; // sign flag
  public translateOutcomeExtraPrecision: number; // extra precision
  public translatePayout: bigint; // magnitude
  public translatePayoutSign: boolean; // sign flag
  public translatePayoutExtraPrecision: number; // extra precision
  public a: bigint; // magnitude
  public aSign: boolean; // sign flag
  public aExtraPrecision: number; // extra precision
  public b: bigint; // magnitude
  public bSign: boolean; // sign flag
  public bExtraPrecision: number; // extra precision
  public c: bigint; // magnitude
  public cSign: boolean; // sign flag
  public cExtraPrecision: number; // extra precision
  public d: bigint; // magnitude
  public dSign: boolean; // sign flag
  public dExtraPrecision: number; // extra precision

  /**
   * Converts hyperbola_payout_curve_piece to JSON
   */
  public toJSON(): HyperbolaPayoutCurvePieceJSON {
    // Helper function to reconstruct f64 from sign+magnitude+precision
    const reconstructF64 = (
      sign: boolean,
      magnitude: bigint,
      extraPrecision: number,
    ) => {
      const value = Number(magnitude) + extraPrecision / (1 << 16);
      return sign ? -value : value;
    };

    return {
      type: this.type,
      usePositivePiece: this.usePositivePiece,
      translateOutcome: reconstructF64(
        this.translateOutcomeSign,
        this.translateOutcome,
        this.translateOutcomeExtraPrecision,
      ),
      translatePayout: reconstructF64(
        this.translatePayoutSign,
        this.translatePayout,
        this.translatePayoutExtraPrecision,
      ),
      a: reconstructF64(this.aSign, this.a, this.aExtraPrecision),
      b: reconstructF64(this.bSign, this.b, this.bExtraPrecision),
      c: reconstructF64(this.cSign, this.c, this.cExtraPrecision),
      d: reconstructF64(this.dSign, this.d, this.dExtraPrecision),
    };
  }

  /**
   * Serializes the hyperbola_payout_curve_piece message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();

    writer.writeBigSize(this.payoutCurvePieceType);
    writer.writeUInt8(this.usePositivePiece ? 1 : 0);

    // Write sign+magnitude+precision encoding for each f64 parameter
    // Each parameter: 1 byte sign (00=negative, 01=positive) + 8 bytes magnitude + 2 bytes precision = 11 bytes
    writer.writeUInt8(this.translateOutcomeSign ? 0 : 1);
    writer.writeUInt64BE(this.translateOutcome);
    writer.writeUInt16BE(this.translateOutcomeExtraPrecision);

    writer.writeUInt8(this.translatePayoutSign ? 0 : 1);
    writer.writeUInt64BE(this.translatePayout);
    writer.writeUInt16BE(this.translatePayoutExtraPrecision);

    writer.writeUInt8(this.aSign ? 0 : 1);
    writer.writeUInt64BE(this.a);
    writer.writeUInt16BE(this.aExtraPrecision);

    writer.writeUInt8(this.bSign ? 0 : 1);
    writer.writeUInt64BE(this.b);
    writer.writeUInt16BE(this.bExtraPrecision);

    writer.writeUInt8(this.cSign ? 0 : 1);
    writer.writeUInt64BE(this.c);
    writer.writeUInt16BE(this.cExtraPrecision);

    writer.writeUInt8(this.dSign ? 0 : 1);
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

export interface PolynomialPayoutCurvePieceJSON {
  type: number;
  payoutCurvePieceType: PayoutCurvePieceType;
  points: IPointJSON[];
}

export interface HyperbolaPayoutCurvePieceJSON {
  type: number;
  usePositivePiece: boolean;
  translateOutcome: number;
  translatePayout: number;
  a: number;
  b: number;
  c: number;
  d: number;
}
