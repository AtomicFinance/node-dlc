import {
  ContractDescriptorType,
  ContractInfo,
  DigitDecompositionEventDescriptor,
  HyperbolaPayoutCurvePiece,
  MessageType,
  MultiOracleInfo,
  NumericalDescriptor,
  PayoutCurvePieceType,
  PayoutFunction,
  SingleContractInfo,
  SingleOracleInfo,
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
  if (_contractInfo.type !== MessageType.SingleContractInfo)
    throw Error('Only SingleContractInfo currently supported');

  const contractInfo = _contractInfo as SingleContractInfo;
  if (
    contractInfo.contractDescriptor.contractDescriptorType !==
    ContractDescriptorType.NumericOutcome
  )
    throw Error('Numeric Descriptor currently supported');

  const oracleInfo = contractInfo.oracleInfo;

  // Handle both SingleOracleInfo and MultiOracleInfo using proper type discrimination
  let eventMaturityEpoch: number;
  let eventDescriptor: DigitDecompositionEventDescriptor;

  switch (oracleInfo.type) {
    case MessageType.SingleOracleInfo: {
      const singleOracleInfo = oracleInfo as SingleOracleInfo;
      eventMaturityEpoch =
        singleOracleInfo.announcement.oracleEvent.eventMaturityEpoch;
      eventDescriptor = singleOracleInfo.announcement.oracleEvent
        .eventDescriptor as DigitDecompositionEventDescriptor;

      if (
        singleOracleInfo.announcement.oracleEvent.eventDescriptor.type !==
        MessageType.DigitDecompositionEventDescriptorV0
      ) {
        throw Error(
          'Only DigitDecompositionEventDescriptorV0 currently supported',
        );
      }
      break;
    }
    case MessageType.MultiOracleInfo: {
      const multiOracleInfo = oracleInfo as MultiOracleInfo;
      eventMaturityEpoch =
        multiOracleInfo.announcements[0].oracleEvent.eventMaturityEpoch;
      eventDescriptor = multiOracleInfo.announcements[0].oracleEvent
        .eventDescriptor as DigitDecompositionEventDescriptor;

      if (
        multiOracleInfo.announcements[0].oracleEvent.eventDescriptor.type !==
        MessageType.DigitDecompositionEventDescriptorV0
      ) {
        throw Error(
          'Only DigitDecompositionEventDescriptorV0 currently supported',
        );
      }
      break;
    }
    default:
      throw Error(`Unknown oracle info type: ${oracleInfo.type}`);
  }

  const { base: oracleBase, nbDigits: oracleDigits } = eventDescriptor;

  const contractDescriptor = contractInfo.contractDescriptor as NumericalDescriptor;
  if (contractDescriptor.payoutFunction.type !== MessageType.PayoutFunction)
    throw Error('Only PayoutFunction currently supported');

  const payoutFunction = contractDescriptor.payoutFunction as PayoutFunction;
  if (payoutFunction.payoutFunctionPieces.length === 0)
    throw Error('PayoutFunction must have at least once PayoutFunctionPiece');
  if (payoutFunction.payoutFunctionPieces.length > 1)
    throw Error('More than one PayoutFunctionPiece not supported');

  const payoutCurvePiece = payoutFunction.payoutFunctionPieces[0]
    .payoutCurvePiece as HyperbolaPayoutCurvePiece;
  if (payoutCurvePiece.payoutCurvePieceType !== PayoutCurvePieceType.Hyperbola)
    throw Error('Must be HyperbolaPayoutCurvePiece');
  if (!payoutCurvePiece.b.isZero() || !payoutCurvePiece.c.isZero())
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
  const contractSize = isAscending
    ? BigInt(payoutCurvePiece.translatePayout.toDecimal().toString()) -
      totalCollateral
    : totalCollateral -
      BigInt(payoutCurvePiece.translatePayout.toDecimal().toString());

  const strikePrice =
    BigInt(payoutCurvePiece.d.toDecimal().toString()) / contractSize;

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

  if (!curve.equals(sanityCurve))
    throw new Error(
      'Payout curve built from extracted OptionInfo does not match original payout curve',
    );

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
