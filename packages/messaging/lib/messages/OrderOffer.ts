import { BufferReader, BufferWriter } from '@node-lightning/bufio';
import { MessageType } from '../MessageType';
import { getTlv } from '../serialize/getTlv';
import { ContractInfo } from './ContractInfo';
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

  public abstract serialize(): Buffer;
}

/**
 * OrderOffer message contains information about a node and indicates its
 * desire to enter into a new contract. This is the first step toward
 * order negotiation.
 */
export class OrderOfferV0 implements IDlcMessage {
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

  /**
   * Converts order_offer_v0 to JSON
   */
  public toJson(): IOrderOfferJSON {
    return {
      chainHash: this.chainHash.toString('hex'),
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

interface IOrderOfferJSON {
  chainHash: string;
  offerCollateralSatoshis: number;
  feeRatePerVb: number;
  cetLocktime: number;
  refundLocktime: number;
}
