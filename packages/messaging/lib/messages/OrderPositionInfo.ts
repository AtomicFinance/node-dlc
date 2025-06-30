import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';

export type DlcParty = 'offeror' | 'acceptor' | 'neither';

/**
 * OrderPositionInfo message
 */
export class OrderPositionInfo implements IDlcMessage {
  public static type = MessageType.OrderPositionInfo;

  /**
   * Deserializes an OrderPositionInfo message
   * @param buf
   */
  public static deserialize(buf: Buffer): OrderPositionInfo {
    const instance = new OrderPositionInfo();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();

    const encodedShiftForFees = reader.readUInt8();
    if (encodedShiftForFees === 0) {
      instance.shiftForFees = 'neither';
    } else if (encodedShiftForFees === 1) {
      instance.shiftForFees = 'offeror';
    } else if (encodedShiftForFees === 2) {
      instance.shiftForFees = 'acceptor';
    } else {
      throw new Error(`Invalid shift for fees value: ${encodedShiftForFees}`);
    }

    instance.fees = reader.readUInt64BE();

    if (!reader.eof) {
      const instrumentNameLength = reader.readBigSize();
      const instrumentName = reader.readBytes(Number(instrumentNameLength));
      instance.instrumentName = instrumentName.toString();

      instance.contractSize = reader.readUInt64BE();

      const direction = reader.readUInt8();
      if (direction === 0) {
        instance.direction = 'neither';
      } else if (direction === 1) {
        instance.direction = 'buy';
      } else if (direction === 2) {
        instance.direction = 'sell';
      } else {
        throw new Error(`Invalid direction value: ${direction}`);
      }

      instance.price = reader.readUInt64BE();

      instance.extraPrecision = reader.readUInt16BE();
    }

    return instance;
  }

  /**
   * The type for OrderPositionInfo message
   */
  public type = OrderPositionInfo.type;

  public length: bigint;

  public shiftForFees: DlcParty = 'neither';

  public fees = BigInt(0);

  public instrumentName: string | undefined = undefined;

  public contractSize = BigInt(0);

  public direction: 'buy' | 'sell' | 'neither' = 'neither';

  public price = BigInt(0); // Can be BTC or USD depending on the instrument

  public extraPrecision = 0;

  /**
   * Converts OrderPositionInfo to JSON
   */
  public toJSON(): IOrderPositionInfoJSON {
    return {
      type: this.type,
      shiftForFees: this.shiftForFees,
      fees: Number(this.fees),
      instrumentName: this.instrumentName,
      direction: this.direction,
      price: Number(this.price),
      extraPrecision: this.extraPrecision,
    };
  }

  /**
   * Serializes the OrderPositionInfo message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeUInt8(
      this.shiftForFees === 'neither'
        ? 0
        : this.shiftForFees === 'offeror'
        ? 1
        : 2,
    );
    dataWriter.writeUInt64BE(this.fees);

    if (this.instrumentName) {
      dataWriter.writeBigSize(this.instrumentName.length);
      dataWriter.writeBytes(Buffer.from(this.instrumentName));

      dataWriter.writeUInt64BE(this.contractSize);

      dataWriter.writeUInt8(
        this.direction === 'neither' ? 0 : this.direction === 'buy' ? 1 : 2,
      );

      dataWriter.writeUInt64BE(this.price);

      dataWriter.writeUInt16BE(this.extraPrecision);
    }

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

export interface IOrderPositionInfoJSON {
  type: number;
  shiftForFees: string;
  fees: number;
  instrumentName: string;
  direction: string;
  price: number;
  extraPrecision: number;
}
