import {
  LockTime,
  OutPoint,
  Script,
  Tx,
  TxBuilder,
  Value,
} from '@node-dlc/bitcoin';
import {
  DlcAcceptWithoutSigs,
  DlcOffer,
  FundingInput,
  MessageType,
} from '@node-dlc/messaging';
import Decimal from 'decimal.js';

import { DualFundingTxFinalizer } from './TxFinalizer';

export class DlcTxBuilder {
  constructor(
    readonly dlcOffer: DlcOffer,
    readonly dlcAccept: DlcAcceptWithoutSigs,
  ) {}

  public buildFundingTransaction(): Tx {
    const txBuilder = new BatchDlcTxBuilder([this.dlcOffer], [this.dlcAccept]);
    return txBuilder.buildFundingTransaction();
  }
}

export class BatchDlcTxBuilder {
  constructor(
    readonly dlcOffers: DlcOffer[],
    readonly dlcAccepts: DlcAcceptWithoutSigs[],
  ) {}

  public buildFundingTransaction(): Tx {
    const tx = new TxBuilder();
    tx.version = 2;
    tx.locktime = LockTime.zero();

    if (this.dlcOffers.length !== this.dlcAccepts.length)
      throw Error('DlcOffers and DlcAccepts must be the same length');
    if (this.dlcOffers.length === 0) throw Error('DlcOffers must not be empty');
    if (this.dlcAccepts.length === 0)
      throw Error('DlcAccepts must not be empty');

    // Ensure all DLC offers and accepts have the same funding inputs
    this.ensureSameFundingInputs();

    const multisigScripts: Script[] = [];
    for (let i = 0; i < this.dlcOffers.length; i++) {
      const offer = this.dlcOffers[i];
      const accept = this.dlcAccepts[i];

      multisigScripts.push(
        Buffer.compare(offer.fundingPubkey, accept.fundingPubkey) === -1
          ? Script.p2msLock(2, offer.fundingPubkey, accept.fundingPubkey)
          : Script.p2msLock(2, accept.fundingPubkey, offer.fundingPubkey),
      );
    }

    const witScripts = multisigScripts.map((multisigScript) =>
      Script.p2wshLock(multisigScript),
    );

    const finalizer = new DualFundingTxFinalizer(
      this.dlcOffers[0].fundingInputs,
      this.dlcOffers[0].payoutSpk,
      this.dlcOffers[0].changeSpk,
      this.dlcAccepts[0].fundingInputs,
      this.dlcAccepts[0].payoutSpk,
      this.dlcAccepts[0].changeSpk,
      this.dlcOffers[0].feeRatePerVb,
      this.dlcOffers.length,
    );

    this.dlcOffers[0].fundingInputs.forEach((input) => {
      if (input.type !== MessageType.FundingInput)
        throw new Error('Input is not a funding input');
    });
    const offerFundingInputs: FundingInput[] = this.dlcOffers[0].fundingInputs.map(
      (input) => input as FundingInput,
    );

    const offerTotalFunding = offerFundingInputs.reduce((total, input) => {
      return total + input.prevTx.outputs[input.prevTxVout].value.sats;
    }, BigInt(0));

    const acceptTotalFunding = this.dlcAccepts[0].fundingInputs.reduce(
      (total, input) => {
        return total + input.prevTx.outputs[input.prevTxVout].value.sats;
      },
      BigInt(0),
    );

    const fundingInputs: FundingInput[] = [
      ...offerFundingInputs,
      ...this.dlcAccepts[0].fundingInputs,
    ];

    fundingInputs.sort(
      (a, b) => Number(a.inputSerialId) - Number(b.inputSerialId),
    );

    fundingInputs.forEach((input) => {
      tx.addInput(
        OutPoint.fromString(
          `${input.prevTx.txId.toString()}:${input.prevTxVout}`,
        ),
      );
    });

    const offerInput = this.dlcOffers.reduce(
      (total, offer) => total + offer.offerCollateral,
      BigInt(0),
    );
    const acceptInput = this.dlcAccepts.reduce(
      (total, accept) => total + accept.acceptCollateral,
      BigInt(0),
    );

    const totalInputs = this.dlcOffers.map((offer, i) => {
      const offerInput = offer.offerCollateral;
      const acceptInput = this.dlcAccepts[i].acceptCollateral;
      return offerInput + acceptInput;
    });

    const fundingValues = totalInputs.map((totalInput) => {
      const offerFutureFeePerOffer = new Decimal(
        finalizer.offerFutureFee.toString(),
      )
        .div(this.dlcOffers.length)
        .ceil()
        .toNumber();
      const acceptFutureFeePerAccept = new Decimal(
        finalizer.acceptFutureFee.toString(),
      )
        .div(this.dlcAccepts.length)
        .ceil()
        .toNumber();

      return (
        totalInput +
        Value.fromSats(offerFutureFeePerOffer).sats +
        Value.fromSats(acceptFutureFeePerAccept).sats
      );
    });

    const offerChangeValue =
      offerTotalFunding - offerInput - finalizer.offerFees;
    const acceptChangeValue =
      acceptTotalFunding - acceptInput - finalizer.acceptFees;

    const outputs: Output[] = [];
    witScripts.forEach((witScript, i) => {
      outputs.push({
        value: Value.fromSats(Number(fundingValues[i])),
        script: witScript,
        serialId: this.dlcOffers[i].fundOutputSerialId,
      });
    });
    outputs.push({
      value: Value.fromSats(Number(offerChangeValue)),
      script: Script.p2wpkhLock(this.dlcOffers[0].changeSpk.slice(2)),
      serialId: this.dlcOffers[0].changeSerialId,
    });
    outputs.push({
      value: Value.fromSats(Number(acceptChangeValue)),
      script: Script.p2wpkhLock(this.dlcAccepts[0].changeSpk.slice(2)),
      serialId: this.dlcAccepts[0].changeSerialId,
    });

    outputs.sort((a, b) => Number(a.serialId) - Number(b.serialId));

    outputs.forEach((output) => {
      tx.addOutput(output.value, output.script);
    });

    return tx.toTx();
  }

  private ensureSameFundingInputs(): void {
    // Check for offers
    const referenceOfferInputs = this.dlcOffers[0].fundingInputs.map((input) =>
      input.serialize().toString('hex'),
    );
    for (let i = 1; i < this.dlcOffers.length; i++) {
      const currentInputs = this.dlcOffers[i].fundingInputs.map((input) =>
        input.serialize().toString('hex'),
      );
      if (!this.arraysEqual(referenceOfferInputs, currentInputs)) {
        throw new Error(
          `Funding inputs for offer ${i} do not match the first offer's funding inputs.`,
        );
      }
    }

    // Check for accepts
    const referenceAcceptInputs = this.dlcAccepts[0].fundingInputs.map(
      (input) => input.serialize().toString('hex'),
    );
    for (let i = 1; i < this.dlcAccepts.length; i++) {
      const currentInputs = this.dlcAccepts[i].fundingInputs.map((input) =>
        input.serialize().toString('hex'),
      );
      if (!this.arraysEqual(referenceAcceptInputs, currentInputs)) {
        throw new Error(
          `Funding inputs for accept ${i} do not match the first accept's funding inputs.`,
        );
      }
    }
  }

  private arraysEqual(arr1: string[], arr2: string[]): boolean {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) return false;
    }
    return true;
  }
}

interface Output {
  value: Value;
  script: Script;
  serialId: bigint;
}
