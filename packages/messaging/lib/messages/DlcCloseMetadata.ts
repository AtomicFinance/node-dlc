import { Tx } from '@node-dlc/bitcoin';
import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { DlcAccept, DlcOffer, DlcTransactionsV0 } from '..';
import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';

/**
 * DlcClose Metadata object contains information required for verifying DlcClose
 * message.
 */
export class DlcCloseMetadata {
  /**
   * Convert JSON to DlcCloseMetadata
   * @param json
   */
  public static fromJSON(json: IDlcCloseMetadataJSON): DlcCloseMetadata {
    const instance = new DlcCloseMetadata();

    instance.offerFundingPubKey = Buffer.from(json.offerFundingPubKey, 'hex');
    instance.acceptFundingPubKey = Buffer.from(json.acceptFundingPubKey, 'hex');
    instance.offerPayoutSPK = Buffer.from(json.offerPayoutSPK, 'hex');
    instance.acceptPayoutSPK = Buffer.from(json.acceptPayoutSPK, 'hex');
    instance.offerPayoutSerialId = BigInt(json.offerPayoutSerialId);
    instance.acceptPayoutSerialId = BigInt(json.acceptPayoutSerialId);
    instance.feeRatePerVb = BigInt(json.feeRatePerVb);
    instance.fundTx = Tx.fromHex(json.fundTx);
    instance.fundTxVout = json.fundTxVout;

    return instance;
  }

  public static fromDlcMessages(
    dlcOffer: DlcOffer,
    dlcAccept: DlcAccept,
    dlcTxs: DlcTransactionsV0,
  ): DlcCloseMetadata {
    const instance = new DlcCloseMetadata();

    instance.offerFundingPubKey = dlcOffer.fundingPubkey;
    instance.acceptFundingPubKey = dlcAccept.fundingPubkey;
    instance.offerPayoutSPK = dlcOffer.payoutSpk;
    instance.acceptPayoutSPK = dlcAccept.payoutSpk;
    instance.offerPayoutSerialId = dlcOffer.payoutSerialId;
    instance.acceptPayoutSerialId = dlcAccept.payoutSerialId;
    instance.feeRatePerVb = dlcOffer.feeRatePerVb;
    instance.fundTx = dlcTxs.fundTx;
    instance.fundTxVout = dlcTxs.fundTxVout;

    return instance;
  }

  public offerFundingPubKey: Buffer;

  public acceptFundingPubKey: Buffer;

  public offerPayoutSPK: Buffer;

  public acceptPayoutSPK: Buffer;

  public offerPayoutSerialId: bigint;

  public acceptPayoutSerialId: bigint;

  public feeRatePerVb: bigint;

  public fundTx: Tx;

  public fundTxVout: number;

  /**
   * Converts dlc_close_metadata to JSON
   */
  public toJSON(): IDlcCloseMetadataJSON {
    return {
      offerFundingPubKey: this.offerFundingPubKey.toString('hex'),
      acceptFundingPubKey: this.acceptFundingPubKey.toString('hex'),
      offerPayoutSPK: this.offerPayoutSPK.toString('hex'),
      acceptPayoutSPK: this.acceptPayoutSPK.toString('hex'),
      offerPayoutSerialId: Number(this.offerPayoutSerialId),
      acceptPayoutSerialId: Number(this.acceptPayoutSerialId),
      feeRatePerVb: Number(this.feeRatePerVb),
      fundTx: this.fundTx.serialize().toString('hex'),
      fundTxVout: this.fundTxVout,
    };
  }

  public toDlcMessages(): {
    dlcOffer: DlcOffer;
    dlcAccept: DlcAccept;
    dlcTxs: DlcTransactionsV0;
  } {
    const dlcOffer = new DlcOffer();
    const dlcAccept = new DlcAccept();
    const dlcTxs = new DlcTransactionsV0();

    dlcOffer.fundingPubkey = this.offerFundingPubKey;
    dlcAccept.fundingPubkey = this.acceptFundingPubKey;
    dlcOffer.payoutSpk = this.offerPayoutSPK;
    dlcAccept.payoutSpk = this.acceptPayoutSPK;
    dlcOffer.payoutSerialId = this.offerPayoutSerialId;
    dlcAccept.payoutSerialId = this.acceptPayoutSerialId;
    dlcOffer.feeRatePerVb = this.feeRatePerVb;
    dlcTxs.fundTx = this.fundTx;
    dlcTxs.fundTxVout = this.fundTxVout;

    return { dlcOffer, dlcAccept, dlcTxs };
  }
}

export interface IDlcCloseMetadataJSON {
  offerFundingPubKey: string;
  acceptFundingPubKey: string;
  offerPayoutSPK: string;
  acceptPayoutSPK: string;
  offerPayoutSerialId: number;
  acceptPayoutSerialId: number;
  feeRatePerVb: number;
  fundTx: string;
  fundTxVout: number;
}
