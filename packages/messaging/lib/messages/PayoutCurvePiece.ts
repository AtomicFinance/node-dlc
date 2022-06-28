import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';

export enum PayoutCurvePieceType {
  PolynomialPayoutCurvePiece = 0,
  HyperbolaPayoutCurvePiece = 1,
}

export abstract class PayoutCurvePiece {
  public static deserialize(
    reader: Buffer | BufferReader,
  ): PolynomialPayoutCurvePiece | HyperbolaPayoutCurvePiece {
    if (reader instanceof Buffer) reader = new BufferReader(reader);

    const tempReader = new BufferReader(reader.peakBytes());
    const type = Number(tempReader.readBigSize());

    console.log('reader.peakbytes', reader.peakBytes().toString('hex'));

    console.log('type', type);

    switch (type) {
      case PayoutCurvePieceType.PolynomialPayoutCurvePiece:
        return PolynomialPayoutCurvePiece.deserialize(reader);
      case PayoutCurvePieceType.HyperbolaPayoutCurvePiece:
        return HyperbolaPayoutCurvePiece.deserialize(reader);
      default:
        throw new Error(
          `Payout function TLV type must be PolynomialPayoutCurvePiece or HyperbolaPayoutCurvePiece`,
        );
    }
  }

  public abstract type: number;

  public abstract length: bigint;

  public abstract toJSON():
    | PolynomialPayoutCurvePieceJSON
    | HyperbolaPayoutCurvePieceJSON;

  public abstract serialize(): Buffer;
}

/**
 * PolynomialPayoutCurvePiece
 */
export class PolynomialPayoutCurvePiece
  extends PayoutCurvePiece
  implements IDlcMessage {
  public static type = PayoutCurvePieceType.PolynomialPayoutCurvePiece;

  /**
   * Deserializes an polynomial_payout_curve_piece message
   * @param buf
   */
  public static deserialize(
    reader: Buffer | BufferReader,
  ): PolynomialPayoutCurvePiece {
    if (reader instanceof Buffer) reader = new BufferReader(reader);

    const instance = new PolynomialPayoutCurvePiece();

    reader.readBigSize(); // read type
    console.log('19');
    const numPoints = reader.readBigSize(); // num_pts
    console.log('numPoints', numPoints);

    for (let i = 0; i < numPoints; i++) {
      const eventOutcome = reader.readUInt64BE();
      const outcomePayout = reader.readUInt64BE();
      const extraPrecision = reader.readUInt16BE();

      console.log('eventOutcome', eventOutcome);
      console.log('outcomePayout', outcomePayout);

      instance.points.push({
        eventOutcome,
        outcomePayout,
        extraPrecision,
      });
    }

    return instance;
  }

  /**
   * The type for polynomial_payout_curve_piece message. polynomial_payout_curve_piece = ???
   */
  public type = PolynomialPayoutCurvePiece.type;

  public length: bigint;

  public points: IPoint[] = [];

  public migrate(): PolynomialPayoutCurvePiece {
    return this;
  }

  /**
   * Converts polynomial_payout_curve_piece to JSON
   */
  public toJSON(): PolynomialPayoutCurvePieceJSON {
    return {
      payoutPoints: this.points.map((point) => {
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
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeBigSize(this.points.length);

    for (const point of this.points) {
      dataWriter.writeUInt64BE(point.eventOutcome);
      dataWriter.writeUInt64BE(point.outcomePayout);
      dataWriter.writeUInt16BE(point.extraPrecision);
    }

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

/**
 * HyperbolaPayoutCurvePiece
 */
export class HyperbolaPayoutCurvePiece
  extends PayoutCurvePiece
  implements IDlcMessage {
  public static type = PayoutCurvePieceType.HyperbolaPayoutCurvePiece;

  /**
   * Deserializes an hyperbola_payout_curve_piece message
   * @param buf
   */
  public static deserialize(
    reader: Buffer | BufferReader,
  ): HyperbolaPayoutCurvePiece {
    if (reader instanceof Buffer) reader = new BufferReader(reader);

    const instance = new HyperbolaPayoutCurvePiece();

    reader.readBigSize(); // read type
    console.log('18');
    instance.usePositivePiece = reader.readUInt8() === 1;
    console.log('21');
    instance.translateOutcomeSign = reader.readUInt8() === 1;
    instance.translateOutcome = reader.readUInt64BE();
    instance.translateOutcomeExtraPrecision = reader.readUInt16BE();
    console.log('22');
    instance.translatePayoutSign = reader.readUInt8() === 1;
    instance.translatePayout = reader.readUInt64BE();
    instance.translatePayoutExtraPrecision = reader.readUInt16BE();
    instance.aSign = reader.readUInt8() === 1;
    console.log('23');
    instance.a = reader.readUInt64BE();
    instance.aExtraPrecision = reader.readUInt16BE();
    instance.bSign = reader.readUInt8() === 1;
    console.log('24');
    instance.b = reader.readUInt64BE();
    instance.bExtraPrecision = reader.readUInt16BE();
    instance.cSign = reader.readUInt8() === 1;
    console.log('25');
    instance.c = reader.readUInt64BE();
    instance.cExtraPrecision = reader.readUInt16BE();
    instance.dSign = reader.readUInt8() === 1;
    instance.d = reader.readUInt64BE();
    instance.dExtraPrecision = reader.readUInt16BE();
    console.log('20');

    return instance;
  }

  /**
   * The type for hyperbola_payout_curve_piece message. hyperbola_payout_curve_piece = ???
   */
  public type = HyperbolaPayoutCurvePiece.type;

  public length: bigint;

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
      usePositivePiece: this.usePositivePiece,
      translateOutcome: this.calculatePoint(
        this.translateOutcomeSign,
        this.translateOutcome,
        this.translateOutcomeExtraPrecision,
      ),
      translatePayout: this.calculatePoint(
        this.translatePayoutSign,
        this.translatePayout,
        this.translatePayoutExtraPrecision,
      ),
      a: this.calculatePoint(this.aSign, this.a, this.aExtraPrecision),
      b: this.calculatePoint(this.bSign, this.b, this.bExtraPrecision),
      c: this.calculatePoint(this.cSign, this.c, this.cExtraPrecision),
      d: this.calculatePoint(this.dSign, this.d, this.dExtraPrecision),
    };
  }

  /**
   *
   * https://github.com/discreetlogcontracts/dlcspecs/blob/740045234f610ea30e52d5880312a949b0d5e21d/PayoutCurve.md#curve-serialization
   *
   * @param sign
   * @param value
   * @param precision
   * @returns
   */
  public calculatePoint(
    sign: boolean,
    value: bigint,
    precision: number,
  ): number {
    return (sign ? 1 : -1) * ((Number(value) + precision) >> 16);
  }

  /**
   * Serializes the hyperbola_payout_curve_piece message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();

    dataWriter.writeUInt8(this.usePositivePiece ? 1 : 0);
    dataWriter.writeUInt8(this.translateOutcomeSign ? 1 : 0);
    dataWriter.writeUInt64BE(this.translateOutcome);
    dataWriter.writeUInt16BE(this.translateOutcomeExtraPrecision);
    dataWriter.writeUInt8(this.translatePayoutSign ? 1 : 0);
    dataWriter.writeUInt64BE(this.translatePayout);
    dataWriter.writeUInt16BE(this.translatePayoutExtraPrecision);
    dataWriter.writeUInt8(this.aSign ? 1 : 0);
    dataWriter.writeUInt64BE(this.a);
    dataWriter.writeUInt16BE(this.aExtraPrecision);
    dataWriter.writeUInt8(this.bSign ? 1 : 0);
    dataWriter.writeUInt64BE(this.b);
    dataWriter.writeUInt16BE(this.bExtraPrecision);
    dataWriter.writeUInt8(this.cSign ? 1 : 0);
    dataWriter.writeUInt64BE(this.c);
    dataWriter.writeUInt16BE(this.cExtraPrecision);
    dataWriter.writeUInt8(this.dSign ? 1 : 0);
    dataWriter.writeUInt64BE(this.d);
    dataWriter.writeUInt16BE(this.dExtraPrecision);

    writer.writeBytes(dataWriter.toBuffer());

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
  payoutPoints: IPointJSON[];
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
