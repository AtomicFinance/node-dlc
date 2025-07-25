/**
 * Defined in DLC Messaging Spec
 * https://github.com/discreetlogcontracts/dlcspecs/blob/master/Messaging.md
 */

// Protocol version as defined in dlcspecs PR #163
export const PROTOCOL_VERSION = 1;

// Wire message types (remain unchanged for backward compatibility)
export enum MessageType {
  // Core DLC Message Types (remain as wire format with u16 prefix)
  DlcOffer = 42778,
  DlcAccept = 42780,
  DlcSign = 42782,

  // Legacy contract types (keeping for backward compatibility during transition)
  ContractInfoV0 = 55342,
  SingleContractInfo = 55342,
  ContractInfoV1 = 55344,
  DisjointContractInfo = 55344,

  ContractDescriptorV0 = 42768,
  ContractDescriptorV1 = 42784,

  OracleInfoV0 = 42770,
  SingleOracleInfo = 42770,
  OracleInfoV1 = 42786,
  MultiOracleInfo = 42786,
  OracleInfoV2 = 55340,

  OracleParamsV0 = 55338,

  // Oracle message types (remain as TLV for backward compatibility)
  OracleAnnouncement = 55332,
  OracleAnnouncementV0 = OracleAnnouncement, // Backward compatibility alias
  OracleAttestation = 55400,
  OracleAttestationV0 = OracleAttestation, // Backward compatibility alias
  OracleEvent = 55330,
  OracleEventV0 = OracleEvent, // Backward compatibility alias

  OracleEventContainer = 61632,

  EnumEventDescriptor = 55302,
  EnumEventDescriptorV0 = EnumEventDescriptor, // Backward compatibility alias

  DigitDecompositionEventDescriptor = 55306,
  DigitDecompositionEventDescriptorV0 = DigitDecompositionEventDescriptor, // Backward compatibility alias

  NegotiationFieldsV0 = 55334,
  NegotiationFieldsV1 = 55336,
  NegotiationFieldsV2 = 55346,

  FundingInput = 42772,
  FundingInputV0 = FundingInput, // Backward compatibility alias

  DlcInput = 42773,

  CetAdaptorSignatures = 42774,
  CetAdaptorSignaturesV0 = CetAdaptorSignatures, // Backward compatibility alias

  FundingSignatures = 42776,
  FundingSignaturesV0 = FundingSignatures, // Backward compatibility alias

  PayoutFunction = 42790,
  PayoutFunctionV0 = PayoutFunction, // Backward compatibility alias

  // PayoutCurvePiece types - kept for backward compatibility
  PolynomialPayoutCurvePiece = 42792,
  HyperbolaPayoutCurvePiece = 42794,
  OldHyperbolaPayoutCurvePiece = 42796, // Legacy support

  RoundingIntervals = 42788,
  RoundingIntervalsV0 = RoundingIntervals, // Backward compatibility alias

  DlcClose = 52170, // TODO: Temporary type
  DlcCancel = 52172,

  /**
   * Dlc Storage Types
   */
  DlcTransactions = 61230,
  DlcTransactionsV0 = DlcTransactions, // Backward compatibility alias
  DlcIds = 61232,
  DlcIdsV0 = DlcIds, // Backward compatibility alias
  DlcInfo = 61234,
  DlcInfoV0 = DlcInfo, // Backward compatibility alias

  /**
   * Oracle Identifier
   */
  OracleIdentifier = 61472,
  OracleIdentifierV0 = OracleIdentifier, // Backward compatibility alias

  /**
   * Order Message Types
   */
  OrderOffer = 62770,
  OrderAccept = 62772,
  OrderMetadataV0 = 62774,
  OrderIrcInfoV0 = 62776,
  OrderPositionInfo = 62778,

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
