import { chainHashFromNetwork } from '@atomicfinance/bitcoin-networks';
import { BitcoinNetworks } from '@liquality/bitcoin-networks';
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

import { CoveredCall } from './CoveredCall';
import { ShortPut } from './ShortPut';

export const buildCoveredCallOrderOffer = (
  announcement: OracleAnnouncementV0,
  contractSize: number,
  strikePrice: number,
  premium: number,
  feePerByte: number,
  expiration: number,
  rounding: number,
  network: string,
): OrderOfferV0 => {
  return buildOrderOffer(
    announcement,
    contractSize,
    strikePrice,
    premium,
    feePerByte,
    expiration,
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
  expiration: number,
  rounding: number,
  network: string,
): OrderOfferV0 => {
  return buildOrderOffer(
    announcement,
    contractSize,
    strikePrice,
    premium,
    feePerByte,
    expiration,
    rounding,
    network,
    'put',
    totalCollateral,
  );
};

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
  expiration: number,
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
        roundingMod: BigInt(Math.floor(rounding * contractSize)),
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
        roundingMod: BigInt(Math.floor(rounding * contractSize)),
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

  orderOffer.cetLocktime = expiration;
  orderOffer.refundLocktime = expiration + 604800; // 1 week later
  return orderOffer;
};
