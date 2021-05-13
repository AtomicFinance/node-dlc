/**
 * Defined in DLC Daemon API
 * ../../docs/api.md
 */
export enum Endpoint {
  GetInfo = 'getinfo',

  WalletCreate = 'wallet/create',
  WalletNewAddress = 'wallet/newaddress',
  WalletUsedAddresses = 'wallet/usedaddresses',
  WalletBalance = 'wallet/balance',

  WalletUnspent = 'wallet/unspent',
  WalletSendCoins = 'wallet/sendcoins',
  WalletSweepCoins = 'wallet/sweepcoins',
  WalletSendMany = 'wallet/sendmany',

  OrderOffer = 'order/offer',
  OrderAccept = 'order/accept',

  DlcOffer = 'dlc/offer',
  DlcAccept = 'dlc/accept',
  DlcSign = 'dlc/sign',
  DlcFinalize = 'dlc/finalize',
  DlcExecute = 'dlc/execute',
  DlcRefund = 'dlc/refund',
  DlcContract = 'dlc/contract',

  OracleAnnouncement = 'oracle/announcement',
  OracleAttestation = 'oracle/attestation',

  OptionContractInfo = 'option/contractinfo',
  OptionOffer = 'option/offer',

  IrcOffer = 'irc/offer',
  IrcAccept = 'irc/accept',
  IrcSign = 'irc/sign',

  ContractInfo = 'contract/info',
}
