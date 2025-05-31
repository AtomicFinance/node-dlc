import {
  ContractDescriptorV1,
  ContractInfoV0,
  DigitDecompositionEventDescriptorV0,
  DlcOfferV0,
  HyperbolaPayoutCurvePiece,
  MessageType,
  OracleAnnouncementV0,
  OracleEventV0,
  OracleInfoV0,
  PayoutFunctionV0,
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

      ((((invalidDlcOffer.contractInfo as ContractInfoV0)
        .contractDescriptor as ContractDescriptorV1)
        .payoutFunction as PayoutFunctionV0).pieces[0]
        .payoutCurvePiece as HyperbolaPayoutCurvePiece).translateOutcome = BigInt(
        4,
      );

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

      ((((invalidDlcOffer.contractInfo as ContractInfoV0)
        .contractDescriptor as ContractDescriptorV1)
        .payoutFunction as PayoutFunctionV0).pieces[0]
        .payoutCurvePiece as HyperbolaPayoutCurvePiece).translateOutcome = BigInt(
        4,
      );

      expect(() => {
        getOptionInfoFromOffer(invalidDlcOffer);
      }).to.throw();
    });
  });
});

function buildDlcOfferFixture(
  oracleDigits: number,
  expiry: Date,
  payoutFunction: PayoutFunctionV0,
  totalCollateral: bigint,
  premium: bigint,
) {
  const eventDescriptor = new DigitDecompositionEventDescriptorV0();
  eventDescriptor.base = 2;
  eventDescriptor.isSigned = false;
  eventDescriptor.unit = 'BTC-USD';
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
  dlcOffer.offerCollateralSatoshis = totalCollateral - premium;
  return dlcOffer;
}
