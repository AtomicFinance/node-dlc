/**
 * Defined in DLC Messaging Spec
 * https://github.com/discreetlogcontracts/dlcspecs/blob/master/Messaging.md
 */

// Protocol version as defined in dlcspecs PR #163
export const PROTOCOL_VERSION = 1;

// Wire message types (remain unchanged for backward compatibility)
export enum MessageType {
  // Core DLC Message Types (remain as wire format with u16 prefix)
  DlcOfferV0 = 42778,
  DlcAcceptV0 = 42780,
  DlcSignV0 = 42782,

  // Legacy contract types (keeping for backward compatibility during transition)
  ContractInfoV0 = 55342,
  ContractInfoV1 = 55344,

  ContractDescriptorV0 = 42768,
  ContractDescriptorV1 = 42784,

  OracleInfoV0 = 42770,
  OracleInfoV1 = 42786,
  OracleInfoV2 = 55340,

  OracleParamsV0 = 55338,

  // Oracle message types (remain as TLV for backward compatibility)
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

  DlcCloseV0 = 52170, // TODO: Temporary type
  DlcCancelV0 = 52172,

  /**
   * Dlc Storage Types
   */
  DlcTransactionsV0 = 61230,
  DlcIdsV0 = 61232,
  DlcInfoV0 = 61234,

  /**
   * Oracle Identifier
   */
  OracleIdentifierV0 = 61472,

  /**
   * Order Message Types
   */
  OrderOfferV0 = 62770,
  OrderAcceptV0 = 62772,
  OrderMetadataV0 = 62774,
  OrderIrcInfoV0 = 62776,
  OrderPositionInfoV0 = 62778,

  OrderNegotiationFieldsV0 = 65334,
  OrderNegotiationFieldsV1 = 65336,

  AddressCache = 65132,

  BatchFundingGroup = 65430,

  IrcMessageV0 = 59314,

  NodeAnnouncement = 51394,
  NodeAnnouncementAddress = 51396,
}

// New sub-type identifiers for sibling sub-types (as per dlcspecs PR #163)
export enum ContractInfoType {
  Single = 0,
  Disjoint = 1,
}

export enum ContractDescriptorType {
  Enumerated = 0,
  NumericOutcome = 1,
}

export enum OracleInfoType {
  Single = 0,
  Multi = 1,
}

export enum NegotiationFieldsType {
  Single = 0,
  Disjoint = 1,
}

export enum PayoutCurvePieceType {
  Polynomial = 0,
  Hyperbola = 1,
}
