import { Value } from '@node-dlc/bitcoin';
import { expect } from 'chai';

import {
  dualFees,
  dualFundingCoinSelect,
  dustThreshold,
  getMaxWitnessLen,
  UTXO,
} from '../../lib';

const getUtxos = (totalCollateral: bigint, numUtxos = 1) => {
  const utxos: UTXO[] = [];

  for (let i = 0; i < numUtxos; i++) {
    utxos.push({
      address: 'bcrt1qjzut0906d9sk4hml4k6sz6cssljktf4c7yl80f',
      txid: 'c7bf12ac16aba1cf6c7769117294853453f7da3006363dfe4e8979847e32f7e1',
      value: Math.ceil(Number(totalCollateral) / numUtxos),
      vout: Math.floor(Math.random() * 11), // random integer between 0 and 10
    });
  }

  return utxos;
};

describe('CoinSelect', () => {
  describe('dualFundingCoinSelect', () => {
    it('should select coins correctly for 5 UTXOs and feeRate 450', () => {
      const feeRate = BigInt(450);
      const numUtxos = 5;
      const totalCollateral = Value.fromBitcoin(0.01);
      const offerCollateral = Value.fromBitcoin(0.0075);

      const utxos = getUtxos(totalCollateral.sats, numUtxos);

      const { fee, inputs } = dualFundingCoinSelect(
        utxos,
        [offerCollateral.sats],
        feeRate,
      );

      expect(fee).to.equal(BigInt(217350));
      expect(inputs.length).to.equal(5);
    });

    it('should fail to select coins if fee is greater than sum of utxos', () => {
      const feeRate = BigInt(450);
      const numUtxos = 5;
      const totalCollateral = Value.fromBitcoin(0.01);
      const offerCollateral = Value.fromBitcoin(0.096);

      const utxos = getUtxos(totalCollateral.sats, numUtxos);

      const { fee, inputs } = dualFundingCoinSelect(
        utxos,
        [offerCollateral.sats],
        feeRate,
      );

      expect(fee).to.equal(BigInt(94950));
      expect(inputs.length).to.equal(0);
    });

    it('should fail to select coins if detrimental input', () => {
      const feeRate = BigInt(450);
      const numUtxos = 1;
      const totalCollateral = Value.fromSats(30000);
      const offerCollateral = Value.fromSats(20000);

      const utxos = getUtxos(totalCollateral.sats, numUtxos);

      const { fee, inputs } = dualFundingCoinSelect(
        utxos,
        [offerCollateral.sats],
        feeRate,
      );

      expect(fee).to.equal(BigInt(94950));
      expect(inputs.length).to.equal(0);
    });

    it('should prioritize utxo selection', () => {
      const feeRate = BigInt(450);
      const numUtxos = 5;
      const totalCollateral = Value.fromBitcoin(0.01);
      const offerCollateral = Value.fromBitcoin(0.0075);

      const utxos = getUtxos(totalCollateral.sats, numUtxos);

      utxos.push({
        address: 'bcrt1qjzut0906d9sk4hml4k6sz6cssljktf4c7yl80f',
        txid: 'c7bf12ac16aba1cf6c7769117294853453f7da3006363dfe4e8979847e32f7e1',
        value: 10000,
        vout: Math.floor(Math.random() * 11), // random integer between 0 and 10
      });

      const { fee, inputs } = dualFundingCoinSelect(
        utxos,
        [offerCollateral.sats],
        feeRate,
      );

      expect(fee).to.equal(BigInt(217350));
      expect(inputs.length).to.equal(5);
    });
  });

  describe('Additional CoinSelect Tests', () => {
    const feeRate = BigInt(450);
    const totalCollateral = Value.fromBitcoin(0.01);
    const offerCollateral = Value.fromBitcoin(0.0075);

    it('should fail to select coins when all UTXOs are detrimental due to high fee rate', () => {
      const highFeeRate = BigInt(10000); // An exaggerated fee rate to make the point
      const utxos = getUtxos(totalCollateral.sats, 5);

      const { fee, inputs } = dualFundingCoinSelect(
        utxos,
        [offerCollateral.sats],
        highFeeRate,
      );

      expect(inputs.length).to.equal(0);
      expect(fee).to.equal(BigInt(2110000));
    });

    it('should select all UTXOs when they are just enough to cover collateral and fees', () => {
      const utxos = getUtxos(totalCollateral.sats, 5);

      const { fee, inputs } = dualFundingCoinSelect(
        utxos,
        [offerCollateral.sats],
        feeRate,
      );

      expect(inputs.length).to.equal(5);
      expect(fee).to.equal(BigInt(217350));
    });

    it('should select UTXOs optimally from a mixed set', () => {
      const mixedUtxos = [
        ...getUtxos(Value.fromBitcoin(0.005).sats, 2), // smaller UTXOs
        ...getUtxos(Value.fromBitcoin(0.02).sats, 3), // larger UTXOs
      ];

      const { fee, inputs } = dualFundingCoinSelect(
        mixedUtxos,
        [offerCollateral.sats],
        feeRate,
      );

      // Expecting it to select fewer, larger UTXOs over many small ones
      expect(inputs.length).to.be.lessThan(5);
      expect(fee).to.equal(BigInt(125550));
    });

    it('should handle an empty array of UTXOs correctly', () => {
      const { fee, inputs } = dualFundingCoinSelect(
        [],
        [offerCollateral.sats],
        feeRate,
      );

      expect(inputs.length).to.equal(0);
      expect(fee).to.equal(dualFees(feeRate, 1, 1)); // The fee for an attempt with no inputs
    });

    it('should select fewer UTXOs with a very low fee rate', () => {
      const lowFeeRate = BigInt(1); // An extremely low fee rate
      const utxos = getUtxos(totalCollateral.sats, 10); // More UTXOs than needed

      const { fee, inputs } = dualFundingCoinSelect(
        utxos,
        [offerCollateral.sats],
        lowFeeRate,
      );

      // Expecting it to select fewer UTXOs due to the low cost of adding an input
      expect(inputs.length).to.be.lessThan(10);
      expect(fee).to.equal(BigInt(687));
    });

    it('should calculate lower fees for taproot inputs', () => {
      const feeRate = BigInt(450);
      const p2wpkhFee = dualFees(feeRate, 1, 1);
      const p2trFee = dualFees(feeRate, [getMaxWitnessLen('p2tr')], 1);

      expect(p2trFee < p2wpkhFee).to.equal(true);
    });

    it('should select taproot UTXOs using taproot witness costs', () => {
      const feeRate = BigInt(10);
      const offerCollateral = Value.fromSats(20000);
      const p2trAddress =
        'bcrt1pqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpqqenm';
      const p2trFee = dualFees(feeRate, [getMaxWitnessLen('p2tr')], 1);
      const p2wpkhFee = dualFees(feeRate, [getMaxWitnessLen('p2wpkh')], 1);
      const changeBuffer = dustThreshold(feeRate);
      const p2trRequired = offerCollateral.sats + p2trFee + changeBuffer;
      const p2wpkhRequired = offerCollateral.sats + p2wpkhFee + changeBuffer;

      // Value sits above Taproot requirements but below P2WPKH requirements.
      const p2trUtxo: UTXO = {
        address: p2trAddress,
        txid: 'c7bf12ac16aba1cf6c7769117294853453f7da3006363dfe4e8979847e32f7e1',
        value: Number(p2trRequired),
        vout: 0,
        scriptType: 'p2tr',
      };

      const p2wpkhUtxo: UTXO = {
        ...p2trUtxo,
        address: 'bcrt1qjzut0906d9sk4hml4k6sz6cssljktf4c7yl80f',
        scriptType: 'p2wpkh',
      };

      expect(p2trRequired < p2wpkhRequired).to.equal(true);
      expect(BigInt(p2trUtxo.value)).to.equal(p2trRequired);
      expect(BigInt(p2trUtxo.value) < p2wpkhRequired).to.equal(true);

      const taprootSelection = dualFundingCoinSelect(
        [p2trUtxo],
        [offerCollateral.sats],
        feeRate,
      );
      const p2wpkhSelection = dualFundingCoinSelect(
        [p2wpkhUtxo],
        [offerCollateral.sats],
        feeRate,
      );

      expect(taprootSelection.inputs.length).to.equal(1);
      expect(p2wpkhSelection.inputs.length).to.equal(0);
    });
  });
});
