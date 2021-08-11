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

  OracleEventContainerV0 = 61632,

  EnumEventDescriptorV0 = 55302,
  DigitDecompositionEventDescriptorV0 = 55306,

  NegotiationFieldsV0 = 55334,
  NegotiationFieldsV1 = 55336,
  NegotiationFieldsV2 = 55346,

  FundingInputV0 = 42772,

  CetAdaptorSignaturesV0 = 42774,

  FundingSignaturesV0 = 42776,

  PayoutFunctionV0 = 42790,

  PolynomialPayoutCurvePiece = 42792, // TODO: Temporary type
  HyperbolaPayoutCurvePiece = 42794, // TODO: Temporary type
  OldHyperbolaPayoutCurvePiece = 42796, // TODO: Remove once all existing contracts have passed

  RoundingIntervalsV0 = 42788,

  DlcOfferV0 = 42778,
  DlcAcceptV0 = 42780,
  DlcSignV0 = 42782,

  DlcCloseV0 = 52170, // TODO: Temporary type
  DlcCancelV0 = 52172,

  /**
   * Dlc Storage Types
   */
  DlcTransactionsV0 = 61230,
  DlcIdsV0 = 61232,

  /**
   * Oracle Identifier
   */
  OracleIdentifierV0 = 61472,

  /**
   * Order Message Types
   */
  OrderOfferV0 = 62770,
  OrderAcceptV0 = 62772,

  OrderNegotiationFieldsV0 = 65334,
  OrderNegotiationFieldsV1 = 65336,

  AddressCache = 65132,

  IrcMessageV0 = 59314,

  NodeAnnouncement = 51394,
  NodeAnnouncementAddress = 51396,
}
