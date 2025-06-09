import { Value } from '@node-dlc/bitcoin';
import {
  ContractDescriptorV1,
  ContractInfoV0,
  DigitDecompositionEventDescriptorV0,
  MessageType,
  OracleAnnouncementV0,
  OracleInfoV0,
  OrderOfferV0,
  OrderPositionInfoV0,
  PayoutFunctionV0,
  RoundingIntervalsV0,
} from '@node-dlc/messaging';
import {
  BitcoinNetwork,
  BitcoinNetworks,
  chainHashFromNetwork,
} from 'bitcoin-networks';
import Decimal from 'decimal.js';

import { dustThreshold } from '../CoinSelect';
import { getFinalizerByCount } from '../TxFinalizer';
import { CoveredCall } from './CoveredCall';
import { LinearPayout } from './LinearPayout';
import { LongCall } from './LongCall';
import { LongPut } from './LongPut';
import { ShortPut } from './ShortPut';

export const UNIT_MULTIPLIER = {
  bits: BigInt(1e2),
  sats: BigInt(1),
};

/**
 * Round a number to the nearest multiple of a given multiplier.
 *
 * @param num - The number to be rounded.
 * @param multiplier - The multiplier to round to.
 * @returns The number rounded to the nearest multiple of the multiplier.
 *
 * @example
 * ```typescript
 * // Example: rounding to nearest 100
 * const number = BigInt(354);
 * const multiplier = BigInt(100);
 * const roundedNumber = roundToNearestMultiplier(number, multiplier);
 * console.log(roundedNumber); // Output: 300
 * ```
 */
export const roundToNearestMultiplier = (
  num: bigint,
  multiplier: bigint,
): bigint => (num / multiplier) * multiplier;

/**
 * Round a number up to the nearest multiple of a given multiplier.
 *
 * @param num - The number to be rounded.
 * @param multiplier - The multiplier to round to.
 * @returns The number rounded up to the nearest multiple of the multiplier.
 *
 * @example
 * ```typescript
 * // Example: rounding up to nearest 100
 * const number = BigInt(354);
 * const multiplier = BigInt(100);
 * const roundedNumber = roundToNearestMultiplier(number, multiplier);
 * console.log(roundedNumber); // Output: 400
 * ```
 */
export const roundUpToNearestMultiplier = (
  num: bigint,
  multiplier: bigint,
): bigint => ((num + multiplier - BigInt(1)) / multiplier) * multiplier;

export const roundDownToNearestMultiplier = (
  num: bigint,
  multiplier: bigint,
): bigint => num - (num % multiplier);

export type DlcParty = 'offeror' | 'acceptor' | 'neither';

const safeConvertToBigInt = (value: number | bigint | Value): bigint => {
  if (value instanceof Value) {
    return value.sats;
  }

  if (typeof value === 'bigint') {
    return value;
  }

  if (typeof value === 'number') {
    // If it's a decimal less than 1, it's likely a bitcoin amount that needs conversion to sats
    if (value < 1 && value > 0) {
      return BigInt(Math.round(value * 1e8));
    }
    // For larger numbers, treat as sats
    return BigInt(Math.round(value));
  }

  // Handle string representations of numbers (which can happen during serialization)
  if (typeof value === 'string') {
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      if (numValue < 1 && numValue > 0) {
        return BigInt(Math.round(numValue * 1e8));
      }
      return BigInt(Math.round(numValue));
    }
  }

  // Final fallback: try to convert directly, but catch BigInt errors for decimals
  try {
    return BigInt(value);
  } catch (error) {
    // If BigInt conversion fails, try to parse as a decimal bitcoin amount
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      return BigInt(Math.round(numValue * 1e8));
    }
    throw error;
  }
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
  const roundingInSats = safeConvertToBigInt(rounding);
  const contractSizeInSats = safeConvertToBigInt(contractSize);

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
    announcement.oracleEvent.eventMaturityEpoch + 2419200; // 4 weeks after maturity

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
  contractSize: Value,
  strikePrice: number,
  premium: Value,
  feePerByte: number | bigint,
  rounding: number,
  network: string,
  type: 'call' | 'put',
  direction: 'long' | 'short',
  _totalCollateral?: Value,
): OrderOfferV0 => {
  const eventDescriptor = getDigitDecompositionEventDescriptor(announcement);

  let totalCollateral: bigint;
  let payoutFunctionInfo: {
    payoutFunction: PayoutFunctionV0;
    totalCollateral?: bigint;
  };

  const roundingIntervals = new RoundingIntervalsV0();
  const roundingMod = computeRoundingModulus(rounding, contractSize);

  if (direction === 'short') {
    if (type === 'call') {
      payoutFunctionInfo = CoveredCall.buildPayoutFunction(
        BigInt(strikePrice),
        contractSize.sats,
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
        contractSize.sats,
        _totalCollateral.sats,
        eventDescriptor.base,
        eventDescriptor.nbDigits,
      );
      totalCollateral = _totalCollateral.sats;
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
  } else {
    totalCollateral = _totalCollateral.sats;

    if (type === 'call') {
      payoutFunctionInfo = LongCall.buildPayoutFunction(
        BigInt(strikePrice),
        contractSize.sats,
        totalCollateral,
        eventDescriptor.base,
        eventDescriptor.nbDigits,
      );

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
      payoutFunctionInfo = LongPut.buildPayoutFunction(
        BigInt(strikePrice),
        contractSize.sats,
        totalCollateral,
        eventDescriptor.base,
        eventDescriptor.nbDigits,
      );

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
  }

  const payoutFunction = payoutFunctionInfo.payoutFunction;

  const offerCollateral =
    direction === 'short' ? totalCollateral - premium.sats : premium.sats;

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
  contractSize: Value,
  strikePrice: number,
  premium: Value,
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
    'short',
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
  contractSize: Value,
  strikePrice: number,
  totalCollateral: Value,
  premium: Value,
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
    'short',
    totalCollateral,
  );
};

/**
 * Builds an order offer for a long call
 *
 * @param {OracleAnnouncementV0} announcement oracle announcement
 * @param {number} contractSize contract size in satoshis
 * @param {number} strikePrice strike price of contract
 * @param {number} maxGain maximum amount that can be gained (totalCollateral)
 * @param {number} premium premium of contract in satoshis
 * @param {number} feePerByte sats/vbyte
 * @param {number} rounding rounding interval
 * @param {string} network bitcoin network type
 * @returns {OrderOfferV0} Returns order offer
 */
export const buildLongCallOrderOffer = (
  announcement: OracleAnnouncementV0,
  contractSize: Value,
  strikePrice: number,
  maxGain: Value,
  premium: Value,
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
    'long',
    maxGain,
  );
};

/**
 * Builds an order offer for a long put
 *
 * @param {OracleAnnouncementV0} announcement oracle announcement
 * @param {number} contractSize contract size in satoshis
 * @param {number} strikePrice strike price of contract
 * @param {number} maxGain maximum amount that can be gained (totalCollateral)
 * @param {number} premium premium of contract in satoshis
 * @param {number} feePerByte sats/vbyte
 * @param {number} rounding rounding interval
 * @param {string} network bitcoin network type
 * @returns {OrderOfferV0} Returns order offer
 */
export const buildLongPutOrderOffer = (
  announcement: OracleAnnouncementV0,
  contractSize: Value,
  strikePrice: number,
  maxGain: Value,
  premium: Value,
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
    'long',
    maxGain,
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
 * @param {DlcParty} [shiftForFees] shift for offerer, acceptor or neither (who should pay fees)
 * @param {Value} [fees] fees to shift
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
  roundingIntervals: RoundingIntervalsV0,
  network: BitcoinNetwork,
  shiftForFees: DlcParty = 'neither',
  fees: Value = Value.fromSats(0),
): OrderOfferV0 => {
  if (maxPayout.lt(minPayout))
    throw Error('maxPayout must be greater than minPayout');
  if (endOutcome < startOutcome)
    throw Error('endOutcome must be greater than startOutcome');

  const eventDescriptor = getDigitDecompositionEventDescriptor(announcement);

  const totalCollateral = maxPayout.sats;

  const { payoutFunction } = LinearPayout.buildPayoutFunction(
    minPayout.sats,
    maxPayout.sats,
    startOutcome,
    endOutcome,
    eventDescriptor.base,
    eventDescriptor.nbDigits,
  );

  const orderOffer = buildOrderOffer(
    announcement,
    totalCollateral,
    offerCollateral.sats,
    payoutFunction,
    roundingIntervals,
    feePerByte,
    network.name,
  );

  const positionInfo = new OrderPositionInfoV0();
  positionInfo.shiftForFees = shiftForFees;
  positionInfo.fees = shiftForFees === 'neither' ? BigInt(0) : fees.sats;
  orderOffer.positionInfo = positionInfo;

  return orderOffer;
};

/**
 * Builds a custom strategy order offer
 *
 * Calculates offer fees
 * calculates the minimum max gain
 * maxLoss and maxGain are normalized to 1 BTC contracts
 *
 * shiftForFees 'offeror' means 'offeror' pays network fees
 * shiftForFees 'acceptor' means 'acceptor' pays network fees
 *
 * numContracts refers to the number of DLCs in the funding transaction
 * if it's not a batch dlc funding transaction, then this is not relevant
 *
 * @param {OracleAnnouncementV0} announcement oracle announcement
 * @param {Value} contractSize contract size
 * @param {Value} normalizedMaxLoss maximum amount that can be lost based on 1 BTC contract
 * @param {Value} normalizedMaxGain maximum amount that can be gained based on 1 BTC contract
 * @param {bigint} feePerByte sats/vbyte
 * @param {Value} roundingIntervals rounding mod for RoundingInterval
 * @param {BitcoinNetwork} network bitcoin, bitcoin_testnet or bitcoin_regtest
 * @param {DlcParty} [shiftForFees] shift for offerer, acceptor or neither
 * @param {Value} [fees_] fees to shift
 * @param {Value} [collateral] collateral to use
 * @param {number} [numOfferInputs] number of inputs to use
 * @param {number} [numContracts] number of DLCs in the funding transaction
 *
 * @returns {OrderOfferV0}
 */
export const buildCustomStrategyOrderOffer = (
  announcement: OracleAnnouncementV0,
  contractSize: Value,
  normalizedMaxLoss: Value,
  normalizedMaxGain: Value,
  feePerByte: bigint,
  roundingIntervals: RoundingIntervalsV0,
  network: BitcoinNetwork,
  shiftForFees: DlcParty = 'neither',
  fees_: Value = Value.fromSats(0), // NOTE: fees should be divided before doing batch transaction
  collateral: Value = Value.fromSats(0),
  numOfferInputs = 1,
  numContracts = 1,
  skipValidation = false,
): OrderOfferV0 => {
  if (contractSize.eq(Value.zero())) {
    throw Error('contractSize must be greater than 0');
  }

  if (collateral.eq(Value.zero())) {
    collateral = contractSize.clone();
  }

  const eventDescriptor = getDigitDecompositionEventDescriptor(announcement);

  const unit = eventDescriptor.unit;

  const fees = Value.fromSats(
    Number(new Decimal(Number(fees_.sats)).dividedBy(numContracts).toFixed(0)),
  );

  const finalizer = getFinalizerByCount(
    feePerByte,
    numOfferInputs,
    1,
    numContracts,
  );
  const offerFees = Value.fromSats(finalizer.offerFees);

  // Use offerFees + dustThreshold for min max gain, to ensure in the case of
  // 0 PnL the acceptor payout is not dust
  const minMaxGainForContractSize_ = offerFees.addn(
    Value.fromSats(dustThreshold(BigInt(feePerByte))),
  );
  const minMaxGainForContractSize = Value.fromSats(
    roundUpToNearestMultiplier(
      minMaxGainForContractSize_.sats,
      BigInt(UNIT_MULTIPLIER[unit.toLowerCase()]),
    ),
  );

  const maxLossForContractSize = Value.fromSats(
    roundUpToNearestMultiplier(
      (normalizedMaxLoss.sats * contractSize.sats) / BigInt(1e8),
      BigInt(UNIT_MULTIPLIER[unit.toLowerCase()]),
    ),
  );
  const tempMaxGainForContractSize = Value.fromSats(
    roundUpToNearestMultiplier(
      (normalizedMaxGain.sats * contractSize.sats) / BigInt(1e8),
      BigInt(UNIT_MULTIPLIER[unit.toLowerCase()]),
    ),
  );

  const maxGainForContractSize = Value.zero();

  if (tempMaxGainForContractSize.lt(minMaxGainForContractSize)) {
    maxGainForContractSize.add(minMaxGainForContractSize);
  } else {
    maxGainForContractSize.add(tempMaxGainForContractSize);
  }

  const maxGainAdjusted = Value.fromSats(
    roundToNearestMultiplier(
      (maxGainForContractSize.sats * BigInt(1e8)) / contractSize.sats,
      BigInt(UNIT_MULTIPLIER[unit.toLowerCase()]),
    ),
  );

  const feesAdjusted = Value.fromSats(
    roundToNearestMultiplier(
      (fees.sats * BigInt(1e8)) / contractSize.sats,
      BigInt(UNIT_MULTIPLIER[unit.toLowerCase()]),
    ),
  );

  const minPayout = collateral.clone();
  if (minPayout.lt(maxLossForContractSize.addn(maxGainForContractSize))) {
    throw new Error(
      'Subtraction would result in a negative value for minPayout.',
    );
  }
  minPayout.sub(maxLossForContractSize);
  minPayout.sub(maxGainForContractSize);
  const maxPayout = collateral.clone();

  const startOutcomeValue = Value.fromBitcoin(1);
  startOutcomeValue.sub(normalizedMaxLoss);
  const endOutcomeValue = Value.fromBitcoin(1);
  endOutcomeValue.add(maxGainAdjusted);

  if (shiftForFees === 'offeror') {
    startOutcomeValue.add(feesAdjusted);
    endOutcomeValue.add(feesAdjusted);
  } else if (shiftForFees === 'acceptor') {
    startOutcomeValue.sub(feesAdjusted);
    endOutcomeValue.sub(feesAdjusted);
  }

  const startOutcome =
    startOutcomeValue.sats / BigInt(UNIT_MULTIPLIER[unit.toLowerCase()]);
  const endOutcome =
    endOutcomeValue.sats / BigInt(UNIT_MULTIPLIER[unit.toLowerCase()]);

  const offerCollateral = collateral.clone();
  if (offerCollateral.lt(maxGainForContractSize)) {
    throw new Error(
      'Subtraction would result in a negative value for offerCollateral.',
    );
  }
  offerCollateral.sub(maxGainForContractSize);

  const orderOffer = buildLinearOrderOffer(
    announcement,
    offerCollateral,
    minPayout,
    maxPayout,
    startOutcome,
    endOutcome,
    feePerByte,
    roundingIntervals,
    network,
    shiftForFees,
    fees,
  );

  (orderOffer.positionInfo as OrderPositionInfoV0).contractSize =
    contractSize.sats;

  (orderOffer.positionInfo as OrderPositionInfoV0).instrumentName = ((orderOffer.contractInfo as ContractInfoV0)
    .oracleInfo as OracleInfoV0).announcement.oracleEvent.eventId;

  if (!skipValidation) orderOffer.validate();

  return orderOffer;
};

interface IInterval {
  beginInterval: bigint;
  rounding: number | bigint | Value;
}

export const buildRoundingIntervalsFromIntervals = (
  contractSize: Value,
  intervals: IInterval[],
): RoundingIntervalsV0 => {
  const roundingIntervals = new RoundingIntervalsV0();

  roundingIntervals.intervals = intervals.map((interval) => {
    const roundingMod = computeRoundingModulus(interval.rounding, contractSize);

    return {
      beginInterval: interval.beginInterval,
      roundingMod,
    };
  });

  return roundingIntervals;
};
