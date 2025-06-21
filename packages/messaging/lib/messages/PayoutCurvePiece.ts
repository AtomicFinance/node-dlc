import { BufferReader, BufferWriter, F64 } from '@node-dlc/bufio';

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

    // Helper function to safely convert to BigInt from various input types
    const toBigInt = (value: any): bigint => {
      if (value === null || value === undefined) return BigInt(0);
      if (typeof value === 'bigint') return value;
      if (typeof value === 'string') return BigInt(value);
      if (typeof value === 'number') return BigInt(value);
      return BigInt(0);
    };

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
    // Helper function to safely convert BigInt to number, preserving precision
    const bigIntToNumber = (value: bigint): number => {
      // For values within safe integer range, convert to number
      if (
        value <= BigInt(Number.MAX_SAFE_INTEGER) &&
        value >= BigInt(Number.MIN_SAFE_INTEGER)
      ) {
        return Number(value);
      }
      // For larger values, we need to preserve as BigInt (json-bigint will handle serialization)
      return value as any;
    };

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

    // Helper function to safely convert to F64 from various input types
    const toF64 = (value: any): F64 => {
      if (value === null || value === undefined) return F64.zero();
      if (value instanceof F64) return value;
      if (typeof value === 'number') return F64.fromNumber(value);
      if (typeof value === 'string') return F64.fromString(value);
      if (typeof value === 'bigint') return F64.fromBigInt(value);
      return F64.zero();
    };

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

    // Store as F64 for arbitrary precision
    instance.translateOutcome = toF64(
      json.translateOutcome || json.translate_outcome || 0,
    );
    instance.translatePayout = toF64(
      json.translatePayout || json.translate_payout || 0,
    );
    instance.a = toF64(json.a || 0);
    instance.b = toF64(json.b || 0);
    instance.c = toF64(json.c || 0);
    instance.d = toF64(json.d || 0);

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

    // Read f64 values from wire directly as F64 instances
    instance.translateOutcome = reader.readF64BE();
    instance.translatePayout = reader.readF64BE();
    instance.a = reader.readF64BE();
    instance.b = reader.readF64BE();
    instance.c = reader.readF64BE();
    instance.d = reader.readF64BE();

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

  // Store as F64 for arbitrary precision, serialize as f64 for rust-dlc compatibility
  public leftEndPoint: IPayoutPoint;
  public rightEndPoint: IPayoutPoint;
  public usePositivePiece: boolean;
  public translateOutcome: F64; // F64 precision, serialized as f64
  public translatePayout: F64; // F64 precision, serialized as f64
  public a: F64; // F64 precision, serialized as f64
  public b: F64; // F64 precision, serialized as f64
  public c: F64; // F64 precision, serialized as f64
  public d: F64; // F64 precision, serialized as f64

  /**
   * Converts hyperbola_payout_curve_piece to JSON
   */
  public toJSON(): HyperbolaPayoutCurvePieceJSON {
    return {
      hyperbolaPayoutCurvePiece: {
        usePositivePiece: this.usePositivePiece,
        translateOutcome: this.translateOutcome.toNumber(),
        translatePayout: this.translatePayout.toNumber(),
        a: this.a.toNumber(),
        b: this.b.toNumber(),
        c: this.c.toNumber(),
        d: this.d.toNumber(),
      },
    };
  }

  /**
   * Serializes the hyperbola_payout_curve_piece message into a Buffer
   * Uses f64 serialization to match rust-dlc implementation
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();

    // Validate values are within safe f64 range for rust-dlc compatibility
    this._validateF64Precision();

    writer.writeBigSize(this.payoutCurvePieceType);
    writer.writeUInt8(this.usePositivePiece ? 1 : 0);

    // Use F64 serialization for f64 wire format to match rust-dlc
    writer.writeF64BE(this.translateOutcome);
    writer.writeF64BE(this.translatePayout);
    writer.writeF64BE(this.a);
    writer.writeF64BE(this.b);
    writer.writeF64BE(this.c);
    writer.writeF64BE(this.d);

    return writer.toBuffer();
  }

  /**
   * Validates that all F64 values are within safe f64 precision limits
   * to prevent precision loss during rust-dlc compatibility serialization
   */
  private _validateF64Precision(): void {
    const MAX_SAFE = F64.fromNumber(Number.MAX_SAFE_INTEGER); // 2^53 - 1
    const MIN_SAFE = F64.fromNumber(Number.MIN_SAFE_INTEGER); // -(2^53 - 1)

    const values = [
      { name: 'translateOutcome', value: this.translateOutcome },
      { name: 'translatePayout', value: this.translatePayout },
      { name: 'a', value: this.a },
      { name: 'b', value: this.b },
      { name: 'c', value: this.c },
      { name: 'd', value: this.d },
    ];

    for (const { name, value } of values) {
      if (value.gt(MAX_SAFE) || value.lt(MIN_SAFE)) {
        throw new Error(
          `HyperbolaPayoutCurvePiece.${name} value ${value.toString()} exceeds f64 precision limits (±${MAX_SAFE.toString()}) for rust-dlc compatibility`,
        );
      }
    }
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
    translateOutcome: number;
    translatePayout: number;
    a: number;
    b: number;
    c: number;
    d: number;
  };
}
