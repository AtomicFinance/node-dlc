# DLC Daemon

## Authentication

Authentication is accomplished via HTTP basic Auth, using your daemon's API Key. One will be randomly generated if no key was chosen. An API key can be chosen with the `--api-key` option.

### All Endpoints

| Method   | Path                            | Description                          |
| -------- | ------------------------------- | ------------------------------------ |
| GET      | `/v1/getinfo`                   | Retrieve info about the DLC Node     |
| POST     | `/v1/wallet/create`             | Initialize DLC Node with Wallet      |
| GET      | `/v1/order/offer/:tempOrderId`  | Get Order Offer by `tempOrderId`     |
| POST     | `/v1/order/offer`               | Create Order Offer                   |
| GET      | `/v1/order/accept/:orderId`     | Get Order Accept by `orderId`        |
| POST     | `/v1/order/accept`              | Create Order Accept                  |
| GET      | `/v1/dlc/offer/:tempContractId` | Get Dlc Offer by `tempContractId`    |
| POST     | `/v1/dlc/offer`                 | Create Dlc Offer                     |
| GET      | `/v1/dlc/accept`                | Get Dlc Accept by `contractId`       | 
| POST     | `/v1/dlc/accept`                | Create Dlc Accept                    |
| GET      | `/v1/dlc/sign`                  | Get Dlc Sign by `contractId`         | 
| POST     | `/v1/dlc/sign`                  | Create Dlc Sign                      |
| POST     | `/v1/dlc/finalize`              | Create Dlc Finalize                  |
| GET      | `/v1/dlc/contract/:contractId`  | Get DLC Contract Info by `contractId`|
| POST     | `/v1/dlc/execute`               | Execute DLC                          |
| POST     | `/v1/dlc/refund`                | Refund DLC                           |

## General

```shell
dlccli getinfo
```

```shell
curl -X GET -u admin:api_key \
  -H "Content-Type: application/json" \
  "http://127.0.0.1:8575/v1/getinfo"
```

> Returns:

```shell
{
  version: '0.1.0',
  num_dlc_offers: 0,
  num_dlc_accepts: 0,
  num_dlc_signs: 0
}
```

## Wallet

```shell
dlccli create
```

```shell
curl -X POST -u admin:api_key \
  -H "Content-Type: application/json" \
  -d '{}' \
  "http://127.0.0.1:8575/v1/wallet/create"
```

> Returns:

```shell
!!!YOU MUST WRITE DOWN THIS SEED TO BE ABLE TO RESTORE THE WALLET!!!

- - - - - - - - - - - - BEGIN DLCD CIPHER SEED - - - - - - - - - - - -

...

- - - - - - - - - - - - - END DLCD CIPHER SEED - - - - - - - - - - - - -

!!!YOU MUST WRITE DOWN THIS SEED TO BE ABLE TO RESTORE THE WALLET!!!
```

```shell
{"mnemonic":"..."}
```

## DLC

### Order

#### Offer

```shell
dlccli createdlcorderoffer [contractInfo] [collateral] [feerate] [locktime] [refundlocktime]
```

> Returns:

```shell
CLI
[dlcOrderOfferTLV
1. type: 62770 (OrderOfferV0)
2. data:
  - [chainHash:chainHash]
  - [contractInfo: contractInfo]
  - [u64:offerCollateralSatoshis]
  - [u64:feeRatePerVb]
  - [u32:cetLocktime]
  - [u32:refundLocktime]
]
```

```json
JSON
{
  type: 62770,
  chainHash: "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
  contractInfo: {
    type: 55342,
    totalCollateral: 200000000,
    contractDescriptor: {
      type: 42768,
      outcomes: [...]
    },
    oracleInfo: {
      type: 42770,
      announcement: {...}
    }
  },
  offerCollateralSatoshis: 100000000,
  feeRatePerVb: 30,
  cetLocktime: 1619654940,
  refundLocktime: 1622246940
}
```

#### Accept

```shell
dlccli acceptdlcorderoffer [orderOffer] [contractInfo?] [collateral?] [feerate?] [locktime?] [refundlocktime?]
```

> Returns:

```shell
[DlcOrderAcceptTLV
1. type: 62772 (OrderAcceptV0)
2. data:
  - [32*byte:tempOrderId]
  - [orderNegotiationFields: orderNegotiationFields]
]
```

### Contract

#### Offer

```shell
dlccli createdlcoffer [contractInfo] [collateral] [feerate] [locktime] [refundlocktime]
```

> Returns:

```shell
[DlcOfferTLV
1. type: 42778 (DlcOfferV0)
2. data:
  - [byte:contract_flags]
  - [chain_hash:chain_hash]
  - [contract_info:contract_info]
  - [point:funding_pubkey]
  - [spk:payout_spk]
  - [u64:payout_serial_id]
  - [u64:offer_collateral_satoshis]
  - [u16:num_funding_inputs]
  - [num_funding_inputs*funding_input:funding_inputs]
  - [spk:change_spk]
  - [u64:change_serial_id]
  - [u64:fund_output_serial_id]
  - [u64:feerate_per_vb]
  - [u32:cet_locktime]
  - [u32:refund_locktime]
]
// https://github.com/discreetlogcontracts/dlcspecs/blob/master/Protocol.md#the-offer_dlc-message
```

```json

```

#### Accept

```shell
dlccli acceptdlcoffer [dlcOffer]
```

#### Sign

```shell
dlccli signdlcaccept [dlcAccept]
```

#### Finalize

```shell
dlccli finalizedlcsign [dlcSign]
```

```shell
getdlcfundingtx [contractId]
```

---

```shell
dlccli acceptdlcofferfromfile [filepath]
```

```shell
dlccli signdlcacceptfromfile [filepath]
```

```shell
dlccli finalizedlcsignfromfile [filepath]
```

---

### Execute DLC

```shell
getdlcexecutetx [contractId] [oracleAttestationTLV]
```

```shell
getdlcrefundtx [contractId]
```

### Getters

```shell
getdlcoffer [tempContractId]
```

```shell
getdlcaccept [contractId]
```

```shell
getdlcsign [contractId]
```

```shell
getdlctxs [tempContractId] or [contractId]
```
