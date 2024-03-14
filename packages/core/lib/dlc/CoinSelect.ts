import { FundingInputV0 } from '@node-dlc/messaging';

import { DualFundingTxFinalizer } from './TxFinalizer';

export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  address: string;
  derivationPath?: string;
}

const TX_INPUT_SIZE = {
  LEGACY: 148,
  P2SH: 92,
  BECH32: 69,
};

const inputBytes = () => {
  return BigInt(TX_INPUT_SIZE.BECH32);
};

export const dustThreshold = (feeRate: bigint): bigint => {
  return BigInt(inputBytes()) * feeRate;
};

// order by descending value, minus the inputs approximate fee
const utxoScore = (x: UTXO, feeRate: bigint): bigint => {
  return BigInt(x.value) - feeRate * inputBytes();
};

export const dualFees = (
  feeRate: bigint,
  numInputs: number,
  numContracts: number,
): bigint => {
  const input = new FundingInputV0();
  input.maxWitnessLen = 108;
  input.redeemScript = Buffer.from('', 'hex');

  const fakeSPK = Buffer.from(
    '0014663117d27e78eb432505180654e603acb30e8a4a',
    'hex',
  );

  const offerInputs = Array.from({ length: numInputs }, () => input);
  const acceptInputs = Array.from({ length: 1 }, () => input);

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
    const utxoBytes = inputBytes();
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

    const fee = dualFees(feeRate, inputs.length, collaterals.length);

    // go again?
    if (inAccum < outAccum + fee) continue;

    return { inputs, fee };
  }

  return {
    fee: dualFees(feeRate, 1, collaterals.length),
    inputs: [],
  };
};
