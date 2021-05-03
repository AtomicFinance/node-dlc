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
  getOptionInfoFromDlcOffer,
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

    const eventDescriptor = new DigitDecompositionEventDescriptorV0();
    eventDescriptor.base = 2;
    eventDescriptor.isSigned = false;
    eventDescriptor.unit = 'BTC-USD';
    eventDescriptor.precision = 0;
    eventDescriptor.nbDigits = oracleDigits;

    const oracleEvent = new OracleEventV0();
    oracleEvent.oracleNonces = [
      Buffer.from(
        '86abd0a6bfd4eb3c922942b2b9dc73bde7c9dd8c7aa99002a8163c2e4b38cd62',
        'hex',
      ),
      Buffer.from(
        '892bd4e9e6721212f7564d6852d61079ee91e6ec34be9ac82d372ab95a30843b',
        'hex',
      ),
      Buffer.from(
        '51803a36bc1f730c4c98d4c42670e4032dddd95a3c1652b2605b6da4a183b557',
        'hex',
      ),
      Buffer.from(
        'f2251ae87c0e2beb60c446a7bddb6a5fc2f8a40f4f6654debe1cfea1c10cda60',
        'hex',
      ),
      Buffer.from(
        '8241d2e6ee7c8461dc97819388f70194288d971bdd1fb33ceecc3b385231e109',
        'hex',
      ),
      Buffer.from(
        'f40acbd8eb1f991af7a6cdecfb4ee55bc0c0cc0b0e57fd25c0806f527090b9f0',
        'hex',
      ),
      Buffer.from(
        'd1e1a0bdf4b77e51cd3cdf48ddcd4eacfe470093cf5c6d4efc6378c2707768ba',
        'hex',
      ),
      Buffer.from(
        'db378b479adcc1e8a2d9529660de84a83f670f10a1b132802475ab25e930bfe1',
        'hex',
      ),
      Buffer.from(
        'cc464acf38acf689392e2a42a285293dbc1508fd068ff71773af1aa9ba745035',
        'hex',
      ),
      Buffer.from(
        '22b35d2f0c8c57e3a05b1b3302184c04a13d993182e3b16164cd8aec8654f2e2',
        'hex',
      ),
      Buffer.from(
        'b86687fbdde1916777de543456ad0ca8b1fd53bd8bb27c63c4f8f2b8515266e6',
        'hex',
      ),
      Buffer.from(
        '3c1557ff94451f7f39a8813b4745da1a96e6557bf342b3673af227b868fea945',
        'hex',
      ),
      Buffer.from(
        '42d08251205359fda89476e54b6ca32cd2ffbcf114ca0054e8c2d3c75937fd12',
        'hex',
      ),
      Buffer.from(
        '1775f577eb78fcd6a2473fcc924b38f0131771acc43e0372393385cb16e2bb7b',
        'hex',
      ),
      Buffer.from(
        '0757f00df962a4cad733650fe954c0435beed69f660a1b0ad94cdbbe0b832c34',
        'hex',
      ),
      Buffer.from(
        '726fd163999a9696eaac31bc1fb9c3a09111afe01e48f1426febb145a4880bb2',
        'hex',
      ),
      Buffer.from(
        'aef72be43d1b240db3b26fa668f3c28fe9d929cfa5183501ee2c4797029c39a6',
        'hex',
      ),
    ];
    oracleEvent.eventMaturityEpoch = Math.floor(expiry.getTime() / 1000);
    oracleEvent.eventDescriptor = eventDescriptor;
    oracleEvent.eventId = 'btc/usd';

    const oracleAnnouncement = new OracleAnnouncementV0();
    oracleAnnouncement.announcementSig = Buffer.from(
      '86abd0a6bfd4eb3c922942b2b9dc73bde7c9dd8c7aa99002a8163c2e4b38cd62dec932dab7eaf0327464a70baa62af80e3a9f7338a2e99ef4ed8a5af264e36e2',
      'hex',
    );
    oracleAnnouncement.oraclePubkey = Buffer.from(
      'd2e95c66de1c365bfce6d8fcc31895bf3c2e77e7298c98e7ceadd0abaf8ee334',
      'hex',
    );
    oracleAnnouncement.oracleEvent = oracleEvent;

    const oracleInfo = new OracleInfoV0();
    oracleInfo.announcement = oracleAnnouncement;

    const intervals = [{ beginInterval: 0n, roundingMod: 500n }];
    const roundingIntervals = new RoundingIntervalsV0();
    roundingIntervals.intervals = intervals;

    const contractDescriptor = new ContractDescriptorV1();
    contractDescriptor.numDigits = oracleDigits;
    contractDescriptor.payoutFunction = payoutFunction;
    contractDescriptor.roundingIntervals = roundingIntervals;

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
      const optionInfo = getOptionInfoFromDlcOffer(dlcOffer);

      expect(optionInfo).to.deep.equal({
        contractSize,
        strikePrice,
        expiry,
        premium,
      });
    });
  });
});
