import { Value } from '@node-dlc/bitcoin';
import {
  DlcAcceptWithoutSigs,
  DlcOffer,
  FundingInput,
} from '@node-dlc/messaging';
import { expect } from 'chai';

import { BatchDlcTxBuilder, DlcTxBuilder, DUST_LIMIT } from '../../lib';

describe('TxBuilder', () => {
  // Helper function to create test FundingInput
  const createTestFundingInput = (
    value: bigint,
    serialId = 1,
    maxWitnessLen = 108,
  ): FundingInput => {
    // Create proper transaction hex with correct output value encoding
    // Based on working format from existing tests
    const valueBuffer = Buffer.allocUnsafe(8);
    valueBuffer.writeBigUInt64LE(value, 0);
    const valueHex = valueBuffer.toString('hex');

    // Use a working transaction format: version + input + outputs + locktime
    const prevTxHex =
      '02000000' + // version
      '01' + // num inputs
      'f58f85b356ad5bb5b6d0ef3eb863be8a6cb95e08e1e9e92885b4b22e7e51eb9d' + // input txid
      '00000000' + // input vout
      '00' + // script sig length
      'ffffffff' + // sequence
      '01' + // num outputs
      valueHex + // output value (8 bytes, little endian)
      '2200201234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' + // P2WSH script
      '00000000'; // locktime

    return FundingInput.fromJSON({
      inputSerialId: serialId,
      prevTx: prevTxHex,
      prevTxVout: 0,
      sequence: 4294967295,
      maxWitnessLen,
      redeemScript: '',
    });
  };

  // Helper function to create test DlcOffer
  const createTestDlcOffer = (
    offerCollateral: bigint,
    fundingInputs: FundingInput[],
    feeRate = BigInt(1),
  ): DlcOffer => {
    const offer = new DlcOffer();
    offer.offerCollateral = offerCollateral;
    offer.fundingInputs = fundingInputs;
    offer.feeRatePerVb = feeRate;
    // Valid compressed public key (Bitcoin Generator Point)
    offer.fundingPubkey = Buffer.from(
      '0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798',
      'hex',
    );
    offer.payoutSpk = Buffer.from(
      '0014' + Buffer.alloc(20).toString('hex'),
      'hex',
    );
    offer.changeSpk = Buffer.from(
      '0014' + Buffer.alloc(20).toString('hex'),
      'hex',
    );
    offer.fundOutputSerialId = BigInt(1);
    offer.payoutSerialId = BigInt(2);
    offer.changeSerialId = BigInt(3);
    return offer;
  };

  // Helper function to create test DlcAccept
  const createTestDlcAccept = (
    acceptCollateral: bigint,
    fundingInputs: FundingInput[] = [],
  ): DlcAcceptWithoutSigs => {
    return new DlcAcceptWithoutSigs(
      1, // protocolVersion
      Buffer.alloc(32), // temporaryContractId
      acceptCollateral,
      // Valid compressed public key (different from offer)
      Buffer.from(
        '02F9308A019258C31049344F85F89D5229B531C845836F99B08601F113BCE036F9',
        'hex',
      ),
      Buffer.from('0014' + Buffer.alloc(20).toString('hex'), 'hex'), // payoutSpk
      BigInt(4), // payoutSerialId
      fundingInputs,
      Buffer.from('0014' + Buffer.alloc(20).toString('hex'), 'hex'), // changeSpk
      BigInt(5), // changeSerialId
    );
  };

  describe('DUST_LIMIT', () => {
    it('should export the dust limit constant', () => {
      expect(DUST_LIMIT).to.equal(BigInt(1000));
    });
  });

  describe('BatchDlcTxBuilder.calculateMaxCollateral', () => {
    it('should calculate maximum collateral for single input', () => {
      const fundingInputs = [createTestFundingInput(BigInt(1000000))];
      const feeRate = BigInt(1);

      const maxCollateral = BatchDlcTxBuilder.calculateMaxCollateral(
        fundingInputs,
        feeRate,
        1,
      );

      // Should be input value minus fees
      expect(Number(maxCollateral)).to.be.greaterThan(0);
      expect(Number(maxCollateral)).to.be.lessThan(1000000);
    });

    it('should calculate maximum collateral for multiple inputs', () => {
      const fundingInputs = [
        createTestFundingInput(BigInt(500000)),
        createTestFundingInput(BigInt(300000), 2),
      ];
      const feeRate = BigInt(1);

      const maxCollateral = BatchDlcTxBuilder.calculateMaxCollateral(
        fundingInputs,
        feeRate,
        1,
      );

      // Should be total input value minus fees
      expect(Number(maxCollateral)).to.be.greaterThan(0);
      expect(Number(maxCollateral)).to.be.lessThan(800000);
    });

    it('should account for higher fee rates', () => {
      const fundingInputs = [createTestFundingInput(BigInt(1000000))];
      const lowFeeRate = BigInt(1);
      const highFeeRate = BigInt(10);

      const maxCollateralLowFee = BatchDlcTxBuilder.calculateMaxCollateral(
        fundingInputs,
        lowFeeRate,
        1,
      );
      const maxCollateralHighFee = BatchDlcTxBuilder.calculateMaxCollateral(
        fundingInputs,
        highFeeRate,
        1,
      );

      // Higher fee rate should result in lower max collateral
      expect(Number(maxCollateralHighFee)).to.be.lessThan(
        Number(maxCollateralLowFee),
      );
    });

    it('should account for multiple contracts', () => {
      const fundingInputs = [createTestFundingInput(BigInt(1000000))];
      const feeRate = BigInt(1);

      const maxCollateralSingle = BatchDlcTxBuilder.calculateMaxCollateral(
        fundingInputs,
        feeRate,
        1,
      );
      const maxCollateralMultiple = BatchDlcTxBuilder.calculateMaxCollateral(
        fundingInputs,
        feeRate,
        3,
      );

      // Multiple contracts should result in lower max collateral due to higher fees
      expect(Number(maxCollateralMultiple)).to.be.lessThan(
        Number(maxCollateralSingle),
      );
    });

    it('should return zero when fees exceed input value', () => {
      const fundingInputs = [createTestFundingInput(BigInt(100))]; // Very small input
      const feeRate = BigInt(1000); // Very high fee rate

      const maxCollateral = BatchDlcTxBuilder.calculateMaxCollateral(
        fundingInputs,
        feeRate,
        1,
      );

      expect(maxCollateral).to.equal(BigInt(0));
    });

    it('should handle empty funding inputs', () => {
      const fundingInputs: FundingInput[] = [];
      const feeRate = BigInt(1);

      const maxCollateral = BatchDlcTxBuilder.calculateMaxCollateral(
        fundingInputs,
        feeRate,
        1,
      );

      expect(maxCollateral).to.equal(BigInt(0));
    });
  });

  describe('BatchDlcTxBuilder.buildFundingTransaction - Dust Filtering', () => {
    it('should create change outputs when above dust threshold', () => {
      // Create inputs with sufficient value for both collateral and change
      const offerInput = createTestFundingInput(BigInt(1010000)); // 1.01 BTC in sats
      const acceptInput = createTestFundingInput(BigInt(1005000), 2); // 1.005 BTC in sats

      const offer = createTestDlcOffer(BigInt(1000000), [offerInput]); // 1 BTC collateral
      const accept = createTestDlcAccept(BigInt(1000000), [acceptInput]); // 1 BTC collateral

      const builder = new BatchDlcTxBuilder([offer], [accept]);
      const tx = builder.buildFundingTransaction();

      // Should have 3 outputs: funding output + 2 change outputs
      expect(tx.outputs.length).to.equal(3);

      // Verify all outputs have value above zero
      tx.outputs.forEach((output) => {
        expect(Number(output.value.sats)).to.be.greaterThan(0);
      });
    });

    it('should filter out dust change outputs', () => {
      // Create inputs that result in dust change
      const offerInput = createTestFundingInput(BigInt(1000500)); // Just above collateral + fees
      const acceptInput = createTestFundingInput(BigInt(1000300), 2); // Just above collateral + fees

      const offer = createTestDlcOffer(BigInt(1000000), [offerInput]); // 1 BTC collateral
      const accept = createTestDlcAccept(BigInt(1000000), [acceptInput]); // 1 BTC collateral

      const builder = new BatchDlcTxBuilder([offer], [accept]);
      const tx = builder.buildFundingTransaction();

      // Should have only 1 output: just the funding output (no change outputs due to dust)
      expect(tx.outputs.length).to.be.lessThan(3);
      expect(tx.outputs.length).to.be.at.least(1);

      // The funding output should be present
      const fundingOutputValue = tx.outputs[0].value.sats;
      expect(Number(fundingOutputValue)).to.be.greaterThan(2000000); // Should contain both collaterals + future fees
    });

    it('should handle exact amount scenarios (no change)', () => {
      // Use calculateMaxCollateral to determine exact amounts
      const offerInput = createTestFundingInput(BigInt(1000000));
      const maxCollateral = BatchDlcTxBuilder.calculateMaxCollateral(
        [offerInput],
        BigInt(1),
        1,
      );

      const offer = createTestDlcOffer(maxCollateral, [offerInput]);
      const accept = createTestDlcAccept(BigInt(0), []); // Single-funded DLC

      const builder = new BatchDlcTxBuilder([offer], [accept]);
      const tx = builder.buildFundingTransaction();

      // Should have only 1 output: the funding output
      expect(tx.outputs.length).to.equal(1);

      // Verify the funding output value
      const fundingOutputValue = tx.outputs[0].value.sats;
      expect(Number(fundingOutputValue)).to.be.greaterThan(0);
    });

    it('should handle mixed scenarios (one party has change, other has dust)', () => {
      // Offer has significant change, accept has dust change
      const offerInput = createTestFundingInput(BigInt(1050000)); // Large change
      const acceptInput = createTestFundingInput(BigInt(1000300), 2); // Dust change

      const offer = createTestDlcOffer(BigInt(1000000), [offerInput]);
      const accept = createTestDlcAccept(BigInt(1000000), [acceptInput]);

      const builder = new BatchDlcTxBuilder([offer], [accept]);
      const tx = builder.buildFundingTransaction();

      // Should have 2 outputs: funding output + offer change output (accept change filtered)
      expect(tx.outputs.length).to.equal(2);

      // Find the change output (not the largest one which should be funding)
      const sortedOutputs = tx.outputs.sort((a, b) =>
        Number(b.value.sats - a.value.sats),
      );
      const changeOutput = sortedOutputs[1];

      // Verify change output is above dust threshold
      expect(Number(changeOutput.value.sats)).to.be.at.least(
        Number(DUST_LIMIT),
      );
    });
  });

  describe('BatchDlcTxBuilder.buildFundingTransaction - Error Handling', () => {
    it('should throw error when offerer has insufficient funds', () => {
      const offerInput = createTestFundingInput(BigInt(500000)); // Insufficient
      const acceptInput = createTestFundingInput(BigInt(1000000), 2);

      const offer = createTestDlcOffer(BigInt(1000000), [offerInput]); // Requires more than input
      const accept = createTestDlcAccept(BigInt(500000), [acceptInput]);

      const builder = new BatchDlcTxBuilder([offer], [accept]);

      expect(() => builder.buildFundingTransaction()).to.throw(
        /Insufficient funds for offerer/,
      );
    });

    it('should throw error when accepter has insufficient funds', () => {
      const offerInput = createTestFundingInput(BigInt(1000000));
      const acceptInput = createTestFundingInput(BigInt(300000), 2); // Insufficient

      const offer = createTestDlcOffer(BigInt(500000), [offerInput]);
      const accept = createTestDlcAccept(BigInt(1000000), [acceptInput]); // Requires more than input

      const builder = new BatchDlcTxBuilder([offer], [accept]);

      expect(() => builder.buildFundingTransaction()).to.throw(
        /Insufficient funds for accepter/,
      );
    });

    it('should provide clear error messages with actual values', () => {
      const offerInput = createTestFundingInput(BigInt(500000));
      const offer = createTestDlcOffer(BigInt(1000000), [offerInput]);
      const accept = createTestDlcAccept(BigInt(0), []);

      const builder = new BatchDlcTxBuilder([offer], [accept]);

      try {
        builder.buildFundingTransaction();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('need');
        expect(error.message).to.include('have');
        expect(error.message).to.include('500000');
      }
    });
  });

  describe('DlcTxBuilder', () => {
    it('should build funding transaction for single DLC', () => {
      const offerInput = createTestFundingInput(BigInt(1000000));
      const acceptInput = createTestFundingInput(BigInt(1000000), 2);

      const offer = createTestDlcOffer(BigInt(500000), [offerInput]);
      const accept = createTestDlcAccept(BigInt(500000), [acceptInput]);

      const builder = new DlcTxBuilder(offer, accept);
      const tx = builder.buildFundingTransaction();

      expect(tx.outputs.length).to.be.at.least(1);
      expect(tx.inputs.length).to.equal(2);
    });
  });

  describe('Integration Tests', () => {
    it('should handle DLC splicing scenario with exact amounts', () => {
      // Simulate splicing: use a DLC funding output + additional UTXO
      const dlcFundingInput = createTestFundingInput(BigInt(970332)); // Existing DLC output
      const additionalInput = createTestFundingInput(BigInt(100000), 2); // Additional UTXO

      const totalInputs = [dlcFundingInput, additionalInput];
      const maxCollateral = BatchDlcTxBuilder.calculateMaxCollateral(
        totalInputs,
        BigInt(1),
        1,
      );

      // Create offer using exact max collateral (no change scenario)
      const offer = createTestDlcOffer(maxCollateral, totalInputs);
      const accept = createTestDlcAccept(BigInt(0), []); // Single-funded

      const builder = new BatchDlcTxBuilder([offer], [accept]);
      const tx = builder.buildFundingTransaction();

      // Should successfully create transaction with no change outputs
      expect(tx.outputs.length).to.equal(1); // Only funding output
      expect(tx.inputs.length).to.equal(2); // Both inputs used

      // Verify the transaction balances
      const totalInputValue = BigInt(970332) + BigInt(100000);
      const outputValue = tx.outputs[0].value.sats;

      // Output should be less than input (due to fees) but close
      expect(Number(outputValue)).to.be.lessThan(Number(totalInputValue));
      expect(Number(outputValue)).to.be.greaterThan(
        Number(totalInputValue - BigInt(10000)),
      ); // Reasonable fee range
    });

    it('should handle batch DLC scenarios', () => {
      const offerInput1 = createTestFundingInput(BigInt(500000));
      const offerInput2 = createTestFundingInput(BigInt(500000), 2);
      const acceptInput = createTestFundingInput(BigInt(800000), 3);

      const offer1 = createTestDlcOffer(BigInt(400000), [
        offerInput1,
        offerInput2,
      ]);
      const offer2 = createTestDlcOffer(BigInt(400000), [
        offerInput1,
        offerInput2,
      ]);
      const accept1 = createTestDlcAccept(BigInt(300000), [acceptInput]);
      const accept2 = createTestDlcAccept(BigInt(300000), [acceptInput]);

      const builder = new BatchDlcTxBuilder(
        [offer1, offer2],
        [accept1, accept2],
      );
      const tx = builder.buildFundingTransaction();

      // Should have 2 funding outputs + change outputs (if any)
      expect(tx.outputs.length).to.be.at.least(2);
      expect(tx.inputs.length).to.equal(3); // All unique inputs
    });
  });
});
