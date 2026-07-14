import { FundingInput } from '@node-dlc/messaging';

import {
  DEFAULT_MAX_WITNESS_LEN,
  DualFundingTxFinalizer,
  FundingInputScriptType,
  fundingInputVBytes,
  getMaxWitnessLen,
} from './TxFinalizer';

export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  address: string;
  derivationPath?: string;
  scriptPubKey?: Buffer | string;
  scriptType?: FundingInputScriptType;
}

const scriptPubKeyBuffer = (scriptPubKey: Buffer | string): Buffer => {
  return Buffer.isBuffer(scriptPubKey)
    ? scriptPubKey
    : Buffer.from(scriptPubKey, 'hex');
};

const scriptTypeFromUtxo = (utxo?: UTXO): FundingInputScriptType => {
  if (!utxo) return 'p2wpkh';

  if (utxo.scriptType) return utxo.scriptType;

  if (utxo.scriptPubKey) {
    const scriptPubKey = scriptPubKeyBuffer(utxo.scriptPubKey);
    if (
      scriptPubKey.length === 34 &&
      scriptPubKey[0] === 0x51 &&
      scriptPubKey[1] === 0x20
    )
      return 'p2tr';
    if (
      scriptPubKey.length === 34 &&
      scriptPubKey[0] === 0x00 &&
      scriptPubKey[1] === 0x20
    )
      return 'p2wsh';
  }

  if (/^(bc|tb|bcrt)1p/i.test(utxo.address)) return 'p2tr';

  return 'p2wpkh';
};

const inputBytes = (utxo?: UTXO): bigint => {
  return fundingInputVBytes(getMaxWitnessLen(scriptTypeFromUtxo(utxo)));
};

export const dustThreshold = (feeRate: bigint, utxo?: UTXO): bigint => {
  return inputBytes(utxo) * feeRate;
};

// order by descending value, minus the inputs approximate fee
const utxoScore = (x: UTXO, feeRate: bigint): bigint => {
  return BigInt(x.value) - feeRate * inputBytes(x);
};

const fundingInputWithWitnessLen = (maxWitnessLen: number): FundingInput => {
  const input = new FundingInput();
  input.maxWitnessLen = maxWitnessLen;
  input.redeemScript = Buffer.from('', 'hex');
  return input;
};

const witnessLensFromInputCount = (
  numInputsOrWitnessLens: number | number[],
): number[] =>
  Array.isArray(numInputsOrWitnessLens)
    ? numInputsOrWitnessLens
    : Array.from(
        { length: numInputsOrWitnessLens },
        () => DEFAULT_MAX_WITNESS_LEN,
      );

export const dualFees = (
  feeRate: bigint,
  numInputsOrWitnessLens: number | number[],
  numContracts: number,
): bigint => {
  const fakeSPK = Buffer.from(
    '0014663117d27e78eb432505180654e603acb30e8a4a',
    'hex',
  );

  const offerInputs = witnessLensFromInputCount(numInputsOrWitnessLens).map(
    fundingInputWithWitnessLen,
  );
  const acceptInputs = [fundingInputWithWitnessLen(DEFAULT_MAX_WITNESS_LEN)];

  return new DualFundingTxFinalizer(
    offerInputs,
    fakeSPK,
    fakeSPK,
    acceptInputs,
    fakeSPK,
    fakeSPK,
    feeRate,
    numContracts,
  ).offerFees;
};

/**
 * Selects UTXOs for dual funding
 * @param utxos - UTXOs to select from
 * @param collaterals - Collaterals to fund (just one for non-batch tx)
 * @param feeRate - Fee rate in satoshis per byte
 * @returns Inputs and fee
 * @description
 * Add inputs until we reach or surpass the target value (or deplete)
 * Worst-case: O(n)
 */
export const dualFundingCoinSelect = (
  utxos: UTXO[],
  collaterals: bigint[], // in satoshis
  feeRate: bigint,
): { inputs: UTXO[]; fee: bigint } => {
  utxos = [...utxos].sort((a, b) =>
    Number(utxoScore(b, feeRate) - utxoScore(a, feeRate)),
  );

  let inAccum = 0;
  const inputs: UTXO[] = [];
  const outAccum =
    collaterals.reduce((acc, val) => acc + val, BigInt(0)) +
    dustThreshold(feeRate); // sum of collaterals

  for (let i = 0; i < utxos.length; ++i) {
    const utxo = utxos[i];
    const utxoBytes = inputBytes(utxo);
    const utxoFee = feeRate * utxoBytes;
    const utxoValue = utxo.value;

    // skip detrimental input
    if (utxoFee > utxo.value) {
      if (i === utxos.length - 1)
        return {
          fee: dualFees(feeRate, 1, collaterals.length),
          inputs: [],
        };
      continue;
    }

    inAccum += utxoValue;
    inputs.push(utxo);

    const fee = dualFees(
      feeRate,
      inputs.map((input) => getMaxWitnessLen(scriptTypeFromUtxo(input))),
      collaterals.length,
    );

    // go again?
    if (inAccum < outAccum + fee) continue;

    return { inputs, fee };
  }

  return {
    fee: dualFees(feeRate, 1, collaterals.length),
    inputs: [],
  };
};
