import { FundingInput, MessageType } from '@node-dlc/messaging';
import { Decimal } from 'decimal.js';

const BATCH_FUND_TX_BASE_WEIGHT = 42;
const FUNDING_OUTPUT_SIZE = 43;

export type FundingInputScriptType = 'p2wpkh' | 'p2wsh' | 'p2tr';

export const FUNDING_INPUT_MAX_WITNESS_LEN: Record<
  FundingInputScriptType,
  number
> = {
  p2wpkh: 108,
  p2wsh: 108,
  p2tr: 66,
};

export const DEFAULT_MAX_WITNESS_LEN = FUNDING_INPUT_MAX_WITNESS_LEN.p2wpkh;

export const getMaxWitnessLen = (
  scriptType: FundingInputScriptType = 'p2wpkh',
): number => FUNDING_INPUT_MAX_WITNESS_LEN[scriptType];

export const fundingInputVBytes = (
  maxWitnessLen = DEFAULT_MAX_WITNESS_LEN,
  scriptSigLength = 0,
): bigint =>
  BigInt(
    new Decimal(164 + maxWitnessLen + scriptSigLength).div(4).ceil().toNumber(),
  );

const fundingInputWithWitnessLen = (maxWitnessLen: number): FundingInput => {
  const input = new FundingInput();
  input.maxWitnessLen = maxWitnessLen;
  input.redeemScript = Buffer.from('', 'hex');
  return input;
};

const fundingInputsWithWitnessLens = (
  count: number,
  maxWitnessLenOrLens: number | number[] = DEFAULT_MAX_WITNESS_LEN,
): FundingInput[] => {
  const witnessLens = Array.isArray(maxWitnessLenOrLens)
    ? maxWitnessLenOrLens
    : Array.from({ length: count }, () => maxWitnessLenOrLens);

  return witnessLens.map(fundingInputWithWitnessLen);
};

export class DualFundingTxFinalizer {
  constructor(
    readonly offerInputs: FundingInput[],
    readonly offerPayoutSPK: Buffer,
    readonly offerChangeSPK: Buffer,
    readonly acceptInputs: FundingInput[],
    readonly acceptPayoutSPK: Buffer,
    readonly acceptChangeSPK: Buffer,
    readonly feeRate: bigint,
    readonly numContracts = 1,
  ) {}

  private computeFees(
    _inputs: FundingInput[],
    payoutSPK: Buffer,
    changeSPK: Buffer,
    numContracts: number,
  ): IFees {
    // If no inputs, return zero fees (matches C++ layer behavior for single-funded DLCs)
    if (_inputs.length === 0) {
      return { futureFee: BigInt(0), fundingFee: BigInt(0) };
    }

    _inputs.forEach((input) => {
      if (input.type !== MessageType.FundingInput) {
        console.error('input', input);
        throw new Error('Input is not a funding input');
      }
    });
    const inputs: FundingInput[] = _inputs.map(
      (input) => input as FundingInput,
    );
    // https://github.com/discreetlogcontracts/dlcspecs/blob/8ee4bbe816c9881c832b1ce320b9f14c72e3506f/Transactions.md#expected-weight-of-the-contract-execution-or-refund-transaction
    const futureFeeWeight = 249 + 4 * payoutSPK.length;
    const futureFeeVBytes = new Decimal(futureFeeWeight)
      .times(numContracts)
      .div(4)
      .ceil()
      .toNumber();
    const futureFee = this.feeRate * BigInt(futureFeeVBytes);

    // https://github.com/discreetlogcontracts/dlcspecs/blob/8ee4bbe816c9881c832b1ce320b9f14c72e3506f/Transactions.md#expected-weight-of-the-funding-transaction
    const inputWeight = inputs.reduce((total, input) => {
      return total + 164 + input.maxWitnessLen + input.scriptSigLength();
    }, 0);
    const contractWeight =
      (BATCH_FUND_TX_BASE_WEIGHT + FUNDING_OUTPUT_SIZE * numContracts * 4) / 2;
    const outputWeight = 36 + 4 * changeSPK.length + contractWeight;
    const weight = outputWeight + inputWeight;
    const vbytes = new Decimal(weight).div(4).ceil().toNumber();
    const fundingFee = this.feeRate * BigInt(vbytes);

    return { futureFee, fundingFee };
  }

  private getOfferFees(): IFees {
    return this.computeFees(
      this.offerInputs,
      this.offerPayoutSPK,
      this.offerChangeSPK,
      this.numContracts,
    );
  }

  private getAcceptFees(): IFees {
    return this.computeFees(
      this.acceptInputs,
      this.acceptPayoutSPK,
      this.acceptChangeSPK,
      this.numContracts,
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

export class DualClosingTxFinalizer {
  constructor(
    readonly initiatorInputs: FundingInput[],
    readonly offerPayoutSPK: Buffer,
    readonly acceptPayoutSPK: Buffer,
    readonly feeRate: bigint,
  ) {}

  private computeFees(payoutSPK: Buffer, _inputs: FundingInput[] = []): bigint {
    _inputs.forEach((input) => {
      if (input.type !== MessageType.FundingInput)
        throw new Error('Input is not a funding input');
    });
    const inputs: FundingInput[] = _inputs.map(
      (input) => input as FundingInput,
    );
    // https://gist.github.com/matthewjablack/08c36baa513af9377508111405b22e03
    const inputWeight = inputs.reduce((total, input) => {
      return total + 164 + input.maxWitnessLen + input.scriptSigLength();
    }, 0);
    const outputWeight = 36 + 4 * payoutSPK.length;
    const weight = 213 + outputWeight + inputWeight;
    const vbytes = new Decimal(weight).div(4).ceil().toNumber();
    const fee = this.feeRate * BigInt(vbytes);

    return fee;
  }

  private getOfferInitiatorFees(): bigint {
    return this.computeFees(this.offerPayoutSPK, this.initiatorInputs);
  }

  private getOfferReciprocatorFees(): bigint {
    return this.computeFees(this.offerPayoutSPK);
  }

  private getAcceptInitiatorFees(): bigint {
    return this.computeFees(this.acceptPayoutSPK, this.initiatorInputs);
  }

  private getAcceptReciprocatorFees(): bigint {
    return this.computeFees(this.acceptPayoutSPK);
  }

  public get offerInitiatorFees(): bigint {
    return this.getOfferInitiatorFees();
  }

  public get offerReciprocatorFees(): bigint {
    return this.getOfferReciprocatorFees();
  }

  public get acceptInitiatorFees(): bigint {
    return this.getAcceptInitiatorFees();
  }

  public get acceptReciprocatorFees(): bigint {
    return this.getAcceptReciprocatorFees();
  }
}

interface IFees {
  futureFee: bigint;
  fundingFee: bigint;
}

export const getFinalizer = (
  feeRate: bigint,
  offerInputs?: FundingInput[],
  acceptInputs?: FundingInput[],
  numContracts?: number,
  offerMaxWitnessLen: number | number[] = DEFAULT_MAX_WITNESS_LEN,
  acceptMaxWitnessLen: number | number[] = DEFAULT_MAX_WITNESS_LEN,
): DualFundingTxFinalizer => {
  const fakeSPK = Buffer.from(
    '0014663117d27e78eb432505180654e603acb30e8a4a',
    'hex',
  );

  offerInputs =
    offerInputs || fundingInputsWithWitnessLens(1, offerMaxWitnessLen);

  acceptInputs =
    acceptInputs || fundingInputsWithWitnessLens(1, acceptMaxWitnessLen);

  return new DualFundingTxFinalizer(
    offerInputs,
    fakeSPK,
    fakeSPK,
    acceptInputs,
    fakeSPK,
    fakeSPK,
    feeRate,
    numContracts,
  );
};

export const getFinalizerByCount = (
  feeRate: bigint,
  numOfferInputs: number,
  numAcceptInputs: number,
  numContracts: number,
  offerMaxWitnessLen: number | number[] = DEFAULT_MAX_WITNESS_LEN,
  acceptMaxWitnessLen: number | number[] = DEFAULT_MAX_WITNESS_LEN,
): DualFundingTxFinalizer => {
  const offerInputs = fundingInputsWithWitnessLens(
    numOfferInputs,
    offerMaxWitnessLen,
  );
  const acceptInputs = fundingInputsWithWitnessLens(
    numAcceptInputs,
    acceptMaxWitnessLen,
  );
  return getFinalizer(feeRate, offerInputs, acceptInputs, numContracts);
};
