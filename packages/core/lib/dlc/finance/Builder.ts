import {
  ContractDescriptorV1,
  ContractInfoV0,
  DigitDecompositionEventDescriptorV0,
  MessageType,
  OracleAnnouncementV0,
  OracleInfoV0,
  OrderOfferV0,
  PayoutFunctionV0,
  RoundingIntervalsV0,
} from '@node-dlc/messaging';
import { BitcoinNetworks, chainHashFromNetwork } from 'bitcoin-networks';

import { CoveredCall } from './CoveredCall';
import { ShortPut } from './ShortPut';

export const buildCoveredCallOrderOffer = (
  announcement: OracleAnnouncementV0,
  contractSize: number,
  strikePrice: number,
  premium: number,
  feePerByte: number,
  rounding: number,
  network: string,
): OrderOfferV0 => {
  return buildOrderOffer(
    announcement,
    contractSize,
    strikePrice,
    premium,
    feePerByte,
    rounding,
    network,
    'call',
  );
};

export const buildShortPutOrderOffer = (
  announcement: OracleAnnouncementV0,
  contractSize: number,
  strikePrice: number,
  totalCollateral: number,
  premium: number,
  feePerByte: number,
  rounding: number,
  network: string,
): OrderOfferV0 => {
  return buildOrderOffer(
    announcement,
    contractSize,
    strikePrice,
    premium,
    feePerByte,
    rounding,
    network,
    'put',
    totalCollateral,
  );
};

/**
 * Compute rounding intervals for a covered call
 *
 * @param rounding
 * @param contractSize
 * @returns
 */
export const computeRoundingModulus = (
  rounding: number,
  contractSize: number,
): bigint => BigInt(Math.floor(rounding * (contractSize / 1e8)));

/**
 * Builds an order offer for a covered call or short put
 *
 * @param announcement oracle announcement
 * @param contractSize contract size in satoshis
 * @param strikePrice strike price of contract
 * @param premium premium of contract in satoshis
 * @param feePerByte
 * @param expiration expiration of contract in UNIX timestamp
 * @param rounding rounding interval
 * @param network bitcoin network type
 * @param type call or put
 * @param _totalCollateral total collateral in satoshis (applicable only for short put)
 * @returns
 */
export const buildOrderOffer = (
  announcement: OracleAnnouncementV0,
  contractSize: number,
  strikePrice: number,
  premium: number,
  feePerByte: number,
  rounding: number,
  network: string,
  type: 'call' | 'put',
  _totalCollateral?: number,
): OrderOfferV0 => {
  if (
    announcement.oracleEvent.eventDescriptor.type !==
    MessageType.DigitDecompositionEventDescriptorV0
  )
    throw Error('Only DigitDecompositionEventDescriptorV0 currently supported');

  const eventDescriptor = announcement.oracleEvent
    .eventDescriptor as DigitDecompositionEventDescriptorV0;

  let totalCollateral: bigint;
  let payoutFunctionInfo: {
    payoutFunction: PayoutFunctionV0;
    totalCollateral?: bigint;
  };
  const roundingIntervals = new RoundingIntervalsV0();
  const roundingMod = computeRoundingModulus(rounding, contractSize);

  if (type === 'call') {
    payoutFunctionInfo = CoveredCall.buildPayoutFunction(
      BigInt(strikePrice),
      BigInt(contractSize),
      eventDescriptor.base,
      eventDescriptor.nbDigits,
    );

    totalCollateral = payoutFunctionInfo.totalCollateral;
    roundingIntervals.intervals = [
      {
        beginInterval: BigInt(0),
        roundingMod: BigInt(1),
      },
      {
        beginInterval: BigInt(strikePrice),
        roundingMod,
      },
    ];
  } else {
    payoutFunctionInfo = ShortPut.buildPayoutFunction(
      BigInt(strikePrice),
      BigInt(contractSize),
      BigInt(_totalCollateral),
      eventDescriptor.base,
      eventDescriptor.nbDigits,
    );
    totalCollateral = BigInt(_totalCollateral);
    roundingIntervals.intervals = [
      {
        beginInterval: BigInt(0),
        roundingMod,
      },
      {
        beginInterval: BigInt(strikePrice),
        roundingMod: BigInt(1),
      },
    ];
  }
  const payoutFunction = payoutFunctionInfo.payoutFunction;

  const contractDescriptor = new ContractDescriptorV1();
  contractDescriptor.numDigits = eventDescriptor.nbDigits;
  contractDescriptor.payoutFunction = payoutFunction;

  contractDescriptor.roundingIntervals = roundingIntervals;

  const oracleInfo = new OracleInfoV0();
  oracleInfo.announcement = announcement;

  const contractInfo = new ContractInfoV0();
  contractInfo.totalCollateral = totalCollateral;
  contractInfo.contractDescriptor = contractDescriptor;
  contractInfo.oracleInfo = oracleInfo;

  const orderOffer = new OrderOfferV0();

  orderOffer.chainHash = chainHashFromNetwork(BitcoinNetworks[network]);
  orderOffer.contractInfo = contractInfo;
  orderOffer.offerCollateralSatoshis = totalCollateral - BigInt(premium);
  orderOffer.feeRatePerVb = BigInt(feePerByte);

  orderOffer.cetLocktime = Math.floor(new Date().getTime() / 1000); // set to current time
  orderOffer.refundLocktime =
    announcement.oracleEvent.eventMaturityEpoch + 604800; // 1 week after maturity
  return orderOffer;
};
