import { Script } from '@node-lightning/bitcoin';
import { BufferReader, BufferWriter } from '@node-lightning/bufio';
import { hash160 } from '@node-lightning/crypto';
import { BitcoinNetwork } from 'bitcoin-networks';
import { address } from 'bitcoinjs-lib';
import secp256k1 from 'secp256k1';

import { MessageType } from '../MessageType';
import {
  deserializeTlv,
  ITlv,
  serializeTlv,
} from '../serialize/deserializeTlv';
import { getTlv } from '../serialize/getTlv';
import {
  ContractInfo,
  IContractInfoV0JSON,
  IContractInfoV1JSON,
} from './ContractInfo';
import { IDlcMessage } from './DlcMessage';
import {
  FundingInput,
  FundingInputV0,
  IFundingInputV0JSON,
} from './FundingInput';

export const LOCKTIME_THRESHOLD = 500000000;

export abstract class DlcOffer {
  public static deserialize(buf: Buffer): DlcOfferOldV0 {
    const reader = new BufferReader(buf);

    const type = Number(reader.readUInt16BE());

    if (type === MessageType.DlcOfferV0) {
      try {
        return DlcOfferV0.deserialize(buf);
      } catch (e) {
        try {
          return DlcOfferOldV0.deserialize(buf);
        } catch (e) {
          throw new Error(
            `Error: ${e} Dlc Offer message could not be deserialized with new or old format`,
          );
        }
      }
    } else {
      throw new Error(`DLC Offer message type must be DlcOfferV0`); // This is a temporary measure while protocol is being developed
    }
  }

  public abstract type: number;

  public abstract getAddresses(network: BitcoinNetwork): IDlcOfferV0Addresses;

  public abstract validate(): void;

  // public abstract toJSON(): IDlcOfferV0JSON;

  public abstract serialize(): Buffer;
}

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
    instance.protocolVersion = reader.readUInt32BE();
    instance.contractFlags = reader.readBytes(1);
    instance.chainHash = reader.readBytes(32);
    instance.temporaryContractId = reader.readBytes(32);
    instance.contractInfo = ContractInfo.deserialize(getTlv(reader));
    instance.fundingPubKey = reader.readBytes(33);
    const payoutSPKLen = reader.readUInt16BE();
    instance.payoutSPK = reader.readBytes(payoutSPKLen);
    instance.payoutSerialId = reader.readUInt64BE();
    instance.offerCollateralSatoshis = reader.readUInt64BE();
    const fundingInputsLen = reader.readBigSize();

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

    while (!reader.eof) {
      const buf = getTlv(reader);
      const tlvReader = new BufferReader(buf);
      const { type, length, body } = deserializeTlv(tlvReader);

      instance.tlvs.push({ type, length, body });
    }

    return instance;
  }

  /**
   * The type for offer_dlc_v0 message. offer_dlc_v0 = 42778
   */
  public type = DlcOfferV0.type;

  public protocolVersion: number;

  public contractFlags: Buffer;

  public chainHash: Buffer;

  public temporaryContractId: Buffer;

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

  public tlvs: ITlv[];

  /**
   * Get funding, change and payout address from DlcOffer
   * @param network Bitcoin Network
   * @returns {IDlcOfferV0Addresses}
   */
  public getAddresses(network: BitcoinNetwork): IDlcOfferV0Addresses {
    const fundingSPK = Script.p2wpkhLock(hash160(this.fundingPubKey))
      .serialize()
      .slice(1);
    const fundingAddress = address.fromOutputScript(fundingSPK, network);
    const changeAddress = address.fromOutputScript(this.changeSPK, network);
    const payoutAddress = address.fromOutputScript(this.payoutSPK, network);

    return {
      fundingAddress,
      changeAddress,
      payoutAddress,
    };
  }

  /**
   * Validates correctness of all fields in DlcOffer
   * https://github.com/discreetlogcontracts/dlcspecs/blob/master/Protocol.md#the-offer_dlc-message
   * @throws Will throw an error if validation fails
   */
  public validate(): void {
    // 1. Type is set automatically in class
    // 2. contract_flags field is ignored
    // 3. chain_hash must be validated as input by end user
    // 4. payout_spk and change_spk must be standard script pubkeys

    try {
      address.fromOutputScript(this.payoutSPK);
    } catch (e) {
      throw new Error('DlcOffer payoutSPK is invalid');
    }

    try {
      address.fromOutputScript(this.changeSPK);
    } catch (e) {
      throw new Error('DlcOffer changeSPK is invalid');
    }

    // 5. funding_pubkey must be a valid secp256k1 pubkey in compressed format
    // https://github.com/bitcoin/bips/blob/master/bip-0137.mediawiki#background-on-ecdsa-signatures

    if (secp256k1.publicKeyVerify(Buffer.from(this.fundingPubKey))) {
      if (this.fundingPubKey[0] != 0x02 && this.fundingPubKey[0] != 0x03) {
        throw new Error('fundingPubKey must be in compressed format');
      }
    } else {
      throw new Error('fundingPubKey is not a valid secp256k1 key');
    }

    // 6. offer_collateral_satoshis must be greater than or equal to 1000
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

    // 7. cet_locktime and refund_locktime must either both be unix timestamps, or both be block heights.
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

    // 8. cetLocktime must be less than refundLocktime
    if (this.cetLocktime >= this.refundLocktime) {
      throw new Error('cetLocktime must be less than refundLocktime');
    }

    // 9. inputSerialId must be unique for each input

    const inputSerialIds = this.fundingInputs.map(
      (input: FundingInputV0) => input.inputSerialId,
    );

    if (new Set(inputSerialIds).size !== inputSerialIds.length) {
      throw new Error('inputSerialIds must be unique');
    }

    // 10. changeSerialId and fundOutputSerialID must be different

    if (this.changeSerialId === this.fundOutputSerialId) {
      throw new Error(
        'changeSerialId and fundOutputSerialId must be different',
      );
    }

    // validate contractInfo
    this.contractInfo.validate();

    // totalCollaterial should be > offerCollaterial (logical validation)
    if (this.contractInfo.totalCollateral <= this.offerCollateralSatoshis) {
      throw new Error('totalCollateral should be greater than offerCollateral');
    }

    // validate funding amount
    const fundingAmount = this.fundingInputs.reduce((acc, fundingInput) => {
      const input = fundingInput as FundingInputV0;
      return acc + input.prevTx.outputs[input.prevTxVout].value.sats;
    }, BigInt(0));
    if (this.offerCollateralSatoshis >= fundingAmount) {
      throw new Error(
        'fundingAmount must be greater than offerCollateralSatoshis',
      );
    }
  }

  /**
   * Converts dlc_offer_v0 to JSON
   */
  public toJSON(): IDlcOfferOldV0JSON {
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
   * Serializes the offer_dlc_v0 message into =a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeUInt16BE(this.type);
    writer.writeUInt32BE(this.protocolVersion);
    writer.writeBytes(this.contractFlags);
    writer.writeBytes(this.chainHash);
    writer.writeBytes(this.temporaryContractId);
    writer.writeBytes(this.contractInfo.serialize());
    writer.writeBytes(this.fundingPubKey);
    writer.writeUInt16BE(this.payoutSPK.length);
    writer.writeBytes(this.payoutSPK);
    writer.writeUInt64BE(this.payoutSerialId);
    writer.writeUInt64BE(this.offerCollateralSatoshis);
    writer.writeBigSize(this.fundingInputs.length);

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

    for (const tlv of this.tlvs) {
      serializeTlv(tlv, writer);
    }

    return writer.toBuffer();
  }
}

export abstract class DlcOfferOld {
  public static deserialize(buf: Buffer): DlcOfferOldV0 {
    const reader = new BufferReader(buf);

    const type = Number(reader.readUInt16BE());

    switch (type) {
      case MessageType.DlcOfferV0:
        return DlcOfferOldV0.deserialize(buf);
      default:
        throw new Error(`DLC Offer message type must be DlcOfferV0`); // This is a temporary measure while protocol is being developed
    }
  }

  public abstract type: number;

  public abstract getAddresses(network: BitcoinNetwork): IDlcOfferV0Addresses;

  public abstract validate(): void;

  // public abstract toJSON(): IDlcOfferV0JSON;

  public abstract serialize(): Buffer;
}

/**
 * DlcOffer message contains information about a node and indicates its
 * desire to enter into a new contract. This is the first step toward
 * creating the funding transaction and CETs.
 */
export class DlcOfferOldV0 extends DlcOffer implements IDlcMessage {
  public static type = MessageType.DlcOfferV0;

  /**
   * Deserializes an offer_dlc_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): DlcOfferOldV0 {
    const instance = new DlcOfferOldV0();
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
  public type = DlcOfferOldV0.type;

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
   * Get funding, change and payout address from DlcOffer
   * @param network Bitcoin Network
   * @returns {IDlcOfferV0Addresses}
   */
  public getAddresses(network: BitcoinNetwork): IDlcOfferV0Addresses {
    const fundingSPK = Script.p2wpkhLock(hash160(this.fundingPubKey))
      .serialize()
      .slice(1);
    const fundingAddress = address.fromOutputScript(fundingSPK, network);
    const changeAddress = address.fromOutputScript(this.changeSPK, network);
    const payoutAddress = address.fromOutputScript(this.payoutSPK, network);

    return {
      fundingAddress,
      changeAddress,
      payoutAddress,
    };
  }

  /**
   * Validates correctness of all fields in DlcOffer
   * https://github.com/discreetlogcontracts/dlcspecs/blob/master/Protocol.md#the-offer_dlc-message
   * @throws Will throw an error if validation fails
   */
  public validate(): void {
    // 1. Type is set automatically in class
    // 2. contract_flags field is ignored
    // 3. chain_hash must be validated as input by end user
    // 4. payout_spk and change_spk must be standard script pubkeys

    try {
      address.fromOutputScript(this.payoutSPK);
    } catch (e) {
      throw new Error('DlcOffer payoutSPK is invalid');
    }

    try {
      address.fromOutputScript(this.changeSPK);
    } catch (e) {
      throw new Error('DlcOffer changeSPK is invalid');
    }

    // 5. funding_pubkey must be a valid secp256k1 pubkey in compressed format
    // https://github.com/bitcoin/bips/blob/master/bip-0137.mediawiki#background-on-ecdsa-signatures

    if (secp256k1.publicKeyVerify(Buffer.from(this.fundingPubKey))) {
      if (this.fundingPubKey[0] != 0x02 && this.fundingPubKey[0] != 0x03) {
        throw new Error('fundingPubKey must be in compressed format');
      }
    } else {
      throw new Error('fundingPubKey is not a valid secp256k1 key');
    }

    // 6. offer_collateral_satoshis must be greater than or equal to 1000
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

    // 7. cet_locktime and refund_locktime must either both be unix timestamps, or both be block heights.
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

    // 8. cetLocktime must be less than refundLocktime
    if (this.cetLocktime >= this.refundLocktime) {
      throw new Error('cetLocktime must be less than refundLocktime');
    }

    // 9. inputSerialId must be unique for each input

    const inputSerialIds = this.fundingInputs.map(
      (input: FundingInputV0) => input.inputSerialId,
    );

    if (new Set(inputSerialIds).size !== inputSerialIds.length) {
      throw new Error('inputSerialIds must be unique');
    }

    // 10. changeSerialId and fundOutputSerialID must be different

    if (this.changeSerialId === this.fundOutputSerialId) {
      throw new Error(
        'changeSerialId and fundOutputSerialId must be different',
      );
    }

    // validate contractInfo
    this.contractInfo.validate();

    // totalCollaterial should be > offerCollaterial (logical validation)
    if (this.contractInfo.totalCollateral <= this.offerCollateralSatoshis) {
      throw new Error('totalCollateral should be greater than offerCollateral');
    }

    // validate funding amount
    const fundingAmount = this.fundingInputs.reduce((acc, fundingInput) => {
      const input = fundingInput as FundingInputV0;
      return acc + input.prevTx.outputs[input.prevTxVout].value.sats;
    }, BigInt(0));
    if (this.offerCollateralSatoshis >= fundingAmount) {
      throw new Error(
        'fundingAmount must be greater than offerCollateralSatoshis',
      );
    }
  }

  /**
   * Converts dlc_offer_v0 to JSON
   */
  public toJSON(): IDlcOfferOldV0JSON {
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

export interface IDlcOfferOldV0JSON {
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

export interface IDlcOfferV0Addresses {
  fundingAddress: string;
  changeAddress: string;
  payoutAddress: string;
}
