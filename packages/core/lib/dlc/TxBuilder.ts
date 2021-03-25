import {
  DlcAcceptWithoutSigs,
  FundingInputV0,
  DlcOfferV0,
  MessageType,
} from '@node-dlc/messaging';
import {
  Tx,
  TxBuilder,
  LockTime,
  OutPoint,
  Script,
  Value,
} from '@node-dlc/bitcoin';
import { StreamReader } from '@node-lightning/bufio';
import { DualFundingTxFinalizer } from './TxFinalizer';

export class DlcTxBuilder {
  constructor(
    readonly dlcOffer: DlcOfferV0,
    readonly dlcAccept: DlcAcceptWithoutSigs,
  ) {}

  public buildFundingTransaction(): Tx {
    const tx = new TxBuilder();
    tx.version = 2;
    tx.locktime = LockTime.zero();

    const multisigScript = Script.p2msLock(
      2,
      this.dlcOffer.fundingPubKey,
      this.dlcAccept.fundingPubKey,
    );
    const witScript = Script.p2wshLock(multisigScript);

    const offerInput = this.dlcOffer.offerCollateralSatoshis;
    const acceptInput = this.dlcAccept.acceptCollateralSatoshis;

    const totalInput = offerInput + acceptInput;

    const finalizer = new DualFundingTxFinalizer(
      this.dlcOffer.fundingInputs,
      this.dlcOffer.payoutSPK,
      this.dlcOffer.changeSPK,
      this.dlcAccept.fundingInputs,
      this.dlcAccept.payoutSPK,
      this.dlcAccept.changeSPK,
      this.dlcOffer.feeRatePerVb,
    );

    this.dlcOffer.fundingInputs.forEach((input) => {
      if (input.type !== MessageType.FundingInputV0)
        throw Error('FundingInput must be V0');
    });
    const offerFundingInputs: FundingInputV0[] = this.dlcOffer.fundingInputs.map(
      (input) => input as FundingInputV0,
    );

    const offerTotalFunding = offerFundingInputs.reduce((total, input) => {
      return total + input.prevTx.outputs[input.prevTxVout].value.sats;
    }, BigInt(0));

    const acceptTotalFunding = this.dlcAccept.fundingInputs.reduce(
      (total, input) => {
        return total + input.prevTx.outputs[input.prevTxVout].value.sats;
      },
      BigInt(0),
    );

    const fundingInputs: FundingInputV0[] = [
      ...offerFundingInputs,
      ...this.dlcAccept.fundingInputs,
    ];

    fundingInputs.forEach((input) => {
      tx.addInput(
        OutPoint.fromString(
          `${input.prevTx.txId.toString()}:${input.prevTxVout}`,
        ),
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
      Script.parse(StreamReader.fromBuffer(this.dlcOffer.changeSPK)),
    );
    tx.addOutput(
      Value.fromSats(Number(acceptChangeValue)),
      Script.parse(StreamReader.fromBuffer(this.dlcAccept.changeSPK)),
    );

    return tx.toTx();
  }
}
