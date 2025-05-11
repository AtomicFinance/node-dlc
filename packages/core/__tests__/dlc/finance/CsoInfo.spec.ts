import { Value } from '@node-dlc/bitcoin';
import {
  ContractDescriptorV1,
  ContractInfoV0,
  DigitDecompositionEventDescriptorV0,
  DlcOfferV0,
  OracleAnnouncementV0,
  OracleEventV0,
  OracleInfoV0,
  PayoutFunctionV0,
  PolynomialPayoutCurvePiece,
} from '@node-dlc/messaging';
import { BitcoinNetworks } from 'bitcoin-networks';
import { expect } from 'chai';

import {
  buildCustomStrategyOrderOffer,
  buildRoundingIntervalsFromIntervals,
  DlcParty,
  dustThreshold,
  getFinalizerByCount,
  LinearPayout,
  roundDownToNearestMultiplier,
  roundUpToNearestMultiplier,
} from '../../../lib';
import {
  getCsoInfoFromContractInfo,
  getCsoInfoFromOffer,
  validateCsoPayoutFunction,
} from '../../../lib/dlc/finance/CsoInfo';

const buildOracleAnnouncement = (oracleDigits: number, expiry: Date) => {
  const eventDescriptor = new DigitDecompositionEventDescriptorV0();
  eventDescriptor.base = 2;
  eventDescriptor.isSigned = false;
  eventDescriptor.unit = 'bits';
  eventDescriptor.precision = 0;
  eventDescriptor.nbDigits = oracleDigits;

  const oracleEvent = new OracleEventV0();
  oracleEvent.eventMaturityEpoch = Math.floor(expiry.getTime() / 1000);
  oracleEvent.eventDescriptor = eventDescriptor;

  const oracleAnnouncement = new OracleAnnouncementV0();
  oracleAnnouncement.oracleEvent = oracleEvent;

  return oracleAnnouncement;
};

const buildCsoDlcOfferFixture = (
  oracleDigits: number,
  expiry: Date,
  payoutFunction: PayoutFunctionV0,
  totalCollateral: bigint,
  offerCollateral: bigint,
): DlcOfferV0 => {
  const oracleAnnouncement = buildOracleAnnouncement(oracleDigits, expiry);

  const oracleInfo = new OracleInfoV0();
  oracleInfo.announcement = oracleAnnouncement;

  const contractDescriptor = new ContractDescriptorV1();
  contractDescriptor.numDigits = oracleDigits;
  contractDescriptor.payoutFunction = payoutFunction;

  const contractInfo = new ContractInfoV0();
  contractInfo.totalCollateral = totalCollateral;
  contractInfo.contractDescriptor = contractDescriptor;
  contractInfo.oracleInfo = oracleInfo;

  const dlcOffer = new DlcOfferV0();
  dlcOffer.contractInfo = contractInfo;
  dlcOffer.offerCollateralSatoshis = offerCollateral;

  return dlcOffer;
};

describe('CsoInfo', () => {
  const minPayout = 60000000n;
  const maxPayout = 100000000n;
  const startOutcome = 800000n;
  const endOutcome = 1200000n;
  const offerCollateralValue = 80000000n;

  const oracleBase = 2;
  const oracleDigits = 21;

  const expiry = new Date(1620014750000);

  const maxGain = Value.fromBitcoin(0.2);
  const maxLoss = Value.fromBitcoin(0.2);
  const maxGainForContractSize = Value.fromBitcoin(0.2);
  const maxLossForContractSize = Value.fromBitcoin(0.2);

  const contractSize = Value.fromBitcoin(1);
  const totalCollateral = Value.fromBitcoin(1);
  const offerCollateral = Value.fromBitcoin(0.8);

  const network = BitcoinNetworks.bitcoin;

  const highestPrecisionRounding = Value.fromSats(10000);
  const highPrecisionRounding = Value.fromSats(25000);
  const mediumPrecisionRounding = Value.fromSats(100000);
  const lowPrecisionRounding = Value.fromSats(200000);

  const oracleAnnouncement = OracleAnnouncementV0.deserialize(
    Buffer.from(
      'fdd824fd0344340d5e431a385a8bb3819c0410c749b2a11ae5bebdd363e2dc23af057c6cbd3fd097fffa8e6beef46cb02389fb6ef102d3653a281dda5ff0d6e3f4d42a14df6830bbf19aa3a986ed4e5640240b507901d6e03d6bbd71a281ed356a145516c655fdd822fd02de0015b4ced0696e0c7b8636b816e8742944cfd652f3366d659694add4d186da20f06e1750ce25afb96aee7aedbc5a3981b7e62a22baf768f94fe0ffd455cb6ccb4da1a07fadc76aada50705e583aa77b664f1217212d4537f9d5398630716cd26e5fcdba1a300388860a9f5feed894ca9d5caf9daffaca23f53fd46071f69007b286050e798293f7524223f1882667d5e282be7b09faada3179496630053a060c1af1d2c80d212dc871bf56a846a6b70cfca17b47d2fcb86e57cef165215f2a526cc40215c3c6002fbeb5f0a9d545379004fd108a8a5ee96ac0bd33d1495c609724e6554fe1bf90fe92e679df8883df6df9173e8c476b5e83493f55bf2e20e9c85acd21f7f710a9a380233fc28254077fb751c4ffbd5124639421cc05ae2e3886bbc29177c02ad5ab569b5a89c4dd5da2e131ab41ac4ce2347f5425230b8822198cd805047b1a35fa00cd3877fdc902857293f94fcad3f0e418448b0756e99ce6cc46d1a4cf8673823a89819a9bd9d4c3506975d37835a5310a1bee056887124b6d0fc0ae8974371e1e12e13d68f844878bd9fa51bfdb2455f6bb6c93e49998b37e4fa2b01ff31c665b16313015311007d624fe77df48ac69d8475ca06500d618fbff38ab6f50575d4b0fd3efe4fd6e561797070ec365ecda8a62e6dcb993b8eff16a2e5af7ad7b93cb6a028cdab351251e368c4f188d620ad86fa43886ee57f91be033feab89cd381c486b9cb9c102ae2d3d3cc15068ecb5e0822e8f5ff5a2faef2598308ec40acc4f122023722e8e6758034f98bb45136117154cb7690a2c04b9504a747ce3f69be7d29299462181fcf721d795233aacf010309af5b1709309cb5c2ceae7926ea0868b1c8a2573554284f86310d1df7ed82e6be49d417ec494da9f15f9fac757bdee7cb49c3e7fdcfabc28801bde8f90b90cf3eb37784bb91d9c35662b5f00fdd80a0e00020004626974730000000000152561746f6d69632d656e67696e652d6d6f6e74686c792d323646454232342d32364150523234',
      'hex',
    ),
  );

  describe('CsoInfo from linear curve message', () => {
    const { payoutFunction } = LinearPayout.buildPayoutFunction(
      minPayout,
      maxPayout,
      startOutcome,
      endOutcome,
      oracleBase,
      oracleDigits,
    );

    const dlcOffer = buildCsoDlcOfferFixture(
      oracleDigits,
      expiry,
      payoutFunction,
      maxPayout,
      offerCollateralValue,
    );

    const contractInfo = dlcOffer.contractInfo;

    it('should get correct CsoInfo from ContractInfo', () => {
      const csoInfo = getCsoInfoFromContractInfo(
        contractInfo,
        'neither',
        Value.fromSats(0),
        undefined,
        'v0',
      );

      expect(csoInfo).to.deep.equal({
        normalizedMaxGain: maxGain,
        normalizedMaxLoss: maxLoss,
        maxGainForContractSize,
        maxLossForContractSize,
        minPayout,
        maxPayout,
        contractSize,
        offerCollateral,
        totalCollateral,
        expiry,
      });
    });

    it('should get correct CsoInfo from ContractInfo', () => {
      const csoInfo = getCsoInfoFromOffer(dlcOffer, 'v0');

      expect(csoInfo).to.deep.equal({
        normalizedMaxGain: maxGain,
        normalizedMaxLoss: maxLoss,
        maxGainForContractSize,
        maxLossForContractSize,
        minPayout,
        maxPayout,
        contractSize,
        offerCollateral,
        totalCollateral,
        expiry,
      });
    });

    it('should throw if offerCollateralSatoshis does not match calculated offerCollateral', () => {
      const { payoutFunction } = LinearPayout.buildPayoutFunction(
        minPayout,
        maxPayout,
        startOutcome,
        endOutcome,
        oracleBase,
        oracleDigits,
      );

      const dlcOffer = buildCsoDlcOfferFixture(
        oracleDigits,
        expiry,
        payoutFunction,
        maxPayout,
        offerCollateralValue,
      );

      dlcOffer.offerCollateralSatoshis -= BigInt(10000);

      expect(() => getCsoInfoFromOffer(dlcOffer)).to.throw(Error);
    });

    it('should get correct CsoInfo from ContractInfo with fees shifted', () => {
      const contractSize = Value.fromBitcoin(1);

      const maxLoss = Value.fromBitcoin(0.2);
      const maxGain = Value.fromBitcoin(0.04);

      const feeRate = 10n;

      const highestPrecisionRounding = Value.fromSats(10000);
      const highPrecisionRounding = Value.fromSats(25000);
      const mediumPrecisionRounding = Value.fromSats(100000);
      const lowPrecisionRounding = Value.fromSats(200000);

      const roundingIntervals = buildRoundingIntervalsFromIntervals(
        contractSize,
        [
          { beginInterval: 0n, rounding: lowPrecisionRounding },
          { beginInterval: 750000n, rounding: mediumPrecisionRounding },
          { beginInterval: 850000n, rounding: highPrecisionRounding },
          { beginInterval: 950000n, rounding: highestPrecisionRounding },
        ],
      );

      const network = BitcoinNetworks.bitcoin;

      const shiftForFees: DlcParty = 'offeror';
      const fees = Value.fromSats(10000);

      const csoOrderOffer = buildCustomStrategyOrderOffer(
        oracleAnnouncement,
        contractSize,
        maxLoss,
        maxGain,
        feeRate,
        roundingIntervals,
        network,
        shiftForFees,
        fees,
      );

      const csoInfoFromContractInfo = getCsoInfoFromContractInfo(
        csoOrderOffer.contractInfo,
        shiftForFees,
        fees,
      );
      const csoInfoFromOffer = getCsoInfoFromOffer(csoOrderOffer);

      expect(csoInfoFromContractInfo.normalizedMaxGain.sats).to.equal(
        maxGain.sats,
      );
      expect(csoInfoFromContractInfo.normalizedMaxLoss.sats).to.equal(
        maxLoss.sats,
      );

      expect(csoInfoFromOffer.normalizedMaxGain.sats).to.equal(maxGain.sats);
      expect(csoInfoFromOffer.normalizedMaxLoss.sats).to.equal(maxLoss.sats);
    });

    it('should get correct ContractInfo with smaller max gain', () => {
      const contractSize = Value.fromBitcoin(1);

      const maxLoss = Value.fromBitcoin(0.95);
      const maxGain = Value.fromBitcoin(0.005);

      const feeRate = 10n;

      const highestPrecisionRounding = Value.fromSats(10000);
      const highPrecisionRounding = Value.fromSats(25000);
      const mediumPrecisionRounding = Value.fromSats(100000);
      const lowPrecisionRounding = Value.fromSats(200000);

      const roundingIntervals = buildRoundingIntervalsFromIntervals(
        contractSize,
        [
          { beginInterval: 0n, rounding: lowPrecisionRounding },
          { beginInterval: 750000n, rounding: mediumPrecisionRounding },
          { beginInterval: 850000n, rounding: highPrecisionRounding },
          { beginInterval: 950000n, rounding: highestPrecisionRounding },
        ],
      );

      const network = BitcoinNetworks.bitcoin;

      const shiftForFees: DlcParty = 'offeror';
      const fees = Value.fromSats(10000);

      const csoOrderOffer = buildCustomStrategyOrderOffer(
        oracleAnnouncement,
        contractSize,
        maxLoss,
        maxGain,
        feeRate,
        roundingIntervals,
        network,
        shiftForFees,
        fees,
      );

      const csoInfoFromContractInfo = getCsoInfoFromContractInfo(
        csoOrderOffer.contractInfo,
        shiftForFees,
        fees,
      );
      const csoInfoFromOffer = getCsoInfoFromOffer(csoOrderOffer);

      expect(csoInfoFromContractInfo.normalizedMaxGain.sats).to.equal(
        maxGain.sats,
      );
      expect(csoInfoFromContractInfo.normalizedMaxLoss.sats).to.equal(
        maxLoss.sats,
      );

      expect(csoInfoFromOffer.normalizedMaxGain.sats).to.equal(maxGain.sats);
      expect(csoInfoFromOffer.normalizedMaxLoss.sats).to.equal(maxLoss.sats);
    });

    it('should get correct CsoInfo from ContractInfo with fees shifted contract size 0.01', () => {
      const contractSize = Value.fromBitcoin(0.01);

      const maxLoss = Value.fromBitcoin(0.2);
      const maxGain = Value.fromBitcoin(0.04);

      const feeRate = 10n;

      const highestPrecisionRounding = Value.fromSats(10000);
      const highPrecisionRounding = Value.fromSats(25000);
      const mediumPrecisionRounding = Value.fromSats(100000);
      const lowPrecisionRounding = Value.fromSats(200000);

      const roundingIntervals = buildRoundingIntervalsFromIntervals(
        contractSize,
        [
          { beginInterval: 0n, rounding: lowPrecisionRounding },
          { beginInterval: 750000n, rounding: mediumPrecisionRounding },
          { beginInterval: 850000n, rounding: highPrecisionRounding },
          { beginInterval: 950000n, rounding: highestPrecisionRounding },
        ],
      );

      const network = BitcoinNetworks.bitcoin;

      const shiftForFees: DlcParty = 'neither';
      const fees = Value.fromSats(0);

      const csoOrderOffer = buildCustomStrategyOrderOffer(
        oracleAnnouncement,
        contractSize,
        maxLoss,
        maxGain,
        feeRate,
        roundingIntervals,
        network,
        shiftForFees,
        fees,
      );

      const csoInfoFromContractInfo = getCsoInfoFromContractInfo(
        csoOrderOffer.contractInfo,
        shiftForFees,
        fees,
      );
      const csoInfoFromOffer = getCsoInfoFromOffer(csoOrderOffer);

      expect(csoInfoFromContractInfo.normalizedMaxGain.sats).to.equal(
        maxGain.sats,
      );
      expect(csoInfoFromContractInfo.normalizedMaxLoss.sats).to.equal(
        maxLoss.sats,
      );

      expect(csoInfoFromOffer.normalizedMaxGain.sats).to.equal(maxGain.sats);
      expect(csoInfoFromOffer.normalizedMaxLoss.sats).to.equal(maxLoss.sats);
    });

    const fees = [0, 1116, 29384, 34, 245, 11293, 2223, 10410];
    const contractSizes = [0.01, 0.1, 0.5, 1, 2, 5, 10, 50];

    contractSizes.forEach((contractSizeNum) => {
      fees.forEach((fee) => {
        it(`should get correct CsoInfo from ContractInfo with fees shifted contract size ${contractSizeNum} and fee ${fee}`, () => {
          const contractSize = Value.fromBitcoin(contractSizeNum);

          // const eventDescriptor = new DigitDecompositionEventDescriptorV0();
          // eventDescriptor.base = 2;
          // eventDescriptor.isSigned = false;
          // eventDescriptor.unit = 'bits';
          // eventDescriptor.precision = 0;
          // eventDescriptor.nbDigits = oracleDigits;

          // const oracleEvent = new OracleEventV0();
          // oracleEvent.eventMaturityEpoch = Math.floor(expiry.getTime() / 1000);
          // oracleEvent.eventDescriptor = eventDescriptor;

          // const oracleAnnouncement = new OracleAnnouncementV0();
          // oracleAnnouncement.oracleEvent = oracleEvent;

          const maxLoss = Value.fromBitcoin(0.2);
          const maxGain = Value.fromBitcoin(0.04);

          const feeRate = 4n;

          const highestPrecisionRounding = Value.fromSats(10000);
          const highPrecisionRounding = Value.fromSats(25000);
          const mediumPrecisionRounding = Value.fromSats(100000);
          const lowPrecisionRounding = Value.fromSats(200000);

          const roundingIntervals = buildRoundingIntervalsFromIntervals(
            contractSize,
            [
              { beginInterval: 0n, rounding: lowPrecisionRounding },
              { beginInterval: 750000n, rounding: mediumPrecisionRounding },
              { beginInterval: 850000n, rounding: highPrecisionRounding },
              { beginInterval: 950000n, rounding: highestPrecisionRounding },
            ],
          );

          const network = BitcoinNetworks.bitcoin;

          const shiftForFees: DlcParty = 'acceptor';
          const fees = Value.fromSats(fee);

          const csoOrderOffer = buildCustomStrategyOrderOffer(
            oracleAnnouncement,
            contractSize,
            maxLoss,
            maxGain,
            feeRate,
            roundingIntervals,
            network,
            shiftForFees,
            fees,
          );

          const csoInfo = getCsoInfoFromOffer(csoOrderOffer);

          expect(csoInfo.normalizedMaxGain.sats).to.equal(maxGain.sats);
          expect(csoInfo.normalizedMaxLoss.sats).to.equal(maxLoss.sats);
        });
      });
    });
  });

  describe('validateCsoPayoutFunction', () => {
    it('should throw if event outcome is not an ascending line', () => {
      const startOutcome = 900000n;
      const endOutcome = 900000n;

      const { payoutFunction } = LinearPayout.buildPayoutFunction(
        minPayout,
        maxPayout,
        startOutcome,
        endOutcome,
        oracleBase,
        oracleDigits,
      );

      expect(() => validateCsoPayoutFunction(payoutFunction)).to.throw(Error);
    });
  });

  it('should throw if maxLoss to maxGain is not an ascending line', () => {
    const minPayout = 100000000n;
    const maxPayout = 100000000n;

    const { payoutFunction } = LinearPayout.buildPayoutFunction(
      minPayout,
      maxPayout,
      startOutcome,
      endOutcome,
      oracleBase,
      oracleDigits,
    );

    expect(() => validateCsoPayoutFunction(payoutFunction)).to.throw(Error);
  });

  it('should throw if Payout Function point outcome payout not continuous', () => {
    const { payoutFunction } = LinearPayout.buildPayoutFunction(
      minPayout,
      maxPayout,
      startOutcome,
      endOutcome,
      oracleBase,
      oracleDigits,
    );

    // Subtract 1 from outcomePayout to create gap in point outcome payout
    (payoutFunction.pieces[0]
      .payoutCurvePiece as PolynomialPayoutCurvePiece).points[1].outcomePayout -= BigInt(
      1,
    );

    expect(() => validateCsoPayoutFunction(payoutFunction)).to.throw(Error);
  });

  describe('CsoInfo collateral', () => {
    const oracleAnnouncement = OracleAnnouncementV0.deserialize(
      Buffer.from(
        'fdd824fd0344340d5e431a385a8bb3819c0410c749b2a11ae5bebdd363e2dc23af057c6cbd3fd097fffa8e6beef46cb02389fb6ef102d3653a281dda5ff0d6e3f4d42a14df6830bbf19aa3a986ed4e5640240b507901d6e03d6bbd71a281ed356a145516c655fdd822fd02de0015b4ced0696e0c7b8636b816e8742944cfd652f3366d659694add4d186da20f06e1750ce25afb96aee7aedbc5a3981b7e62a22baf768f94fe0ffd455cb6ccb4da1a07fadc76aada50705e583aa77b664f1217212d4537f9d5398630716cd26e5fcdba1a300388860a9f5feed894ca9d5caf9daffaca23f53fd46071f69007b286050e798293f7524223f1882667d5e282be7b09faada3179496630053a060c1af1d2c80d212dc871bf56a846a6b70cfca17b47d2fcb86e57cef165215f2a526cc40215c3c6002fbeb5f0a9d545379004fd108a8a5ee96ac0bd33d1495c609724e6554fe1bf90fe92e679df8883df6df9173e8c476b5e83493f55bf2e20e9c85acd21f7f710a9a380233fc28254077fb751c4ffbd5124639421cc05ae2e3886bbc29177c02ad5ab569b5a89c4dd5da2e131ab41ac4ce2347f5425230b8822198cd805047b1a35fa00cd3877fdc902857293f94fcad3f0e418448b0756e99ce6cc46d1a4cf8673823a89819a9bd9d4c3506975d37835a5310a1bee056887124b6d0fc0ae8974371e1e12e13d68f844878bd9fa51bfdb2455f6bb6c93e49998b37e4fa2b01ff31c665b16313015311007d624fe77df48ac69d8475ca06500d618fbff38ab6f50575d4b0fd3efe4fd6e561797070ec365ecda8a62e6dcb993b8eff16a2e5af7ad7b93cb6a028cdab351251e368c4f188d620ad86fa43886ee57f91be033feab89cd381c486b9cb9c102ae2d3d3cc15068ecb5e0822e8f5ff5a2faef2598308ec40acc4f122023722e8e6758034f98bb45136117154cb7690a2c04b9504a747ce3f69be7d29299462181fcf721d795233aacf010309af5b1709309cb5c2ceae7926ea0868b1c8a2573554284f86310d1df7ed82e6be49d417ec494da9f15f9fac757bdee7cb49c3e7fdcfabc28801bde8f90b90cf3eb37784bb91d9c35662b5f00fdd80a0e00020004626974730000000000152561746f6d69632d656e67696e652d6d6f6e74686c792d323646454232342d32364150523234',
        'hex',
      ),
    );

    const roundingIntervals = buildRoundingIntervalsFromIntervals(
      contractSize,
      [
        { beginInterval: 0n, rounding: lowPrecisionRounding },
        { beginInterval: 750000n, rounding: mediumPrecisionRounding },
        { beginInterval: 850000n, rounding: highPrecisionRounding },
        { beginInterval: 950000n, rounding: highestPrecisionRounding },
      ],
    );

    it.only('should', () => {
      const contractSize = Value.fromSats(7431401000);
      const collateral = Value.fromSats(7431401000);
      const numOfferInputs = 3;
      const numContracts = 1;

      const normalizedMaxGain = Value.fromBitcoin(0.005);
      const normalizedMaxLoss = Value.fromBitcoin(0.04);

      const feePerByte = BigInt(100);

      const shiftForFees: DlcParty = 'offeror'; // 'offeror pays network fees
      const fees = Value.fromSats(
        getFinalizerByCount(feePerByte, numOfferInputs, 1, numContracts)
          .offerFees,
      );

      const skipValidation = true;

      const csoOrderOffer = buildCustomStrategyOrderOffer(
        oracleAnnouncement,
        contractSize,
        normalizedMaxLoss,
        normalizedMaxGain,
        feePerByte,
        roundingIntervals,
        network,
        shiftForFees,
        fees,
        collateral,
        numOfferInputs,
        numContracts,
        skipValidation,
      );

      getCsoInfoFromOffer(csoOrderOffer, 'v1');
    });

    it('should get cso info from offer with contract size greater than collateral', () => {
      const contractSize = Value.fromBitcoin(0.03);
      const collateral = Value.fromBitcoin(0.01);
      const numOfferInputs = 3;
      const numContracts = 1;

      const normalizedMaxGain = Value.fromBitcoin(0.005);
      const normalizedMaxLoss = Value.fromBitcoin(0.04);

      const feePerByte = BigInt(100);

      const shiftForFees: DlcParty = 'offeror'; // 'offeror pays network fees
      const fees = Value.fromSats(
        getFinalizerByCount(feePerByte, numOfferInputs, 1, numContracts)
          .offerFees,
      );

      const skipValidation = false;

      const csoOrderOffer = buildCustomStrategyOrderOffer(
        oracleAnnouncement,
        contractSize,
        normalizedMaxLoss,
        normalizedMaxGain,
        feePerByte,
        roundingIntervals,
        network,
        shiftForFees,
        fees,
        collateral,
        numOfferInputs,
        numContracts,
        skipValidation,
      );

      getCsoInfoFromOffer(csoOrderOffer, 'v1');
    });

    it('should get cso info from offer with contract size equal to collateral with both v0 and v1', () => {
      const contractSize = Value.fromBitcoin(0.01);
      const collateral = Value.fromBitcoin(0.01);
      const numOfferInputs = 3;
      const numContracts = 1;

      const normalizedMaxGain = Value.fromBitcoin(0.005);
      const normalizedMaxLoss = Value.fromBitcoin(0.04);

      const feePerByte = BigInt(100);

      const shiftForFees: DlcParty = 'offeror'; // 'offeror pays network fees
      const fees = Value.fromSats(
        getFinalizerByCount(feePerByte, numOfferInputs, 1, numContracts)
          .offerFees,
      );

      const skipValidation = false;

      const csoOrderOffer = buildCustomStrategyOrderOffer(
        oracleAnnouncement,
        contractSize,
        normalizedMaxLoss,
        normalizedMaxGain,
        feePerByte,
        roundingIntervals,
        network,
        shiftForFees,
        fees,
        collateral,
        numOfferInputs,
        numContracts,
        skipValidation,
      );

      getCsoInfoFromOffer(csoOrderOffer, 'v0');
      getCsoInfoFromOffer(csoOrderOffer, 'v1');
    });

    describe('high leverage with high fees', () => {
      const contractSize = Value.fromBitcoin(0.36);
      const collateral = Value.fromBitcoin(0.02);
      const numOfferInputs = 5;
      const numContracts = 5;

      const normalizedMaxGain = Value.fromBitcoin(0.005);
      const normalizedMaxLoss = Value.fromBitcoin(0.04);

      const feePerByte = BigInt(450);

      const skipValidation = false;

      it('should build and decode shift for fees offeror', () => {
        const shiftForFees: DlcParty = 'offeror'; // 'offeror' pays network fees
        const fees = Value.fromSats(
          getFinalizerByCount(feePerByte, numOfferInputs, 3, numContracts)
            .acceptFees,
        );

        const csoOrderOffer = buildCustomStrategyOrderOffer(
          oracleAnnouncement,
          contractSize,
          normalizedMaxLoss,
          normalizedMaxGain,
          feePerByte,
          roundingIntervals,
          network,
          shiftForFees,
          fees,
          collateral,
          numOfferInputs,
          numContracts,
          skipValidation,
        );

        const {
          normalizedMaxGain: actualNormalizedMaxGain,
          normalizedMaxLoss: actualNormalizedMaxLoss,
          maxGainForContractSize: actualMaxGainForContractSize,
          maxLossForContractSize: actualMaxLossForContractSize,
          minPayout,
          maxPayout,
          contractSize: actualContractSize,
          offerCollateral: actualOfferCollateral,
          totalCollateral: actualTotalCollateral,
        } = getCsoInfoFromOffer(csoOrderOffer, 'v1');

        // Fees are very high, so use dust threshold for max gain
        const offerFees = Value.fromSats(
          getFinalizerByCount(feePerByte, numOfferInputs, 3, numContracts)
            .offerFees,
        );
        const expectedMaxGainForContractSize_ = offerFees.addn(
          Value.fromSats(dustThreshold(BigInt(feePerByte))),
        );
        const expectedMaxGainForContractSize = Value.fromSats(
          roundUpToNearestMultiplier(
            expectedMaxGainForContractSize_.sats,
            BigInt(100),
          ),
        );

        const expectedMaxLossForContractSize = Value.fromSats(
          roundUpToNearestMultiplier(
            (normalizedMaxLoss.sats * contractSize.sats) / BigInt(1e8),
            BigInt(100),
          ),
        );

        const expectedNormalizedMaxGain = Value.fromSats(
          roundDownToNearestMultiplier(
            (expectedMaxGainForContractSize.sats * BigInt(1e8)) /
              contractSize.sats,
            BigInt(100),
          ),
        );

        expect(actualMaxGainForContractSize.sats).to.equal(
          expectedMaxGainForContractSize.sats,
        );
        expect(actualMaxLossForContractSize.sats).to.equal(
          expectedMaxLossForContractSize.sats,
        );
        expect(actualNormalizedMaxLoss.sats).to.equal(normalizedMaxLoss.sats);
        expect(actualNormalizedMaxGain.sats).to.equal(
          expectedNormalizedMaxGain.sats,
        ); // TODO: Fix issue with this line
        expect(minPayout).to.equal(BigInt(121200));
        expect(maxPayout).to.equal(collateral.sats);
        expect(actualContractSize.sats).to.equal(contractSize.sats);
        expect(actualOfferCollateral.sats).to.equal(
          collateral.subn(expectedMaxGainForContractSize).sats,
        );
        expect(actualTotalCollateral.sats).to.equal(collateral.sats);
      });

      it('should build and decode shift for fees acceptor', () => {
        const shiftForFees: DlcParty = 'acceptor'; // 'acceptor' pays network fees
        const fees = Value.fromSats(
          getFinalizerByCount(feePerByte, numOfferInputs, 3, numContracts)
            .offerFees,
        );

        const csoOrderOffer = buildCustomStrategyOrderOffer(
          oracleAnnouncement,
          contractSize,
          normalizedMaxLoss,
          normalizedMaxGain,
          feePerByte,
          roundingIntervals,
          network,
          shiftForFees,
          fees,
          collateral,
          numOfferInputs,
          numContracts,
          skipValidation,
        );

        const {
          normalizedMaxGain: actualNormalizedMaxGain,
          normalizedMaxLoss: actualNormalizedMaxLoss,
          maxGainForContractSize: actualMaxGainForContractSize,
          maxLossForContractSize: actualMaxLossForContractSize,
          minPayout,
          maxPayout,
          contractSize: actualContractSize,
          offerCollateral: actualOfferCollateral,
          totalCollateral: actualTotalCollateral,
        } = getCsoInfoFromOffer(csoOrderOffer, 'v1');

        // Fees are very high, so use dust threshold for max gain
        const offerFees = Value.fromSats(
          getFinalizerByCount(feePerByte, numOfferInputs, 3, numContracts)
            .offerFees,
        );
        const expectedMaxGainForContractSize_ = offerFees.addn(
          Value.fromSats(dustThreshold(BigInt(feePerByte))),
        );
        const expectedMaxGainForContractSize = Value.fromSats(
          roundUpToNearestMultiplier(
            expectedMaxGainForContractSize_.sats,
            BigInt(100),
          ),
        );

        const expectedMaxLossForContractSize = Value.fromSats(
          roundUpToNearestMultiplier(
            (normalizedMaxLoss.sats * contractSize.sats) / BigInt(1e8),
            BigInt(100),
          ),
        );

        const expectedNormalizedMaxGain = Value.fromSats(
          roundDownToNearestMultiplier(
            (expectedMaxGainForContractSize.sats * BigInt(1e8)) /
              contractSize.sats,
            BigInt(100),
          ),
        );

        expect(actualNormalizedMaxGain.sats).to.equal(
          expectedNormalizedMaxGain.sats,
        );
        expect(actualNormalizedMaxLoss.sats).to.equal(normalizedMaxLoss.sats);
        expect(actualMaxGainForContractSize.sats).to.equal(
          expectedMaxGainForContractSize.sats,
        );
        expect(actualMaxLossForContractSize.sats).to.equal(
          expectedMaxLossForContractSize.sats,
        );
        expect(minPayout).to.equal(BigInt(121200));
        expect(maxPayout).to.equal(collateral.sats);
        expect(actualContractSize.sats).to.equal(contractSize.sats);
        expect(actualOfferCollateral.sats).to.equal(
          collateral.subn(expectedMaxGainForContractSize).sats,
        );
        expect(actualTotalCollateral.sats).to.equal(collateral.sats);
      });

      it('should build and decode shift for fees neither', () => {
        const shiftForFees: DlcParty = 'neither'; // both parties pay their fair share for network fees
        const fees = Value.fromSats(
          getFinalizerByCount(feePerByte, numOfferInputs, 3, numContracts)
            .offerFees,
        );

        const csoOrderOffer = buildCustomStrategyOrderOffer(
          oracleAnnouncement,
          contractSize,
          normalizedMaxLoss,
          normalizedMaxGain,
          feePerByte,
          roundingIntervals,
          network,
          shiftForFees,
          fees,
          collateral,
          numOfferInputs,
          numContracts,
          skipValidation,
        );

        const {
          normalizedMaxGain: actualNormalizedMaxGain,
          normalizedMaxLoss: actualNormalizedMaxLoss,
          maxGainForContractSize: actualMaxGainForContractSize,
          maxLossForContractSize: actualMaxLossForContractSize,
          minPayout,
          maxPayout,
          contractSize: actualContractSize,
          offerCollateral: actualOfferCollateral,
          totalCollateral: actualTotalCollateral,
        } = getCsoInfoFromOffer(csoOrderOffer, 'v1');

        // Fees are very high, so use dust threshold for max gain
        const offerFees = Value.fromSats(
          getFinalizerByCount(feePerByte, numOfferInputs, 3, numContracts)
            .offerFees,
        );
        const expectedMaxGainForContractSize_ = offerFees.addn(
          Value.fromSats(dustThreshold(BigInt(feePerByte))),
        );
        const expectedMaxGainForContractSize = Value.fromSats(
          roundUpToNearestMultiplier(
            expectedMaxGainForContractSize_.sats,
            BigInt(100),
          ),
        );

        const expectedMaxLossForContractSize = Value.fromSats(
          roundUpToNearestMultiplier(
            (normalizedMaxLoss.sats * contractSize.sats) / BigInt(1e8),
            BigInt(100),
          ),
        );

        const expectedNormalizedMaxGain = Value.fromSats(
          roundDownToNearestMultiplier(
            (expectedMaxGainForContractSize.sats * BigInt(1e8)) /
              contractSize.sats,
            BigInt(100),
          ),
        );

        expect(actualNormalizedMaxGain.sats).to.equal(
          expectedNormalizedMaxGain.sats,
        );
        expect(actualNormalizedMaxLoss.sats).to.equal(normalizedMaxLoss.sats);
        expect(actualMaxGainForContractSize.sats).to.equal(
          expectedMaxGainForContractSize.sats,
        );
        expect(actualMaxLossForContractSize.sats).to.equal(
          expectedMaxLossForContractSize.sats,
        );
        expect(minPayout).to.equal(BigInt(121200));
        expect(maxPayout).to.equal(collateral.sats);
        expect(actualContractSize.sats).to.equal(contractSize.sats);
        expect(actualOfferCollateral.sats).to.equal(
          collateral.subn(expectedMaxGainForContractSize).sats,
        );
        expect(actualTotalCollateral.sats).to.equal(collateral.sats);
      });
    });

    describe('high leverage with low fees', () => {
      const contractSize = Value.fromBitcoin(0.36);
      const collateral = Value.fromBitcoin(0.02);
      const numOfferInputs = 5;
      const numContracts = 5;

      const normalizedMaxGain = Value.fromBitcoin(0.005);
      const normalizedMaxLoss = Value.fromBitcoin(0.04);

      const feePerByte = BigInt(50);

      const skipValidation = false;

      it('should build and decode shift for fees offeror', () => {
        const shiftForFees: DlcParty = 'offeror'; // 'offeror' pays network fees
        const fees = Value.fromSats(
          getFinalizerByCount(feePerByte, numOfferInputs, 3, numContracts)
            .acceptFees,
        );

        const csoOrderOffer = buildCustomStrategyOrderOffer(
          oracleAnnouncement,
          contractSize,
          normalizedMaxLoss,
          normalizedMaxGain,
          feePerByte,
          roundingIntervals,
          network,
          shiftForFees,
          fees,
          collateral,
          numOfferInputs,
          numContracts,
          skipValidation,
        );

        const {
          normalizedMaxGain: actualNormalizedMaxGain,
          normalizedMaxLoss: actualNormalizedMaxLoss,
          maxGainForContractSize: actualMaxGainForContractSize,
          maxLossForContractSize: actualMaxLossForContractSize,
          minPayout,
          maxPayout,
          contractSize: actualContractSize,
          offerCollateral: actualOfferCollateral,
          totalCollateral: actualTotalCollateral,
        } = getCsoInfoFromOffer(csoOrderOffer, 'v1');

        const expectedMaxGainForContractSize = Value.fromSats(
          roundUpToNearestMultiplier(
            (normalizedMaxGain.sats * contractSize.sats) / BigInt(1e8),
            BigInt(100),
          ),
        );

        const expectedMaxLossForContractSize = Value.fromSats(
          roundUpToNearestMultiplier(
            (normalizedMaxLoss.sats * contractSize.sats) / BigInt(1e8),
            BigInt(100),
          ),
        );

        const expectedNormalizedMaxGain = Value.fromSats(
          roundUpToNearestMultiplier(
            (expectedMaxGainForContractSize.sats * BigInt(1e8)) /
              contractSize.sats,
            BigInt(100),
          ),
        );

        expect(actualNormalizedMaxGain.sats).to.equal(
          expectedNormalizedMaxGain.sats,
        );
        expect(actualNormalizedMaxLoss.sats).to.equal(normalizedMaxLoss.sats);
        expect(actualMaxGainForContractSize.sats).to.equal(
          expectedMaxGainForContractSize.sats,
        );
        expect(actualMaxLossForContractSize.sats).to.equal(
          expectedMaxLossForContractSize.sats,
        );
        expect(minPayout).to.equal(BigInt(380000));
        expect(maxPayout).to.equal(collateral.sats);
        expect(actualContractSize.sats).to.equal(contractSize.sats);
        expect(actualOfferCollateral.sats).to.equal(
          collateral.subn(expectedMaxGainForContractSize).sats,
        );
        expect(actualTotalCollateral.sats).to.equal(collateral.sats);
      });

      it('should build and decode shift for fees acceptor', () => {
        const shiftForFees: DlcParty = 'acceptor'; // 'acceptor' pays network fees
        const fees = Value.fromSats(
          getFinalizerByCount(feePerByte, numOfferInputs, 3, numContracts)
            .offerFees,
        );

        const csoOrderOffer = buildCustomStrategyOrderOffer(
          oracleAnnouncement,
          contractSize,
          normalizedMaxLoss,
          normalizedMaxGain,
          feePerByte,
          roundingIntervals,
          network,
          shiftForFees,
          fees,
          collateral,
          numOfferInputs,
          numContracts,
          skipValidation,
        );

        const {
          normalizedMaxGain: actualNormalizedMaxGain,
          normalizedMaxLoss: actualNormalizedMaxLoss,
          maxGainForContractSize: actualMaxGainForContractSize,
          maxLossForContractSize: actualMaxLossForContractSize,
          minPayout,
          maxPayout,
          contractSize: actualContractSize,
          offerCollateral: actualOfferCollateral,
          totalCollateral: actualTotalCollateral,
        } = getCsoInfoFromOffer(csoOrderOffer, 'v1');

        const expectedMaxGainForContractSize = Value.fromSats(
          roundUpToNearestMultiplier(
            (normalizedMaxGain.sats * contractSize.sats) / BigInt(1e8),
            BigInt(100),
          ),
        );

        const expectedMaxLossForContractSize = Value.fromSats(
          roundUpToNearestMultiplier(
            (normalizedMaxLoss.sats * contractSize.sats) / BigInt(1e8),
            BigInt(100),
          ),
        );

        const expectedNormalizedMaxGain = Value.fromSats(
          roundUpToNearestMultiplier(
            (expectedMaxGainForContractSize.sats * BigInt(1e8)) /
              contractSize.sats,
            BigInt(100),
          ),
        );

        expect(actualNormalizedMaxGain.sats).to.equal(
          expectedNormalizedMaxGain.sats,
        );
        expect(actualNormalizedMaxLoss.sats).to.equal(normalizedMaxLoss.sats);
        expect(actualMaxGainForContractSize.sats).to.equal(
          expectedMaxGainForContractSize.sats,
        );
        expect(actualMaxLossForContractSize.sats).to.equal(
          expectedMaxLossForContractSize.sats,
        );
        expect(minPayout).to.equal(BigInt(380000));
        expect(maxPayout).to.equal(collateral.sats);
        expect(actualContractSize.sats).to.equal(contractSize.sats);
        expect(actualOfferCollateral.sats).to.equal(
          collateral.subn(expectedMaxGainForContractSize).sats,
        );
        expect(actualTotalCollateral.sats).to.equal(collateral.sats);
      });

      it('should build and decode shift for fees neither', () => {
        const shiftForFees: DlcParty = 'neither'; // both parties pay their fair share for network fees
        const fees = Value.fromSats(
          getFinalizerByCount(feePerByte, numOfferInputs, 3, numContracts)
            .offerFees,
        );

        const csoOrderOffer = buildCustomStrategyOrderOffer(
          oracleAnnouncement,
          contractSize,
          normalizedMaxLoss,
          normalizedMaxGain,
          feePerByte,
          roundingIntervals,
          network,
          shiftForFees,
          fees,
          collateral,
          numOfferInputs,
          numContracts,
          skipValidation,
        );

        const {
          normalizedMaxGain: actualNormalizedMaxGain,
          normalizedMaxLoss: actualNormalizedMaxLoss,
          maxGainForContractSize: actualMaxGainForContractSize,
          maxLossForContractSize: actualMaxLossForContractSize,
          minPayout,
          maxPayout,
          contractSize: actualContractSize,
          offerCollateral: actualOfferCollateral,
          totalCollateral: actualTotalCollateral,
        } = getCsoInfoFromOffer(csoOrderOffer, 'v1');

        const expectedMaxGainForContractSize = Value.fromSats(
          roundUpToNearestMultiplier(
            (normalizedMaxGain.sats * contractSize.sats) / BigInt(1e8),
            BigInt(100),
          ),
        );

        const expectedMaxLossForContractSize = Value.fromSats(
          roundUpToNearestMultiplier(
            (normalizedMaxLoss.sats * contractSize.sats) / BigInt(1e8),
            BigInt(100),
          ),
        );

        const expectedNormalizedMaxGain = Value.fromSats(
          roundUpToNearestMultiplier(
            (expectedMaxGainForContractSize.sats * BigInt(1e8)) /
              contractSize.sats,
            BigInt(100),
          ),
        );

        expect(actualNormalizedMaxGain.sats).to.equal(
          expectedNormalizedMaxGain.sats,
        );
        expect(actualNormalizedMaxLoss.sats).to.equal(normalizedMaxLoss.sats);
        expect(actualMaxGainForContractSize.sats).to.equal(
          expectedMaxGainForContractSize.sats,
        );
        expect(actualMaxLossForContractSize.sats).to.equal(
          expectedMaxLossForContractSize.sats,
        );
        expect(minPayout).to.equal(BigInt(380000));
        expect(maxPayout).to.equal(collateral.sats);
        expect(actualContractSize.sats).to.equal(contractSize.sats);
        expect(actualOfferCollateral.sats).to.equal(
          collateral.subn(expectedMaxGainForContractSize).sats,
        );
        expect(actualTotalCollateral.sats).to.equal(collateral.sats);
      });
    });
  });
});
