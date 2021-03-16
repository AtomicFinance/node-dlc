import {
  AcceptDlcWithoutSigs,
  FundingInputV0,
  MessageType,
  OfferDlcV0,
} from '@node-dlc/messaging';
import {
  HashValue,
  LockTime,
  OutPoint,
  Script,
  Sequence,
  TxIn,
  TxOut,
  Value,
} from '@node-lightning/bitcoin';
import { StreamReader } from '@node-lightning/bufio';
import { Tx } from '../Tx';
import { TxBuilder } from '../TxBuilder';
import { DualFundingTxFinalizer } from './TxFinalizer';

export class DlcTxBuilder {
  constructor(
    readonly offerDlc: OfferDlcV0,
    readonly acceptDlc: AcceptDlcWithoutSigs,
  ) {}

  public buildFundingTransaction(): Tx {
    const tx = new TxBuilder();
    tx.version = 2;
    tx.locktime = LockTime.zero();

    const multisigScript = Script.p2msLock(
      2,
      this.offerDlc.fundingPubKey,
      this.acceptDlc.fundingPubKey,
    );
    const witScript = Script.p2wshLock(multisigScript);

    const offerInput = this.offerDlc.offerCollateralSatoshis;
    const acceptInput = this.acceptDlc.acceptCollateralSatoshis;

    const totalInput = offerInput + acceptInput;

    const finalizer = new DualFundingTxFinalizer(
      this.offerDlc.fundingInputs,
      this.offerDlc.payoutSPK,
      this.offerDlc.changeSPK,
      this.acceptDlc.fundingInputs,
      this.acceptDlc.payoutSPK,
      this.acceptDlc.changeSPK,
      this.offerDlc.feeRate,
    );

    const offerTotalFunding = this.offerDlc.fundingInputs.reduce(
      (total, input) => {
        const prevTx = Tx.parse(StreamReader.fromBuffer(input.prevTx));
        return total + prevTx.outputs[input.prevTxVout].value.sats;
      },
      BigInt(0),
    );

    const acceptTotalFunding = this.acceptDlc.fundingInputs.reduce(
      (total, input) => {
        const prevTx = Tx.parse(StreamReader.fromBuffer(input.prevTx));
        return total + prevTx.outputs[input.prevTxVout].value.sats;
      },
      BigInt(0),
    );

    const fundingInputs: FundingInputV0[] = [
      ...this.offerDlc.fundingInputs,
      ...this.acceptDlc.fundingInputs,
    ];

    fundingInputs.forEach((input) => {
      const prevTx = Tx.parse(StreamReader.fromBuffer(input.prevTx));
      tx.addInput(
        OutPoint.fromString(`${prevTx.txId.toString()}:${input.prevTxVout}`),
      );
    });

    const fundingValue =
      totalInput + finalizer.offerFutureFee + finalizer.acceptFutureFee;
    const offerChangeValue =
      offerTotalFunding - offerInput - finalizer.offerFees;
    const acceptChangeValue =
      acceptTotalFunding - acceptInput - finalizer.acceptFees;

    tx.addOutput(Value.fromSats(Number(fundingValue)), witScript);
    tx.addOutput(
      Value.fromSats(Number(offerChangeValue)),
      Script.parse(StreamReader.fromBuffer(this.offerDlc.changeSPK)),
    );
    tx.addOutput(
      Value.fromSats(Number(acceptChangeValue)),
      Script.parse(StreamReader.fromBuffer(this.acceptDlc.changeSPK)),
    );

    return tx.toTx();
  }
}
