import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { MessageType } from '../../MessageType';
import { deserializeTlv } from '../../serialize/deserializeTlv';
import { getTlv } from '../../serialize/getTlv';
import {
  validateBigInt,
  validateBuffer,
  validateNumber,
} from '../../validation/validate';
import {
  ContractInfo,
  IContractInfoV0JSON,
  IContractInfoV1JSON,
} from './ContractInfo';
import { IDlcMessage } from './DlcMessage';
import {
  IOrderIrcInfoJSON,
  OrderIrcInfo,
  OrderIrcInfoV0,
} from './OrderIrcInfo';
import { IOrderMetadataJSON } from './OrderMetadata';
import { OrderMetadata, OrderMetadataV0 } from './OrderMetadata';

const LOCKTIME_THRESHOLD = 500000000;
export abstract class OrderOffer {
  public static deserialize(buf: Buffer): OrderOffer {
    const reader = new BufferReader(buf);

    const type = Number(reader.readUInt16BE());

    switch (type) {
      case MessageType.OrderOfferV0:
        return OrderOfferV0Pre163.deserialize(buf);
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
export class OrderOfferV0Pre163 extends OrderOffer implements IDlcMessage {
  public static type = MessageType.OrderOfferV0;

  /**
   * Deserializes an offer_dlc_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): OrderOfferV0Pre163 {
    const instance = new OrderOfferV0Pre163();
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
          break;
        case MessageType.OrderIrcInfoV0:
          instance.ircInfo = OrderIrcInfoV0.deserialize(buf);
          break;
        default:
          break;
      }
    }

    return instance;
  }

  /**
   * The type for order_offer_v0 message. order_offer_v0 = 62770
   */
  public type = OrderOfferV0Pre163.type;

  public chainHash: Buffer;

  public contractInfo: ContractInfo;

  public offerCollateralSatoshis: bigint;

  public feeRatePerVb: bigint;

  public cetLocktime: number;

  public refundLocktime: number;

  public metadata?: OrderMetadata;

  public ircInfo?: OrderIrcInfo;

  public validate(): void {
    validateBuffer(this.chainHash, 'chainHash', OrderOfferV0Pre163.name, 32);
    this.contractInfo.validate();
    validateBigInt(
      this.offerCollateralSatoshis,
      'offerCollateralSatoshis',
      OrderOfferV0Pre163.name,
    );
    validateBigInt(this.feeRatePerVb, 'feeRatePerVb', OrderOfferV0Pre163.name);
    validateNumber(this.cetLocktime, 'cetLocktime', OrderOfferV0Pre163.name);
    validateNumber(
      this.refundLocktime,
      'refundLocktime',
      OrderOfferV0Pre163.name,
    );

    // 1. Type is set automatically in class
    // 2. chain_hash must be validated as input by end user

    // 3. offer_collateral_satoshis must be greater than or equal to 1000
    if (this.offerCollateralSatoshis < 1000) {
      throw new Error(
        'offer_collateral_satoshis must be greater than or equal to 1000',
      );
    }

    if (this.cetLocktime < 0) {
      throw new Error('cet_locktime must be greater than or equal to 0');
    }

    if (this.refundLocktime < 0) {
      throw new Error('refund_locktime must be greater than or equal to 0');
    }

    // 4. cet_locktime and refund_locktime must either both be unix timestamps, or both be block heights.
    // https://en.bitcoin.it/wiki/NLockTime
    // https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki#detailed-specification
    // https://github.com/bitcoin/bitcoin/blob/master/src/script/script.h#L39
    if (
      !(
        (this.cetLocktime < LOCKTIME_THRESHOLD &&
          this.refundLocktime < LOCKTIME_THRESHOLD) ||
        (this.cetLocktime >= LOCKTIME_THRESHOLD &&
          this.refundLocktime >= LOCKTIME_THRESHOLD)
      )
    ) {
      throw new Error('cetLocktime and refundLocktime must be in same units');
    }

    // 5. cetLocktime must be less than refundLocktime
    if (this.cetLocktime >= this.refundLocktime) {
      throw new Error('cetLocktime must be less than refundLocktime');
    }

    // 6. validate contractInfo
    this.contractInfo.validate();

    // totalCollaterial should be > offerCollaterial (logical validation)
    if (this.contractInfo.totalCollateral <= this.offerCollateralSatoshis) {
      throw new Error('totalCollateral should be greater than offerCollateral');
    }
  }

  /**
   * Converts order_offer_v0 to JSON
   */
  public toJSON(): IOrderOfferJSON {
    const tlvs = [];

    if (this.metadata) tlvs.push(this.metadata.toJSON());
    if (this.ircInfo) tlvs.push(this.ircInfo.toJSON());

    return {
      type: this.type,
      chainHash: this.chainHash.toString('hex'),
      contractInfo: this.contractInfo.toJSON(),
      offerCollateralSatoshis: Number(this.offerCollateralSatoshis),
      feeRatePerVb: Number(this.feeRatePerVb),
      cetLocktime: this.cetLocktime,
      refundLocktime: this.refundLocktime,
      tlvs,
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

    if (this.metadata) writer.writeBytes(this.metadata.serialize());
    if (this.ircInfo) writer.writeBytes(this.ircInfo.serialize());

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
  tlvs: (IOrderMetadataJSON | IOrderIrcInfoJSON)[];
}
