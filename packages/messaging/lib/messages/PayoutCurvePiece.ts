import { BufferReader, BufferWriter, F64 } from '@node-dlc/bufio';

import { MessageType, PayoutCurvePieceType } from '../MessageType';
import { bigIntToNumber, toBigInt } from '../util';
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
      eventOutcome: toBigInt(point.eventOutcome || point.event_outcome),
      outcomePayout: toBigInt(point.outcomePayout || point.outcome_payout),
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
      polynomialPayoutCurvePiece: {
        payoutPoints: this.points.map((point) => {
          return {
            eventOutcome: bigIntToNumber(point.eventOutcome),
            outcomePayout: bigIntToNumber(point.outcomePayout),
            extraPrecision: Number(point.extraPrecision),
          };
        }),
      },
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
 * Updated to use F64 for precise f64 parameter handling.
 */
export class HyperbolaPayoutCurvePiece
  extends PayoutCurvePiece
  implements IDlcMessage {
  public static payoutCurvePieceType = PayoutCurvePieceType.Hyperbola;

  /**
   * Helper function to safely parse F64 values from JSON
   * Handles both number and string inputs for maximum precision
   */
  private static parseF64Value(value: any): F64 | null {
    // Check for basic null/undefined
    if (value === null || value === undefined) {
      return null;
    }

    try {
      if (typeof value === 'string') {
        // Parse string directly to preserve precision
        try {
          return F64.fromString(value);
        } catch (error) {
          // If fromString fails, try parsing as number
          const numValue = parseFloat(value);
          if (!isNaN(numValue) && isFinite(numValue)) {
            return F64.fromNumber(numValue);
          }
        }
      } else if (typeof value === 'number') {
        // Parse number - handle special cases
        if (!isFinite(value)) {
          return null; // Reject NaN, Infinity, -Infinity
        }
        return F64.fromNumber(value);
      }

      // Try to convert other types to number as fallback
      const numValue = Number(value);
      if (!isNaN(numValue) && isFinite(numValue)) {
        return F64.fromNumber(numValue);
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Creates a HyperbolaPayoutCurvePiece from JSON data
   * @param json JSON object representing a hyperbola payout curve piece
   */
  public static fromJSON(json: any): HyperbolaPayoutCurvePiece | null {
    if (!json || typeof json !== 'object') return null;

    // Handle both wrapped format and direct format
    let data =
      json.hyperbolaPayoutCurvePiece || json.hyperbola_payout_curve_piece;

    // If no wrapper found, assume direct format if it has the expected properties
    if (
      !data &&
      (json.usePositivePiece !== undefined ||
        json.use_positive_piece !== undefined)
    ) {
      data = json;
    }

    if (!data) return null;

    try {
      const usePositivePiece =
        data.usePositivePiece || data.use_positive_piece || false;

      // Parse each F64 value with null check
      const translateOutcome = this.parseF64Value(
        data.translateOutcome !== undefined
          ? data.translateOutcome
          : data.translate_outcome,
      );
      const translatePayout = this.parseF64Value(
        data.translatePayout !== undefined
          ? data.translatePayout
          : data.translate_payout,
      );
      const a = this.parseF64Value(data.a);
      const b = this.parseF64Value(data.b);
      const c = this.parseF64Value(data.c);
      const d = this.parseF64Value(data.d);

      // Check that all required values were parsed successfully
      if (!translateOutcome || !translatePayout || !a || !b || !c || !d) {
        throw new Error('Failed to parse one or more F64 values');
      }

      return new HyperbolaPayoutCurvePiece(
        usePositivePiece,
        translateOutcome,
        translatePayout,
        a,
        b,
        c,
        d,
      );
    } catch (error) {
      return null;
    }
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

    // Read f64 values using F64 for precise handling - read raw 8-byte buffers
    instance.translateOutcome = F64.deserialize(reader.readBytes(8));
    instance.translatePayout = F64.deserialize(reader.readBytes(8));
    instance.a = F64.deserialize(reader.readBytes(8));
    instance.b = F64.deserialize(reader.readBytes(8));
    instance.c = F64.deserialize(reader.readBytes(8));
    instance.d = F64.deserialize(reader.readBytes(8));

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

  // Use F64 for precise f64 parameter handling to avoid JavaScript precision issues
  public leftEndPoint: IPayoutPoint;
  public rightEndPoint: IPayoutPoint;
  public usePositivePiece: boolean;
  public translateOutcome: F64; // f64 - precise handling with F64
  public translatePayout: F64; // f64 - precise handling with F64
  public a: F64; // f64 - precise handling with F64
  public b: F64; // f64 - precise handling with F64
  public c: F64; // f64 - precise handling with F64
  public d: F64; // f64 - precise handling with F64

  constructor(
    usePositivePiece = false,
    translateOutcome?: F64,
    translatePayout?: F64,
    a?: F64,
    b?: F64,
    c?: F64,
    d?: F64,
  ) {
    super();
    this.usePositivePiece = usePositivePiece;
    this.translateOutcome = translateOutcome || F64.fromNumber(0);
    this.translatePayout = translatePayout || F64.fromNumber(0);
    this.a = a || F64.fromNumber(0);
    this.b = b || F64.fromNumber(0);
    this.c = c || F64.fromNumber(0);
    this.d = d || F64.fromNumber(0);
  }

  /**
   * Converts hyperbola_payout_curve_piece to JSON
   * Uses F64.toJSONValue() which preserves precision by using strings for very large numbers
   */
  public toJSON(): HyperbolaPayoutCurvePieceJSON {
    return {
      hyperbolaPayoutCurvePiece: {
        usePositivePiece: this.usePositivePiece,
        translateOutcome: this.translateOutcome.toJSONValue(), // Smart conversion: number if safe, string if large
        translatePayout: this.translatePayout.toJSONValue(), // Preserves precision automatically
        a: this.a.toJSONValue(),
        b: this.b.toJSONValue(),
        c: this.c.toJSONValue(),
        d: this.d.toJSONValue(),
      },
    };
  }

  /**
   * Serializes the hyperbola_payout_curve_piece message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();

    writer.writeBigSize(this.payoutCurvePieceType);
    writer.writeUInt8(this.usePositivePiece ? 1 : 0);

    // Write f64 values using F64 for precise handling - write raw 8-byte buffers
    writer.writeBytes(this.translateOutcome.serialize());
    writer.writeBytes(this.translatePayout.serialize());
    writer.writeBytes(this.a.serialize());
    writer.writeBytes(this.b.serialize());
    writer.writeBytes(this.c.serialize());
    writer.writeBytes(this.d.serialize());

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

export interface PolynomialPayoutCurvePieceJSON {
  polynomialPayoutCurvePiece: {
    payoutPoints: IPointJSON[];
  };
}

export interface HyperbolaPayoutCurvePieceJSON {
  hyperbolaPayoutCurvePiece: {
    usePositivePiece: boolean;
    translateOutcome: number | string;
    translatePayout: number | string;
    a: number | string;
    b: number | string;
    c: number | string;
    d: number | string;
  };
}
