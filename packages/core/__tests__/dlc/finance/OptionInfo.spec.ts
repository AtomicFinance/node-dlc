import { F64 } from '@node-dlc/messaging';
import {
  DigitDecompositionEventDescriptorV0,
  DlcOffer,
  HyperbolaPayoutCurvePiece,
  NumericalDescriptor,
  OracleAnnouncement,
  OracleEvent,
  PayoutFunction,
  SingleContractInfo,
  SingleOracleInfo,
} from '@node-dlc/messaging';
import { expect } from 'chai';

import { CoveredCall } from '../../../lib/dlc/finance/CoveredCall';
import {
  getOptionInfoFromContractInfo,
  getOptionInfoFromOffer,
} from '../../../lib/dlc/finance/OptionInfo';
import { ShortPut } from '../../../lib/dlc/finance/ShortPut';

describe('OptionInfo', () => {
  describe('OptionInfo from covered call messages', () => {
    const strikePrice = BigInt(50000);
    const contractSize = BigInt(10) ** BigInt(8);
    const premium = BigInt(50000);
    const expiry = new Date(1620014750000);

    const oracleBase = 2;
    const oracleDigits = 17;

    const { totalCollateral, payoutFunction } = CoveredCall.buildPayoutFunction(
      strikePrice,
      contractSize,
      oracleBase,
      oracleDigits,
    );

    const dlcOffer = buildDlcOfferFixture(
      oracleDigits,
      expiry,
      payoutFunction,
      totalCollateral,
      premium,
    );

    const contractInfo = dlcOffer.contractInfo;

    it('should get correct OptionInfo from ContractInfo', () => {
      const optionInfo = getOptionInfoFromContractInfo(contractInfo);

      expect(optionInfo).to.deep.equal({
        contractSize,
        strikePrice,
        expiry,
        type: 'call',
      });
    });

    it('should get correct OptionInfoWithPremium from DlcOffer', () => {
      const optionInfo = getOptionInfoFromOffer(dlcOffer);

      expect(optionInfo).to.deep.equal({
        contractSize,
        strikePrice,
        expiry,
        premium,
        type: 'call',
      });
    });

    it('should throw on an invalid curve', () => {
      const {
        totalCollateral,
        payoutFunction,
      } = CoveredCall.buildPayoutFunction(
        strikePrice,
        contractSize,
        oracleBase,
        oracleDigits,
      );

      const invalidDlcOffer = buildDlcOfferFixture(
        oracleDigits,
        expiry,
        payoutFunction,
        totalCollateral,
        premium,
      );

      const contractInfo = invalidDlcOffer.contractInfo as SingleContractInfo;
      const contractDescriptor = contractInfo.contractDescriptor as NumericalDescriptor;
      const payoutFunc = contractDescriptor.payoutFunction as PayoutFunction;
      const hyperbolaPiece = payoutFunc.payoutFunctionPieces[0]
        .payoutCurvePiece as HyperbolaPayoutCurvePiece;

      hyperbolaPiece.translateOutcome = F64.fromNumber(4);

      expect(() => {
        getOptionInfoFromOffer(invalidDlcOffer);
      }).to.throw();
    });
  });

  describe('OptionInfo from short call messages', () => {
    const strikePrice = BigInt(50000);
    const contractSize = BigInt(10) ** BigInt(8);
    const totalCollateral = BigInt(9) ** BigInt(8);

    const premium = BigInt(50000);
    const expiry = new Date(1620014750000);

    const oracleBase = 2;
    const oracleDigits = 17;

    const { payoutFunction } = ShortPut.buildPayoutFunction(
      strikePrice,
      contractSize,
      totalCollateral,
      oracleBase,
      oracleDigits,
    );

    const dlcOffer = buildDlcOfferFixture(
      oracleDigits,
      expiry,
      payoutFunction,
      totalCollateral,
      premium,
    );

    const contractInfo = dlcOffer.contractInfo;

    it('should get correct OptionInfo from ContractInfo', () => {
      const optionInfo = getOptionInfoFromContractInfo(contractInfo);

      expect(optionInfo).to.deep.equal({
        contractSize,
        strikePrice,
        expiry,
        type: 'put',
      });
    });

    it('should get correct OptionInfoWithPremium from DlcOffer', () => {
      const optionInfo = getOptionInfoFromOffer(dlcOffer);

      expect(optionInfo).to.deep.equal({
        contractSize,
        strikePrice,
        expiry,
        premium,
        type: 'put',
      });
    });

    it('should throw on an invalid curve', () => {
      const { payoutFunction } = ShortPut.buildPayoutFunction(
        strikePrice,
        contractSize,
        totalCollateral,
        oracleBase,
        oracleDigits,
      );

      const invalidDlcOffer = buildDlcOfferFixture(
        oracleDigits,
        expiry,
        payoutFunction,
        totalCollateral,
        premium,
      );

      const contractInfo = invalidDlcOffer.contractInfo as SingleContractInfo;
      const contractDescriptor = contractInfo.contractDescriptor as NumericalDescriptor;
      const payoutFunc = contractDescriptor.payoutFunction as PayoutFunction;
      const hyperbolaPiece = payoutFunc.payoutFunctionPieces[0]
        .payoutCurvePiece as HyperbolaPayoutCurvePiece;

      hyperbolaPiece.translateOutcome = F64.fromNumber(4);

      expect(() => {
        getOptionInfoFromOffer(invalidDlcOffer);
      }).to.throw();
    });
  });
});

function buildDlcOfferFixture(
  oracleDigits: number,
  expiry: Date,
  payoutFunction: PayoutFunction,
  totalCollateral: bigint,
  premium: bigint,
) {
  const eventDescriptor = new DigitDecompositionEventDescriptorV0();
  eventDescriptor.base = 2;
  eventDescriptor.isSigned = false;
  eventDescriptor.unit = 'BTC-USD';
  eventDescriptor.precision = 0;
  eventDescriptor.nbDigits = oracleDigits;

  const oracleEvent = new OracleEvent();
  oracleEvent.eventMaturityEpoch = Math.floor(expiry.getTime() / 1000);
  oracleEvent.eventDescriptor = eventDescriptor;

  const oracleAnnouncement = new OracleAnnouncement();
  oracleAnnouncement.oracleEvent = oracleEvent;

  const oracleInfo = new SingleOracleInfo();
  oracleInfo.announcement = oracleAnnouncement;

  const contractDescriptor = new NumericalDescriptor();
  contractDescriptor.numDigits = oracleDigits;
  contractDescriptor.payoutFunction = payoutFunction;

  const contractInfo = new SingleContractInfo();
  contractInfo.totalCollateral = totalCollateral;
  contractInfo.contractDescriptor = contractDescriptor;
  contractInfo.oracleInfo = oracleInfo;

  const dlcOffer = new DlcOffer();
  dlcOffer.contractInfo = contractInfo;
  dlcOffer.offerCollateral = totalCollateral - premium;
  return dlcOffer;
}
