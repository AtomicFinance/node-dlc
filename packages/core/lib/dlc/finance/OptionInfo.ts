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
import { CoveredCall } from './CoveredCall';
import { ShortPut } from './ShortPut';

export interface OptionInfo {
  contractSize: bigint;
  strikePrice: bigint;
  premium?: bigint;
  type?: OptionType;
  expiry: Date;
}

export type HasOfferCollateral = {
  offerCollateral: bigint;
};

export type HasContractInfo = {
  contractInfo: ContractInfo;
};

export type HasType = {
  type: MessageType;
};

export type OptionType = 'put' | 'call';

export function getOptionInfoFromContractInfo(
  _contractInfo: ContractInfo,
): OptionInfo {
  if (_contractInfo.type !== MessageType.ContractInfoV0)
    throw Error('Only ContractInfoV0 currently supported');

  const contractInfo = _contractInfo as ContractInfoV0;
  if (contractInfo.contractDescriptor.type !== MessageType.ContractDescriptorV1)
    throw Error('Only ContractDescriptorV1 currently supported');

  const oracleInfo = contractInfo.oracleInfo;

  // Handle both SingleOracleInfo and MultiOracleInfo
  let eventMaturityEpoch: number;
  let eventDescriptor: DigitDecompositionEventDescriptorV0;

  if ('announcement' in oracleInfo) {
    // SingleOracleInfo
    const singleOracleInfo = oracleInfo as any;
    eventMaturityEpoch =
      singleOracleInfo.announcement.oracleEvent.eventMaturityEpoch;
    eventDescriptor = singleOracleInfo.announcement.oracleEvent
      .eventDescriptor as DigitDecompositionEventDescriptorV0;

    if (
      singleOracleInfo.announcement.oracleEvent.eventDescriptor.type !==
      MessageType.DigitDecompositionEventDescriptorV0
    )
      throw Error(
        'Only DigitDecompositionEventDescriptorV0 currently supported',
      );
  } else if ('announcements' in oracleInfo) {
    // MultiOracleInfo
    const multiOracleInfo = oracleInfo as any;
    eventMaturityEpoch =
      multiOracleInfo.announcements[0].oracleEvent.eventMaturityEpoch;
    eventDescriptor = multiOracleInfo.announcements[0].oracleEvent
      .eventDescriptor as DigitDecompositionEventDescriptorV0;

    if (
      multiOracleInfo.announcements[0].oracleEvent.eventDescriptor.type !==
      MessageType.DigitDecompositionEventDescriptorV0
    )
      throw Error(
        'Only DigitDecompositionEventDescriptorV0 currently supported',
      );
  } else {
    throw Error('Unknown oracle info type');
  }

  const { base: oracleBase, nbDigits: oracleDigits } = eventDescriptor;

  const contractDescriptor = contractInfo.contractDescriptor as ContractDescriptorV1;
  if (contractDescriptor.payoutFunction.type !== MessageType.PayoutFunctionV0)
    throw Error('Only PayoutFunctionV0 currently supported');

  const payoutFunction = contractDescriptor.payoutFunction as PayoutFunctionV0;
  if (payoutFunction.payoutFunctionPieces.length === 0)
    throw Error('PayoutFunction must have at least once PayoutFunctionPiece');
  if (payoutFunction.payoutFunctionPieces.length > 1)
    throw Error('More than one PayoutFunctionPiece not supported');

  const payoutCurvePiece = payoutFunction.payoutFunctionPieces[0]
    .payoutCurvePiece as HyperbolaPayoutCurvePiece;
  if (
    payoutCurvePiece.type !== MessageType.HyperbolaPayoutCurvePiece &&
    payoutCurvePiece.type !== MessageType.OldHyperbolaPayoutCurvePiece
  )
    throw Error('Must be HyperbolaPayoutCurvePiece');
  if (!payoutCurvePiece.b.eq(0) || !payoutCurvePiece.c.eq(0))
    throw Error('b and c HyperbolaPayoutCurvePiece values must be 0');

  const curve = HyperbolaPayoutCurve.fromPayoutCurvePiece(payoutCurvePiece);
  const maxOutcome = BigInt(
    new BN(oracleBase).pow(oracleDigits).minus(1).toString(10),
  );

  // For the new PayoutFunction structure, we need to get the initial payout from the first piece
  const initialPayout =
    payoutFunction.payoutFunctionPieces[0].endPoint.outcomePayout;
  const isAscending = curve.getPayout(maxOutcome).gt(Number(initialPayout));

  const expiry = new Date(eventMaturityEpoch * 1000);
  const totalCollateral = contractInfo.totalCollateral;

  // if curve is ascending, assume it is a put.
  const translatePayoutBigInt = BigInt(
    Math.round(payoutCurvePiece.translatePayout.toNumber()),
  );
  const dBigInt = BigInt(Math.round(payoutCurvePiece.d.toNumber()));

  const contractSize = isAscending
    ? translatePayoutBigInt - totalCollateral
    : totalCollateral - translatePayoutBigInt;

  // Use precise calculation to avoid integer division precision loss
  // Instead of strikePrice = d / contractSize, calculate the exact fractional strikePrice
  // that when multiplied by contractSize gives back the original d value
  const strikePriceBN = new BN(dBigInt.toString()).dividedBy(
    new BN(contractSize.toString()),
  );
  const strikePrice = BigInt(strikePriceBN.integerValue().toString());

  // rebuild payout curve from option info and perform a sanity check
  const { payoutCurve: sanityCurve } = isAscending
    ? ShortPut.buildCurve(
        strikePrice,
        contractSize,
        totalCollateral,
        oracleBase,
        oracleDigits,
      )
    : CoveredCall.buildCurve(
        strikePrice,
        contractSize,
        oracleBase,
        oracleDigits,
      );
  const type = isAscending ? 'put' : 'call';

  // Check if curves are approximately equal using F64 equality methods
  const originalPiece = curve.toPayoutCurvePiece();
  const rebuiltPiece = sanityCurve.toPayoutCurvePiece();

  const curvesMatch =
    originalPiece.a.eq(rebuiltPiece.a) &&
    originalPiece.b.eq(rebuiltPiece.b) &&
    originalPiece.c.eq(rebuiltPiece.c) &&
    originalPiece.d.eq(rebuiltPiece.d) &&
    originalPiece.translateOutcome.eq(rebuiltPiece.translateOutcome) &&
    originalPiece.translatePayout.eq(rebuiltPiece.translatePayout);

  if (!curvesMatch) {
    throw new Error(
      'Payout curve built from extracted OptionInfo does not match original payout curve',
    );
  }

  return { contractSize, strikePrice, expiry, type };
}

export function getOptionInfoFromOffer(
  offer: HasOfferCollateral & HasContractInfo & HasType,
): OptionInfo {
  if (
    offer.type !== MessageType.DlcOffer &&
    offer.type !== MessageType.OrderOffer
  )
    throw Error('Only DlcOffer and OrderOffer currently supported');

  const premium = offer.contractInfo.totalCollateral - offer.offerCollateral;

  return {
    ...getOptionInfoFromContractInfo(offer.contractInfo),
    premium,
  };
}
