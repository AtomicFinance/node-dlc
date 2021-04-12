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

  OrderOffer = 'order/offer',
  OrderAccept = 'order/accept',

  DlcOffer = 'dlc/offer',
  DlcAccept = 'dlc/accept',
  DlcSign = 'dlc/sign',
  DlcFinalize = 'dlc/finalize',
  DlcExecute = 'dlc/execute',
  DlcRefund = 'dlc/refund',

  ContractInfo = 'contract/info',
}
