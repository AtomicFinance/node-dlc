/**
 * Defined in DLC Messaging Spec
 * https://github.com/discreetlogcontracts/dlcspecs/blob/master/Messaging.md
 */
export enum MessageType {
  ContractInfoV0 = 55342,
  ContractInfoV1 = 55344,

  ContractDescriptorV0 = 42768,
  ContractDescriptorV1 = 42784,

  OracleInfoV0 = 42770,
  OracleInfoV1 = 42786,
  OracleInfoV2 = 55340,

  OracleParamsV0 = 55338,

  OracleAnnouncementV0 = 55332,
  OracleAttestationV0 = 55400,
  OracleEventV0 = 55330,

  EnumEventDescriptorV0 = 55302,
  DigitDecompositionEventDescriptorV0 = 55306,

  NegotiationFieldsV0 = 55334,
  NegotiationFieldsV1 = 55336,
  NegotiationFieldsV2 = 55346,

  FundingInputV0 = 42772,

  CetAdaptorSignaturesV0 = 42774,

  FundingSignaturesV0 = 42776,

  PayoutFunctionV0 = 42790,

  PolynomialPayoutCurvePiece = 42794, // TODO: Temporary type
  HyperbolaPayoutCurvePiece = 42796, // TODO: Temporary type

  RoundingIntervalsV0 = 42788,

  DlcOfferV0 = 42778,
  DlcAcceptV0 = 42780,
  DlcSignV0 = 42782,

  /**
   * Dlc Storage Types
   */
  DlcTransactionsV0 = 61230,

  /**
   * Order Message Types
   */
  OrderOfferV0 = 62770,
  OrderAcceptV0 = 62772,

  OrderNegotiationFieldsV0 = 65334,
  OrderNegotiationFieldsV1 = 65336,

  AddressCache = 65132,
  ChainCache = 65134,
}
