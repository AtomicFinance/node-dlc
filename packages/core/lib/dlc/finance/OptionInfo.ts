import {
  ContractDescriptorV1,
  ContractInfo,
  ContractInfoV0,
  DigitDecompositionEventDescriptorV0,
  HyperbolaPayoutCurvePiece,
  MessageType,
  PayoutFunctionV0,
} from '@node-dlc/messaging';
import BN from 'bignumber.js';

import { HyperbolaPayoutCurve } from '../HyperbolaPayoutCurve';

export interface OptionInfo {
  contractSize: bigint;
  strikePrice: bigint;
  premium?: bigint;
  expiry: Date;
}

export type HasOfferCollateralSatoshis = {
  offerCollateralSatoshis: bigint;
};

export type HasContractInfo = {
  contractInfo: ContractInfo;
};

export type HasType = {
  type: MessageType;
};

export function getOptionInfoFromContractInfo(
  _contractInfo: ContractInfo,
): OptionInfo {
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
  if (payoutFunction.pieces.length === 0)
    throw Error('PayoutFunction must have at least once PayoutCurvePiece');
  if (payoutFunction.pieces.length > 1)
    throw Error('More than one PayoutCurvePiece not supported');

  const payoutCurvePiece = payoutFunction.pieces[0]
    .payoutCurvePiece as HyperbolaPayoutCurvePiece;
  if (
    payoutCurvePiece.type !== MessageType.HyperbolaPayoutCurvePiece &&
    payoutCurvePiece.type !== MessageType.OldHyperbolaPayoutCurvePiece
  )
    throw Error('Must be HyperbolaPayoutCurvePiece');
  if (payoutCurvePiece.b !== BigInt(0) || payoutCurvePiece.c !== BigInt(0))
    throw Error('b and c HyperbolaPayoutCurvePiece values must be 0');

  const curve = HyperbolaPayoutCurve.fromPayoutCurvePiece(payoutCurvePiece);
  const maxOutcome = BigInt(
    new BN(eventDescriptor.base)
      .pow(eventDescriptor.nbDigits)
      .minus(1)
      .toString(10),
  );
  const isAscending = curve
    .getPayout(maxOutcome)
    .gt(Number(payoutFunction.endpointPayout0));

  const expiry = new Date(eventMaturityEpoch * 1000);
  const totalCollateral = contractInfo.totalCollateral;

  // if curve is ascending, assume it is a put.
  const contractSize = isAscending
    ? payoutCurvePiece.translatePayout - totalCollateral
    : totalCollateral + payoutCurvePiece.translatePayout;

  const strikePrice = payoutCurvePiece.d / contractSize;

  return { contractSize, strikePrice, expiry };
}

export function getOptionInfoFromOffer(
  offer: HasOfferCollateralSatoshis & HasContractInfo & HasType,
): OptionInfo {
  if (
    offer.type !== MessageType.DlcOfferV0 &&
    offer.type !== MessageType.OrderOfferV0
  )
    throw Error('Only DlcOfferV0 and OrderOfferV0 currently supported');

  const premium =
    offer.contractInfo.totalCollateral - offer.offerCollateralSatoshis;

  return {
    ...getOptionInfoFromContractInfo(offer.contractInfo),
    premium,
  };
}
