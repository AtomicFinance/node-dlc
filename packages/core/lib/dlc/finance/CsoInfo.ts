import { Value } from '@node-dlc/bitcoin';
import {
  ContractDescriptorV1,
  ContractInfo,
  ContractInfoV0,
  DigitDecompositionEventDescriptorV0,
  MessageType,
  OrderPositionInfo,
  OrderPositionInfoV0,
  PayoutFunctionV0,
  PolynomialPayoutCurvePiece,
} from '@node-dlc/messaging';
import assert from 'assert';
import Decimal from 'decimal.js';

import {
  DlcParty,
  roundToNearestMultiplier,
  roundUpToNearestMultiplier,
  UNIT_MULTIPLIER,
} from './Builder';
import {
  HasContractInfo,
  HasOfferCollateralSatoshis,
  HasType,
} from './OptionInfo';

export interface CsoInfo {
  normalizedMaxGain: Value; // Max Gain Relative to 1 BTC Contract
  normalizedMaxLoss: Value; // Max Loss Relative to 1 BTC Contract
  maxGainForContractSize: Value; // Max Gain Relative to Contract Size
  maxLossForContractSize: Value; // Max Loss Relative to Contract Size
  minPayout: bigint;
  maxPayout: bigint;
  contractSize: Value;
  offerCollateral: Value;
  totalCollateral: Value;
  expiry: Date;
}

export interface CsoInfoParams {
  normalizedMaxGain: Value; // Max Gain Relative to 1 BTC Contract
  normalizedMaxLoss: Value; // Max Loss Relative to 1 BTC Contract
  maxGainForContractSize: Value; // Max Gain Relative to Contract Size
  maxLossForContractSize: Value; // Max Loss Relative to Contract Size
  offerCollateral: Value; // Offer Collateral
}

const ONE_BTC_CONTRACT = Value.fromBitcoin(1);

export type MaybeHasPositionInfo = {
  positionInfo?: OrderPositionInfo;
};

/**
 * getCsoInfoParamsFromContractInfo V0
 *
 * Old getCsoInfoParamsFromContractInfo implementation
 *
 * @param {Value} contractSize - The size of the contract in terms of value.
 * @param {Value} collateral - The collateral value put up for the contract.
 * @param {DlcParty} shiftForFees - Specifies which party ('offeror' or 'acceptor') will bear the fees, affecting the outcome values.
 * @param {Value} fees - The fees associated with the contract.
 * @param {string} unit - The unit of measurement for the contract outcomes (e.g., 'BTC').
 * @param {Value} startOutcomeValue - The starting outcome value for the contract.
 * @param {Value} endOutcomeValue - The ending outcome value for the contract.
 * @returns {CsoInfoParams} An object containing the calculated CSO parameters:
 *                          - normalizedMaxGain: Maximum gain relative to a 1 BTC contract.
 *                          - normalizedMaxLoss: Maximum loss relative to a 1 BTC contract.
 *                          - maxGainForContractSize: Maximum gain for the actual contract size.
 *                          - maxLossForContractSize: Maximum loss for the actual contract size.
 *                          - offerCollateral: The offer collateral value after adjustments.
 *
 * Note: This function calculates the adjusted fees incorrectly, using collateral instead of contract size. Use v1 where possible.
 */
export const getCsoInfoParamsFromContractInfoV0 = (
  contractSize: Value,
  collateral: Value,
  shiftForFees: DlcParty,
  fees: Value,
  unit: string,
  startOutcomeValue: Value,
  endOutcomeValue: Value,
): CsoInfoParams => {
  const leverageMultiplier = parseFloat(
    new Decimal(contractSize.bitcoin).dividedBy(collateral.bitcoin).toFixed(1),
  );

  const defaultContractSize = Value.fromBitcoin(1);

  const shiftValue =
    collateral.sats > 0
      ? Value.fromSats(
          roundToNearestMultiplier(
            (fees.sats * defaultContractSize.sats) / collateral.sats, // WARNING: this should be contract size not collateral
            UNIT_MULTIPLIER[unit.toLowerCase()], // (use v1 if possible)
          ),
        )
      : Value.zero();

  if (shiftForFees === 'offeror') {
    startOutcomeValue.sub(shiftValue);
    endOutcomeValue.sub(shiftValue);
  } else if (shiftForFees === 'acceptor') {
    startOutcomeValue.add(shiftValue);
    endOutcomeValue.add(shiftValue);
  }

  const normalizedMaxGain = endOutcomeValue.clone();
  normalizedMaxGain.sub(ONE_BTC_CONTRACT);

  const normalizedMaxLoss = ONE_BTC_CONTRACT.clone();
  normalizedMaxLoss.sub(startOutcomeValue);

  const maxGainForContractSize = Value.fromBitcoin(
    new Decimal(normalizedMaxGain.bitcoin)
      .times(leverageMultiplier)
      .toDecimalPlaces(5)
      .toNumber(),
  );

  const maxLossForContractSize = Value.fromBitcoin(
    new Decimal(normalizedMaxLoss.bitcoin)
      .times(contractSize.bitcoin)
      .toDecimalPlaces(
        8 - Math.log10(Number(UNIT_MULTIPLIER[unit.toLowerCase()])),
      )
      .toNumber(),
  );

  const offerCollateral = collateral.clone();
  offerCollateral.sub(
    Value.fromSats(
      (maxGainForContractSize.sats * collateral.sats) / BigInt(1e8),
    ),
  );

  return {
    normalizedMaxGain,
    normalizedMaxLoss,
    maxGainForContractSize,
    maxLossForContractSize,
    offerCollateral,
  };
};

/**
 * getCsoInfoParamsFromContractInfo V1
 *
 * Fixed getCsoInfoParamsFromContractInfo implementation
 *
 * @param {Value} contractSize - The size of the contract in terms of value.
 * @param {Value} collateral - The collateral value put up for the contract.
 * @param {DlcParty} shiftForFees - Specifies which party ('offeror' or 'acceptor') will bear the fees, affecting the outcome values.
 * @param {Value} fees - The fees associated with the contract.
 * @param {string} unit - The unit of measurement for the contract outcomes (e.g., 'BTC').
 * @param {Value} startOutcomeValue - The starting outcome value for the contract.
 * @param {Value} endOutcomeValue - The ending outcome value for the contract.
 * @returns {CsoInfoParams} An object containing the calculated CSO parameters:
 *                          - normalizedMaxGain: Maximum gain relative to a 1 BTC contract.
 *                          - normalizedMaxLoss: Maximum loss relative to a 1 BTC contract.
 *                          - maxGainForContractSize: Maximum gain for the actual contract size.
 *                          - maxLossForContractSize: Maximum loss for the actual contract size.
 *                          - offerCollateral: The offer collateral value after adjustments.
 *
 * This version improves upon the previous by correctly adjusting fees based on the contract size, leading to more accurate
 * calculations of CSO parameters.
 */
export const getCsoInfoParamsFromContractInfoV1 = (
  contractSize: Value,
  collateral: Value,
  shiftForFees: DlcParty,
  fees: Value,
  unit: string,
  startOutcomeValue: Value,
  endOutcomeValue: Value,
): CsoInfoParams => {
  const feesAdjusted = Value.fromSats(
    roundToNearestMultiplier(
      (fees.sats * BigInt(1e8)) / contractSize.sats, // NOTE: this is done correctly using contractSize
      BigInt(UNIT_MULTIPLIER[unit.toLowerCase()]),
    ),
  );

  if (shiftForFees === 'offeror') {
    startOutcomeValue.sub(feesAdjusted);
    endOutcomeValue.sub(feesAdjusted);
  } else if (shiftForFees === 'acceptor') {
    startOutcomeValue.add(feesAdjusted);
    endOutcomeValue.add(feesAdjusted);
  }

  const normalizedMaxGain = endOutcomeValue.clone();
  normalizedMaxGain.sub(ONE_BTC_CONTRACT);

  const normalizedMaxLoss = ONE_BTC_CONTRACT.clone();
  normalizedMaxLoss.sub(startOutcomeValue);

  const maxGainForContractSize = Value.fromSats(
    roundUpToNearestMultiplier(
      (normalizedMaxGain.sats * contractSize.sats) / BigInt(1e8),
      BigInt(UNIT_MULTIPLIER[unit.toLowerCase()]),
    ),
  );

  const maxLossForContractSize = Value.fromSats(
    roundUpToNearestMultiplier(
      (normalizedMaxLoss.sats * contractSize.sats) / BigInt(1e8),
      BigInt(UNIT_MULTIPLIER[unit.toLowerCase()]),
    ),
  );

  const offerCollateral = collateral.clone();
  offerCollateral.sub(maxGainForContractSize);

  return {
    normalizedMaxGain,
    normalizedMaxLoss,
    maxGainForContractSize,
    maxLossForContractSize,
    offerCollateral,
  };
};

/**
 * Decode CsoInfo from a ContractInfo object. Essentially the opposite of buildCustomStrategyOrderOffer
 *
 * @param {_contractInfo} ContractInfo - Contract Info object, containing oracle and descriptor info
 * @param {DlcParty} shiftForFees - Specifies which party ('offeror', 'acceptor', or 'neither') will pay for network fees
 * @param {Value} fees - Network fees associated with the contract. Defaults to 0 sats.
 * @param {_contractSize} Value - Optional.  If not provided, it defaults to the total collateral.
 * @param {csoVersion} 'v0' | 'v1' - Specifies the version of the CSO parameter calculation to use. Defaults to 'v1'.
 * @returns {CsoInfo} An object containing the calculated CSO information:
 *                    - normalizedMaxGain: Maximum gain relative to a 1 BTC contract.
 *                    - normalizedMaxLoss: Maximum loss relative to a 1 BTC contract.
 *                    - maxGainForContractSize: Maximum gain for the actual contract size.
 *                    - maxLossForContractSize: Maximum loss for the actual contract size.
 *                    - minPayout: Minimum payout as determined by the contract's payout function.
 *                    - maxPayout: Maximum payout as determined by the contract's payout function.
 *                    - contractSize: The size of the contract in terms of value.
 *                    - offerCollateral: The offer collateral value after adjustments.
 *                    - totalCollateral: The total collateral put up for the contract.
 *                    - expiry: The expiry date of the contract based on the oracle's event maturity epoch.
 *
 * Note: This function performs several validations to ensure that the contract information and its components are of the
 * expected types and formats.
 *       It throws errors if unsupported types or formats are encountered.
 */
export const getCsoInfoFromContractInfo = (
  _contractInfo: ContractInfo,
  shiftForFees: DlcParty = 'neither',
  fees: Value = Value.fromSats(0),
  _contractSize?: Value,
  csoVersion: 'v0' | 'v1' = 'v1',
): CsoInfo => {
  if (_contractInfo.type !== MessageType.ContractInfoV0)
    throw Error('Only ContractInfoV0 currently supported');

  const contractInfo = _contractInfo as ContractInfoV0;
  if (contractInfo.contractDescriptor.type !== MessageType.ContractDescriptorV1)
    throw Error('Only ContractDescriptorV1 currently supported');

  const oracleInfo = contractInfo.oracleInfo;

  const { eventMaturityEpoch } = oracleInfo.announcement.oracleEvent;

  const eventDescriptor = oracleInfo.announcement.oracleEvent
    .eventDescriptor as DigitDecompositionEventDescriptorV0;

  if (
    oracleInfo.announcement.oracleEvent.eventDescriptor.type !==
    MessageType.DigitDecompositionEventDescriptorV0
  )
    throw Error('Only DigitDecompositionEventDescriptorV0 currently supported');

  const contractDescriptor = contractInfo.contractDescriptor as ContractDescriptorV1;
  if (contractDescriptor.payoutFunction.type !== MessageType.PayoutFunctionV0)
    throw Error('Only PayoutFunctionV0 currently supported');

  const payoutFunction = contractDescriptor.payoutFunction as PayoutFunctionV0;

  validateCsoPayoutFunction(payoutFunction);

  const initialPiece = payoutFunction.pieces[0];
  const midPiece = payoutFunction.pieces[1];

  const minPayout = initialPiece.endpointPayout;
  const maxPayout = midPiece.endpointPayout;

  const startOutcome = initialPiece.endpoint;
  const endOutcome = midPiece.endpoint;

  const unit = eventDescriptor.unit;

  const collateral = Value.fromSats(contractInfo.totalCollateral);
  const contractSize =
    _contractSize && _contractSize.sats > 0 ? _contractSize : collateral;

  const startOutcomeValue = Value.fromSats(
    startOutcome * UNIT_MULTIPLIER[unit.toLowerCase()],
  );
  const endOutcomeValue = Value.fromSats(
    endOutcome * UNIT_MULTIPLIER[unit.toLowerCase()],
  );

  const getCsoInfoParamsFromContractInfo =
    csoVersion === 'v0'
      ? getCsoInfoParamsFromContractInfoV0
      : getCsoInfoParamsFromContractInfoV1;

  const {
    normalizedMaxGain,
    normalizedMaxLoss,
    maxGainForContractSize,
    maxLossForContractSize,
    offerCollateral,
  } = getCsoInfoParamsFromContractInfo(
    contractSize,
    collateral,
    shiftForFees,
    fees,
    unit,
    startOutcomeValue,
    endOutcomeValue,
  );

  const expiry = new Date(eventMaturityEpoch * 1000);

  return {
    normalizedMaxGain,
    normalizedMaxLoss,
    maxGainForContractSize,
    maxLossForContractSize,
    minPayout,
    maxPayout,
    contractSize,
    offerCollateral,
    totalCollateral: collateral,
    expiry,
  };
};

/**
 * Get CsoInfo from OrderOffer or DlcOffer and validate
 *
 * @param {HasContractInfo & HasType} offer
 * @returns {CsoInfo}
 */
export const getCsoInfoFromOffer = (
  offer: HasContractInfo &
    HasType &
    HasOfferCollateralSatoshis &
    MaybeHasPositionInfo,
  csoVersion: 'v0' | 'v1' = 'v1',
): CsoInfo => {
  if (
    offer.type !== MessageType.DlcOfferV0 &&
    offer.type !== MessageType.OrderOfferV0
  )
    throw Error('Only DlcOfferV0 and OrderOfferV0 currently supported');

  let shiftForFees: DlcParty = 'neither';
  const fees = Value.zero();
  const contractSize = Value.zero();

  if (offer.positionInfo) {
    shiftForFees = (offer.positionInfo as OrderPositionInfoV0).shiftForFees;
    fees.add(Value.fromSats((offer.positionInfo as OrderPositionInfoV0).fees));
    contractSize.add(
      Value.fromSats((offer.positionInfo as OrderPositionInfoV0).contractSize),
    );
  }

  const positionInfo = getCsoInfoFromContractInfo(
    offer.contractInfo,
    shiftForFees,
    fees,
    contractSize,
    csoVersion,
  );

  if (positionInfo.offerCollateral.sats !== offer.offerCollateralSatoshis)
    throw Error('Offer was not generated with CSO ContractInfo');

  return positionInfo;
};

/**
 * Validate Payout Function for proper CSO format
 *
 * It should have 3 PayoutCurvePieces which consist of a flat line (maxLoss),
 * ascending line (maxLoss to maxGain) and finally another flat line (maxGain)
 *
 * All PayoutCurvePieces should be type PolynomialPayoutCurvePieces
 *
 * @param {PayoutFunctionV0} payoutFunction
 */
export const validateCsoPayoutFunction = (
  payoutFunction: PayoutFunctionV0,
): void => {
  assert(
    payoutFunction.pieces.length === 3,
    'CSO Payout Function must have 3 PayoutCurvePieces',
  );
  for (const [i, piece] of payoutFunction.pieces.entries()) {
    assert(
      piece.payoutCurvePiece.type === MessageType.PolynomialPayoutCurvePiece,
      'CSO Payout Function PayoutCurvePieces must be PolynomialCurvePieces',
    );

    const payoutCurvePiece = piece.payoutCurvePiece as PolynomialPayoutCurvePiece;
    const points = payoutCurvePiece.points;

    // eventOutcome should always be ascending
    assert(
      points[0].eventOutcome < points[1].eventOutcome,
      'CSO Payout Function PayoutCurvePiece point payout should be an ascending line',
    );

    // endpoints should always be ascending
    let previousPiece, previousPoints;
    if (i > 0) {
      previousPiece = payoutFunction.pieces[i - 1];
      previousPoints = previousPiece.payoutCurvePiece.points;
      assert(
        previousPiece.endpoint < piece.endpoint,
        'CSO Payout Function point endpoints should be an ascending line',
      );
      assert(
        previousPoints[1].outcomePayout === points[0].outcomePayout,
        'CSO Payout Function point outcome payout should be continuous without gaps',
      );
    }

    switch (i) {
      case 0:
        // endpoints should always be ascending
        assert(payoutFunction.endpoint0 < piece.endpoint);

        // maxLoss should be a flat line
        assert(payoutFunction.endpointPayout0 === piece.endpointPayout);
        assert(
          points[0].outcomePayout === points[1].outcomePayout,
          'CSO Payout Function maxLoss PayoutCurvePiece point should be a flat line',
        );
        break;
      case 1:
        // maxLoss to maxGain should be an ascending line
        assert(previousPiece.endpointPayout < piece.endpointPayout);
        assert(
          points[0].outcomePayout < points[1].outcomePayout,
          'CSO Payout Function maxLoss to maxGain PayoutCurvePiece point should be an ascending line',
        );
        break;
      case 2:
        // maxGain should be a flat line
        assert(previousPiece.endpointPayout === piece.endpointPayout);
        assert(
          points[0].outcomePayout === points[1].outcomePayout,
          'CSO Payout Function maxGain PayoutCurvePiece point should be a flat line',
        );
        break;
    }
  }
};
