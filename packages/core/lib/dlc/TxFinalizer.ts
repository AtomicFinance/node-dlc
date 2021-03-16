import { FundingInputV0 } from '@node-dlc/messaging';

export class DualFundingTxFinalizer {
  constructor(
    readonly offerInputs: FundingInputV0[],
    readonly offerPayoutSPK: Buffer,
    readonly offerChangeSPK: Buffer,
    readonly acceptInputs: FundingInputV0[],
    readonly acceptPayoutSPK: Buffer,
    readonly acceptChangeSPK: Buffer,
    readonly feeRate: bigint,
  ) {}

  private computeFees(
    inputs: FundingInputV0[],
    payoutSPK: Buffer,
    changeSPK: Buffer,
  ): IFees {
    // https://github.com/discreetlogcontracts/dlcspecs/blob/8ee4bbe816c9881c832b1ce320b9f14c72e3506f/Transactions.md#expected-weight-of-the-contract-execution-or-refund-transaction
    const futureFeeWeight = 249 + 4 * payoutSPK.length;
    const futureFeeVBytes = Math.ceil(futureFeeWeight / 4);
    const futureFee = this.feeRate * BigInt(futureFeeVBytes);

    // https://github.com/discreetlogcontracts/dlcspecs/blob/8ee4bbe816c9881c832b1ce320b9f14c72e3506f/Transactions.md#expected-weight-of-the-funding-transaction
    const inputWeight = inputs.reduce((total, input) => {
      return total + 164 + input.maxWitnessLen + input.scriptSigLength();
    }, 0);
    const outputWeight = 36 + 4 * changeSPK.length;
    const weight = 107 + outputWeight + inputWeight;
    const vbytes = Math.ceil(weight / 4);
    const fundingFee = this.feeRate * BigInt(vbytes);

    return { futureFee, fundingFee };
  }

  private getOfferFees(): IFees {
    return this.computeFees(
      this.offerInputs,
      this.offerPayoutSPK,
      this.offerChangeSPK,
    );
  }

  private getAcceptFees(): IFees {
    return this.computeFees(
      this.acceptInputs,
      this.acceptPayoutSPK,
      this.acceptChangeSPK,
    );
  }

  public get offerFees(): bigint {
    const { futureFee, fundingFee } = this.getOfferFees();
    return futureFee + fundingFee;
  }

  public get offerFutureFee(): bigint {
    return this.getOfferFees().futureFee;
  }

  public get offerFundingFee(): bigint {
    return this.getOfferFees().fundingFee;
  }

  public get acceptFees(): bigint {
    const { futureFee, fundingFee } = this.getAcceptFees();
    return futureFee + fundingFee;
  }

  public get acceptFutureFee(): bigint {
    return this.getAcceptFees().futureFee;
  }

  public get acceptFundingFee(): bigint {
    return this.getAcceptFees().fundingFee;
  }
}

interface IFees {
  futureFee: bigint;
  fundingFee: bigint;
}
