import { Value } from '@node-dlc/bitcoin';
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
import {
  BitcoinNetwork,
  BitcoinNetworks,
  chainHashFromNetwork,
} from 'bitcoin-networks';

import { CoveredCall } from './CoveredCall';
import { LinearPayout } from './LinearPayout';
import { ShortPut } from './ShortPut';

export const UNIT_MULTIPLIER = {
  bits: BigInt(1e2),
  sats: BigInt(1),
};

/**
 * Compute rounding intervals for a linear or hyperbola payout curve
 *
 * @param {number | bigint | Value} rounding rounding interval in sats
 * @param {number | bigint | Value} contractSize contract size in sats
 * @returns rounding mod for contract size
 */
export const computeRoundingModulus = (
  rounding: number | bigint | Value,
  contractSize: number | bigint | Value,
): bigint => {
  const roundingInSats =
    rounding instanceof Value ? rounding.sats : BigInt(rounding);

  const contractSizeInSats =
    contractSize instanceof Value ? contractSize.sats : BigInt(contractSize);

  return (roundingInSats * contractSizeInSats) / BigInt(1e8);
};

/**
 * Get digit decomposition event descriptor from oracle announcement
 *
 * @param {OracleAnnouncementV0} announcement oracle announcement
 * @returns {DigitDecompositionEventDescriptorV0} event descriptor
 */
export const getDigitDecompositionEventDescriptor = (
  announcement: OracleAnnouncementV0,
): DigitDecompositionEventDescriptorV0 => {
  if (
    announcement.oracleEvent.eventDescriptor.type !==
    MessageType.DigitDecompositionEventDescriptorV0
  )
    throw Error('Only DigitDecompositionEventDescriptorV0 currently supported');

  const eventDescriptor = announcement.oracleEvent
    .eventDescriptor as DigitDecompositionEventDescriptorV0;

  return eventDescriptor;
};

/**
 * Build an orderoffer for ContractDescriptorV1
 *
 * @param {OracleAnnouncementV0} announcement oracle announcement
 * @param {bigint} totalCollateral total collateral in satoshis
 * @param {bigint} offerCollateral offer collateral in satoshis
 * @param {PayoutFunctionV0} payoutFunction
 * @param {RoundingIntervalsV0} roundingIntervals
 * @param {bigint} feePerByte sats/vbyte
 * @param {NetworkName} network
 * @returns {OrderOfferV0} Returns order offer
 */
export const buildOrderOffer = (
  announcement: OracleAnnouncementV0,
  totalCollateral: bigint,
  offerCollateral: bigint,
  payoutFunction: PayoutFunctionV0,
  roundingIntervals: RoundingIntervalsV0,
  feePerByte: bigint,
  network: string,
): OrderOfferV0 => {
  const eventDescriptor = getDigitDecompositionEventDescriptor(announcement);

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
  orderOffer.offerCollateralSatoshis = offerCollateral;
  orderOffer.feeRatePerVb = feePerByte;
  orderOffer.cetLocktime = Math.floor(new Date().getTime() / 1000); // set to current time
  orderOffer.refundLocktime =
    announcement.oracleEvent.eventMaturityEpoch + 604800; // 1 week after maturity

  return orderOffer;
};

/**
 * Builds an order offer for a covered call or short put
 *
 * @param {OracleAnnouncementV0} announcement oracle announcement
 * @param {number} contractSize contract size in satoshis
 * @param {number} strikePrice strike price of contract
 * @param {number} premium premium of contract in satoshis
 * @param {number | bigint} feePerByte sats/vbyte
 * @param {number} rounding rounding interval
 * @param {string} network bitcoin network type
 * @param {string} type call or put
 * @param {number} _totalCollateral total collateral in satoshis (applicable only for short put)
 * @returns {OrderOfferV0} Returns order offer
 */
export const buildOptionOrderOffer = (
  announcement: OracleAnnouncementV0,
  contractSize: number,
  strikePrice: number,
  premium: number,
  feePerByte: number | bigint,
  rounding: number,
  network: string,
  type: 'call' | 'put',
  _totalCollateral?: number,
): OrderOfferV0 => {
  const eventDescriptor = getDigitDecompositionEventDescriptor(announcement);

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
  const offerCollateral = totalCollateral - BigInt(premium);

  return buildOrderOffer(
    announcement,
    totalCollateral,
    offerCollateral,
    payoutFunction,
    roundingIntervals,
    BigInt(feePerByte),
    network,
  );
};

/**
 * Builds an order offer for a covered call
 *
 * @param {OracleAnnouncementV0} announcement oracle announcement
 * @param {number} contractSize contract size in satoshis
 * @param {number} strikePrice strike price of contract
 * @param {number} premium premium of contract in satoshis
 * @param {number} feePerByte sats/vbyte
 * @param {number} rounding rounding interval
 * @param {string} network bitcoin network type
 * @returns {OrderOfferV0} Returns order offer
 */
export const buildCoveredCallOrderOffer = (
  announcement: OracleAnnouncementV0,
  contractSize: number,
  strikePrice: number,
  premium: number,
  feePerByte: number,
  rounding: number,
  network: string,
): OrderOfferV0 => {
  return buildOptionOrderOffer(
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

/**
 * Builds an order offer for a short put
 *
 * @param {OracleAnnouncementV0} announcement oracle announcement
 * @param {number} contractSize contract size in satoshis
 * @param {number} strikePrice strike price of contract
 * @param {number} totalCollateral total collateral in satoshis
 * @param {number} premium premium of contract in satoshis
 * @param {number} feePerByte sats/vbyte
 * @param {number} rounding rounding interval
 * @param {string} network bitcoin network type
 * @returns {OrderOfferV0} Returns order offer
 */
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
  return buildOptionOrderOffer(
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
 * Builds an order offer for a linear curve
 *
 * @param {OracleAnnouncementV0} announcement oracle announcement
 * @param {Value} offerCollateral offer collateral amount
 * @param {Value} minPayout minimum payout
 * @param {Value} maxPayout maximum payout (also total collateral)
 * @param {bigint} startOutcome oracle outcome (in bits or sats)
 * @param {bigint} endOutcome oracle outcome (in bits or sats)
 * @param {bigint} feePerByte sats/vbyte
 * @param {Value} rounding rounding mod for RoundingInterval
 * @param {BitcoinNetwork} network bitcoin, bitcoin_testnet or bitcoin_regtest
 * @returns {OrderOfferV0}
 */
export const buildLinearOrderOffer = (
  announcement: OracleAnnouncementV0,
  offerCollateral: Value,
  minPayout: Value,
  maxPayout: Value,
  startOutcome: bigint,
  endOutcome: bigint,
  feePerByte: bigint,
  rounding: Value,
  network: BitcoinNetwork,
): OrderOfferV0 => {
  if (maxPayout.lt(minPayout))
    throw Error('maxPayout must be greater than minPayout');
  if (endOutcome < startOutcome)
    throw Error('endOutcome must be greater than startOutcome');

  const eventDescriptor = getDigitDecompositionEventDescriptor(announcement);

  const totalCollateral = maxPayout.sats;

  const roundingIntervals = new RoundingIntervalsV0();
  const roundingMod = computeRoundingModulus(rounding, maxPayout);

  const { payoutFunction } = LinearPayout.buildPayoutFunction(
    minPayout.sats,
    maxPayout.sats,
    startOutcome,
    endOutcome,
    eventDescriptor.base,
    eventDescriptor.nbDigits,
  );

  roundingIntervals.intervals = [
    {
      beginInterval: BigInt(0),
      roundingMod,
    },
  ];

  return buildOrderOffer(
    announcement,
    totalCollateral,
    offerCollateral.sats,
    payoutFunction,
    roundingIntervals,
    feePerByte,
    network.name,
  );
};

/**
 * Builds a custom strategy order offer
 *
 * @param {OracleAnnouncementV0} announcement oracle announcement
 * @param {Value} contractSize contract size
 * @param {Value} maxLoss maximum amount that can be lost based on 1 BTC contract
 * @param {Value} maxGain maximum amount that can be gained based on 1 BTC contract
 * @param {bigint} feePerByte sats/vbyte
 * @param {Value} rounding rounding mod for RoundingInterval
 * @param {BitcoinNetwork} network bitcoin, bitcoin_testnet or bitcoin_regtest
 * @returns {OrderOfferV0}
 */
export const buildCustomStrategyOrderOffer = (
  announcement: OracleAnnouncementV0,
  contractSize: Value,
  maxLoss: Value,
  maxGain: Value,
  feePerByte: bigint,
  rounding: Value,
  network: BitcoinNetwork,
): OrderOfferV0 => {
  const eventDescriptor = getDigitDecompositionEventDescriptor(announcement);

  const unit = eventDescriptor.unit;

  const minPayout = contractSize.clone();
  minPayout.sub(
    Value.fromSats((contractSize.sats * maxLoss.sats) / BigInt(1e8)),
  );
  minPayout.sub(
    Value.fromSats((contractSize.sats * maxGain.sats) / BigInt(1e8)),
  );

  const maxPayout = contractSize.clone();

  const startOutcomeValue = Value.fromBitcoin(1);
  startOutcomeValue.sub(maxLoss);

  const endOutcomeValue = Value.fromBitcoin(1);
  endOutcomeValue.add(maxGain);

  const startOutcome =
    startOutcomeValue.sats / BigInt(UNIT_MULTIPLIER[unit.toLowerCase()]);
  const endOutcome =
    endOutcomeValue.sats / BigInt(UNIT_MULTIPLIER[unit.toLowerCase()]);

  const offerCollateral = contractSize.clone();
  offerCollateral.sub(
    Value.fromSats((contractSize.sats * maxGain.sats) / BigInt(1e8)),
  );

  return buildLinearOrderOffer(
    announcement,
    offerCollateral,
    minPayout,
    maxPayout,
    startOutcome,
    endOutcome,
    feePerByte,
    rounding,
    network,
  );
};
