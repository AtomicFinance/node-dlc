import { BufferReader, BufferWriter } from '@node-lightning/bufio';
import { MessageType } from '../MessageType';
import { getTlv } from '../serialize/getTlv';
import {
  ContractInfo,
  IContractInfoV0JSON,
  IContractInfoV1JSON,
} from './ContractInfo';
import { IDlcMessage } from './DlcMessage';
import { FundingInput, IFundingInputV0JSON } from './FundingInput';

export abstract class DlcOffer {
  public static deserialize(buf: Buffer): DlcOfferV0 {
    const reader = new BufferReader(buf);

    const type = Number(reader.readUInt16BE());

    switch (type) {
      case MessageType.DlcOfferV0:
        return DlcOfferV0.deserialize(buf);
      default:
        throw new Error(`DLC Offer message type must be DlcOfferV0`);
    }
  }

  public abstract type: number;

  public abstract toJSON(): IDlcOfferV0JSON;

  public abstract serialize(): Buffer;
}

/**
 * DlcOffer message contains information about a node and indicates its
 * desire to enter into a new contract. This is the first step toward
 * creating the funding transaction and CETs.
 */
export class DlcOfferV0 extends DlcOffer implements IDlcMessage {
  public static type = MessageType.DlcOfferV0;

  /**
   * Deserializes an offer_dlc_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): DlcOfferV0 {
    const instance = new DlcOfferV0();
    const reader = new BufferReader(buf);

    reader.readUInt16BE(); // read type
    instance.contractFlags = reader.readBytes(1);
    instance.chainHash = reader.readBytes(32);
    instance.contractInfo = ContractInfo.deserialize(getTlv(reader));
    instance.fundingPubKey = reader.readBytes(33);
    const payoutSPKLen = reader.readUInt16BE();
    instance.payoutSPK = reader.readBytes(payoutSPKLen);
    instance.payoutSerialId = reader.readUInt64BE();
    instance.offerCollateralSatoshis = reader.readUInt64BE();
    const fundingInputsLen = reader.readUInt16BE();

    for (let i = 0; i < fundingInputsLen; i++) {
      instance.fundingInputs.push(FundingInput.deserialize(getTlv(reader)));
    }

    const changeSPKLen = reader.readUInt16BE();
    instance.changeSPK = reader.readBytes(changeSPKLen);
    instance.changeSerialId = reader.readUInt64BE();
    instance.fundOutputSerialId = reader.readUInt64BE();
    instance.feeRatePerVb = reader.readUInt64BE();
    instance.cetLocktime = reader.readUInt32BE();
    instance.refundLocktime = reader.readUInt32BE();

    return instance;
  }

  /**
   * The type for offer_dlc_v0 message. offer_dlc_v0 = 42778
   */
  public type = DlcOfferV0.type;

  public contractFlags: Buffer;

  public chainHash: Buffer;

  public contractInfo: ContractInfo;

  public fundingPubKey: Buffer;

  public payoutSPK: Buffer;

  public payoutSerialId: bigint;

  public offerCollateralSatoshis: bigint;

  public fundingInputs: FundingInput[] = [];

  public changeSPK: Buffer;

  public changeSerialId: bigint;

  public fundOutputSerialId: bigint;

  public feeRatePerVb: bigint;

  public cetLocktime: number;

  public refundLocktime: number;

  /**
   * Converts dlc_offer_v0 to JSON
   */
  public toJSON(): IDlcOfferV0JSON {
    return {
      type: this.type,
      contractFlags: this.contractFlags.toString('hex'),
      chainHash: this.chainHash.toString('hex'),
      contractInfo: this.contractInfo.toJSON(),
      fundingPubKey: this.fundingPubKey.toString('hex'),
      payoutSPK: this.payoutSPK.toString('hex'),
      payoutSerialId: Number(this.payoutSerialId),
      offerCollateralSatoshis: Number(this.offerCollateralSatoshis),
      fundingInputs: this.fundingInputs.map((input) => input.toJSON()),
      changeSPK: this.changeSPK.toString('hex'),
      changeSerialId: Number(this.changeSerialId),
      fundOutputSerialId: Number(this.fundOutputSerialId),
      feeRatePerVb: Number(this.feeRatePerVb),
      cetLocktime: this.cetLocktime,
      refundLocktime: this.refundLocktime,
    };
  }

  /**
   * Serializes the offer_dlc_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeUInt16BE(this.type);
    writer.writeBytes(this.contractFlags);
    writer.writeBytes(this.chainHash);
    writer.writeBytes(this.contractInfo.serialize());
    writer.writeBytes(this.fundingPubKey);
    writer.writeUInt16BE(this.payoutSPK.length);
    writer.writeBytes(this.payoutSPK);
    writer.writeUInt64BE(this.payoutSerialId);
    writer.writeUInt64BE(this.offerCollateralSatoshis);
    writer.writeUInt16BE(this.fundingInputs.length);

    for (const fundingInput of this.fundingInputs) {
      writer.writeBytes(fundingInput.serialize());
    }

    writer.writeUInt16BE(this.changeSPK.length);
    writer.writeBytes(this.changeSPK);
    writer.writeUInt64BE(this.changeSerialId);
    writer.writeUInt64BE(this.fundOutputSerialId);
    writer.writeUInt64BE(this.feeRatePerVb);
    writer.writeUInt32BE(this.cetLocktime);
    writer.writeUInt32BE(this.refundLocktime);

    return writer.toBuffer();
  }
}

export interface IDlcOfferV0JSON {
  type: number;
  contractFlags: string;
  chainHash: string;
  contractInfo: IContractInfoV0JSON | IContractInfoV1JSON;
  fundingPubKey: string;
  payoutSPK: string;
  payoutSerialId: number;
  offerCollateralSatoshis: number;
  fundingInputs: IFundingInputV0JSON[];
  changeSPK: string;
  changeSerialId: number;
  fundOutputSerialId: number;
  feeRatePerVb: number;
  cetLocktime: number;
  refundLocktime: number;
}
