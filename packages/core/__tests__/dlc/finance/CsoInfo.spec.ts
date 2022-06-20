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
import { Value } from '@node-lightning/bitcoin';
import { expect } from 'chai';

import { LinearPayout } from '../../../lib';
import {
  getCsoInfoFromContractInfo,
  getCsoInfoFromOffer,
  validateCsoPayoutFunction,
} from '../../../lib/dlc/finance/CsoInfo';

const buildCsoDlcOfferFixture = (
  oracleDigits: number,
  expiry: Date,
  payoutFunction: PayoutFunctionV0,
  totalCollateral: bigint,
  offerCollateral: bigint,
): DlcOfferV0 => {
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

  const contractSize = Value.fromBitcoin(1);
  const offerCollateral = Value.fromBitcoin(0.8);

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
      const csoInfo = getCsoInfoFromContractInfo(contractInfo);

      expect(csoInfo).to.deep.equal({
        maxGain,
        maxLoss,
        minPayout,
        maxPayout,
        contractSize,
        offerCollateral,
      });
    });

    it('should get correct CsoInfo from ContractInfo', () => {
      const csoInfo = getCsoInfoFromOffer(dlcOffer);

      expect(csoInfo).to.deep.equal({
        maxGain,
        maxLoss,
        minPayout,
        maxPayout,
        contractSize,
        offerCollateral,
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
});
