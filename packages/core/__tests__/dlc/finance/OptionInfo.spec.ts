import {
  ContractDescriptorV1,
  ContractInfoV0,
  DigitDecompositionEventDescriptorV0,
  DlcOfferV0,
  HyperbolaPayoutCurvePiece,
  OracleAnnouncementV0,
  OracleEventV0,
  OracleInfoV0,
  RoundingIntervalsV0,
} from '@node-dlc/messaging';
import { expect } from 'chai';
import { CoveredCall } from '../../../lib/dlc/finance/CoveredCall';
import {
  getOptionInfoFromContractInfo,
  getOptionInfoFromOffer,
} from '../../../lib/dlc/finance/OptionInfo';

describe('OptionInfo', () => {
  describe('OptionInfo from covered call messages', () => {
    const strikePrice = 50000n;
    const contractSize = 10n ** 8n;
    const premium = 50000n;
    const expiry = new Date(1620014750000);

    const oracleBase = 2;
    const oracleDigits = 17;

    const { totalCollateral, payoutFunction } = CoveredCall.buildPayoutFunction(
      strikePrice,
      contractSize,
      oracleBase,
      oracleDigits,
    );

    const oracleEvent = new OracleEventV0();
    oracleEvent.eventMaturityEpoch = Math.floor(expiry.getTime() / 1000);

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

    it('should get correct OptionInfo from ContractInfo', () => {
      const optionInfo = getOptionInfoFromContractInfo(contractInfo);

      expect(optionInfo).to.deep.equal({
        contractSize,
        strikePrice,
        expiry,
      });
    });

    it('should get correct OptionInfoWithPremium from DlcOffer', () => {
      const optionInfo = getOptionInfoFromOffer(dlcOffer);

      expect(optionInfo).to.deep.equal({
        contractSize,
        strikePrice,
        expiry,
        premium,
      });
    });
  });
});
