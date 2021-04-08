import { BufferReader, BufferWriter } from '@node-lightning/bufio';
import { MessageType } from '../MessageType';
import { getTlv } from '../serialize/getTlv';
import {
  ContractInfo,
  IContractInfoV0JSON,
  IContractInfoV1JSON,
} from './ContractInfo';
import { IDlcMessage } from './DlcMessage';

export abstract class OrderOffer {
  public static deserialize(buf: Buffer): OrderOffer {
    const reader = new BufferReader(buf);

    const type = Number(reader.readUInt16BE());

    switch (type) {
      case MessageType.OrderOfferV0:
        return OrderOfferV0.deserialize(buf);
      default:
        throw new Error(`Order offer TLV type must be OrderOfferV0`);
    }
  }

  public abstract type: number;

  public abstract validate(): void;

  public abstract toJSON(): IOrderOfferJSON;

  public abstract serialize(): Buffer;
}

/**
 * OrderOffer message contains information about a node and indicates its
 * desire to enter into a new contract. This is the first step toward
 * order negotiation.
 */
export class OrderOfferV0 extends OrderOffer implements IDlcMessage {
  public static type = MessageType.OrderOfferV0;

  /**
   * Deserializes an offer_dlc_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): OrderOfferV0 {
    const instance = new OrderOfferV0();
    const reader = new BufferReader(buf);

    reader.readUInt16BE(); // read type
    instance.chainHash = reader.readBytes(32);
    instance.contractInfo = ContractInfo.deserialize(getTlv(reader));
    instance.offerCollateralSatoshis = reader.readUInt64BE();
    instance.feeRatePerVb = reader.readUInt64BE();
    instance.cetLocktime = reader.readUInt32BE();
    instance.refundLocktime = reader.readUInt32BE();

    return instance;
  }

  /**
   * The type for order_offer_v0 message. order_offer_v0 = 62770
   */
  public type = OrderOfferV0.type;

  public chainHash: Buffer;

  public contractInfo: ContractInfo;

  public offerCollateralSatoshis: bigint;

  public feeRatePerVb: bigint;

  public cetLocktime: number;

  public refundLocktime: number;

  public validate(): void {
    if (!this.chainHash || this.chainHash.length !== 32) throw Error('test');
    this.contractInfo.validate();
    if (
      !this.offerCollateralSatoshis ||
      this.offerCollateralSatoshis === BigInt(0)
    )
      throw Error('test');
    if (!this.feeRatePerVb || this.feeRatePerVb === BigInt(0))
      throw Error('test');
    if (!this.cetLocktime || this.cetLocktime === 0) throw Error('test');
    if (!this.refundLocktime || this.refundLocktime === 0) throw Error('test');
  }

  /**
   * Converts order_offer_v0 to JSON
   */
  public toJSON(): IOrderOfferJSON {
    return {
      chainHash: this.chainHash.toString('hex'),
      contractInfo: this.contractInfo.toJSON(),
      offerCollateralSatoshis: Number(this.offerCollateralSatoshis),
      feeRatePerVb: Number(this.feeRatePerVb),
      cetLocktime: this.cetLocktime,
      refundLocktime: this.refundLocktime,
    };
  }

  /**
   * Serializes the order_offer_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeUInt16BE(this.type);
    writer.writeBytes(this.chainHash);
    writer.writeBytes(this.contractInfo.serialize());
    writer.writeUInt64BE(this.offerCollateralSatoshis);
    writer.writeUInt64BE(this.feeRatePerVb);
    writer.writeUInt32BE(this.cetLocktime);
    writer.writeUInt32BE(this.refundLocktime);

    return writer.toBuffer();
  }
}

export interface IOrderOfferJSON {
  chainHash: string;
  contractInfo: IContractInfoV0JSON | IContractInfoV1JSON;
  offerCollateralSatoshis: number;
  feeRatePerVb: number;
  cetLocktime: number;
  refundLocktime: number;
}
