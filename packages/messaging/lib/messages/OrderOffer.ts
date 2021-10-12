import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { IOrderMetadataJSON } from '..';
import { MessageType } from '../MessageType';
import { deserializeTlv } from '../serialize/deserializeTlv';
import { getTlv } from '../serialize/getTlv';
import {
  validateBigInt,
  validateBuffer,
  validateNumber,
} from '../validation/validate';
import {
  ContractInfo,
  IContractInfoV0JSON,
  IContractInfoV1JSON,
} from './ContractInfo';
import { IDlcMessage } from './DlcMessage';
import { OrderMetadata, OrderMetadataV0 } from './OrderMetadata';

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

    while (!reader.eof) {
      const buf = getTlv(reader);
      const tlvReader = new BufferReader(buf);
      const { type } = deserializeTlv(tlvReader);

      switch (Number(type)) {
        case MessageType.OrderMetadataV0:
          instance.metadata = OrderMetadataV0.deserialize(buf);
      }
    }

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

  public metadata: OrderMetadata;

  public validate(): void {
    validateBuffer(this.chainHash, 'chainHash', OrderOfferV0.name, 32);
    this.contractInfo.validate();
    validateBigInt(
      this.offerCollateralSatoshis,
      'offerCollateralSatoshis',
      OrderOfferV0.name,
    );
    validateBigInt(this.feeRatePerVb, 'feeRatePerVb', OrderOfferV0.name);
    validateNumber(this.cetLocktime, 'cetLocktime', OrderOfferV0.name);
    validateNumber(this.refundLocktime, 'refundLocktime', OrderOfferV0.name);
  }

  /**
   * Converts order_offer_v0 to JSON
   */
  public toJSON(): IOrderOfferJSON {
    return {
      type: this.type,
      chainHash: this.chainHash.toString('hex'),
      contractInfo: this.contractInfo.toJSON(),
      offerCollateralSatoshis: Number(this.offerCollateralSatoshis),
      feeRatePerVb: Number(this.feeRatePerVb),
      cetLocktime: this.cetLocktime,
      refundLocktime: this.refundLocktime,
      tlvs: this.metadata ? [this.metadata.toJSON()] : [],
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

    if (this.metadata) {
      writer.writeBytes(this.metadata.serialize());
    }

    return writer.toBuffer();
  }
}

export interface IOrderOfferJSON {
  type: number;
  chainHash: string;
  contractInfo: IContractInfoV0JSON | IContractInfoV1JSON;
  offerCollateralSatoshis: number;
  feeRatePerVb: number;
  cetLocktime: number;
  refundLocktime: number;
  tlvs: IOrderMetadataJSON[];
}
