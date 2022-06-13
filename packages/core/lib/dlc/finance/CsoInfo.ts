import {
  ContractDescriptorV1,
  ContractInfo,
  ContractInfoV0,
  DigitDecompositionEventDescriptorV0,
  MessageType,
  PayoutFunctionV0,
  PolynomialPayoutCurvePiece,
} from '@node-dlc/messaging';
import { Value } from '@node-lightning/bitcoin';

import { UNIT_MULTIPLIER } from './Builder';
import { HasContractInfo, HasType } from './OptionInfo';

export interface CsoInfo {
  maxLoss: Value;
  maxGain: Value;
  minPayout: bigint;
  maxPayout: bigint;
  contractSize: Value;
  offerCollateral: Value;
}

export const getCsoInfoFromContractInfo = (
  _contractInfo: ContractInfo,
): CsoInfo => {
  if (_contractInfo.type !== MessageType.ContractInfoV0)
    throw Error('Only ContractInfoV0 currently supported');

  const contractInfo = _contractInfo as ContractInfoV0;
  if (contractInfo.contractDescriptor.type !== MessageType.ContractDescriptorV1)
    throw Error('Only ContractDescriptorV1 currently supported');

  const oracleInfo = contractInfo.oracleInfo;

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
    throw Error('PayoutFunction must have at least one PayoutCurvePiece');
  if (payoutFunction.pieces.length < 3)
    throw Error('Must be at least 3 PayoutCurvePieces');

  const payoutCurvePiece = payoutFunction.pieces[0]
    .payoutCurvePiece as PolynomialPayoutCurvePiece;
  if (payoutCurvePiece.type !== MessageType.PolynomialPayoutCurvePiece)
    throw Error('Must be PolynomialPayoutCurvePiece');

  const initialPiece = payoutFunction.pieces[0];
  const finalPiece = payoutFunction.pieces[1];

  const minPayout = initialPiece.endpointPayout;
  const maxPayout = finalPiece.endpointPayout;

  const startOutcome = initialPiece.endpoint;
  const endOutcome = finalPiece.endpoint;

  const unit = eventDescriptor.unit;

  const defaultContract = Value.fromBitcoin(1);

  const maxGain = Value.fromSats(
    endOutcome * UNIT_MULTIPLIER[unit.toLowerCase()] - defaultContract.sats,
  );
  const maxLoss = Value.fromSats(
    defaultContract.sats - startOutcome * UNIT_MULTIPLIER[unit.toLowerCase()],
  );

  const contractSize = Value.fromSats(contractInfo.totalCollateral);
  const offerCollateral = contractSize.clone();
  offerCollateral.sub(
    Value.fromSats((maxGain.sats * contractSize.sats) / BigInt(1e8)),
  );

  return {
    maxGain,
    maxLoss,
    minPayout,
    maxPayout,
    contractSize,
    offerCollateral,
  };
};

export const getCsoInfoFromOffer = (
  offer: HasContractInfo & HasType,
): CsoInfo => {
  if (
    offer.type !== MessageType.DlcOfferV0 &&
    offer.type !== MessageType.OrderOfferV0
  )
    throw Error('Only DlcOfferV0 and OrderOfferV0 currently supported');

  return getCsoInfoFromContractInfo(offer.contractInfo);
};
