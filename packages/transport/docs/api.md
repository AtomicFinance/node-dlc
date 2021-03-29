# DLC Transport Daemon

## Contract Negotiation

#### Basic DLC Specs Protocol Contract Negotiation
The [DLC Specification](https://github.com/discreetlogcontracts/dlcspecs) outlines [contract negotiation](https://github.com/discreetlogcontracts/dlcspecs/blob/master/Protocol.md#contract-negotiation) in a simple 4 step process. This assumes both parties are already matched or familiar with each other and are both running nodes. 

```
+-------+                    +-------+
|       |                    |       |
|       |---- (1) offer  --->|       |
|       |                    |       |
|       |<--- (2) accept ----|       |
|   A   |                    |   B   |
|       |---- (3) sign   --->|       |
|       |                    |       |
|       |                    |  (4) broadcast fund-tx
|       |                    |       |
+-------+                    +-------+

    - where node A is 'offerer' and node B is 'accepter'
```

#### DLC Market Contract Negotiation
Contract negotiation within the DLC Market is a 6 step process that assumes both parties have no knowledge of the other and one party is running a DLC Node. 

Specifically, this DLC transport daemon is designed with the assumption that the market `maker` is running a node, while the `taker` is a client.

It uses an IRC channel for broadcasting [Order Offers](https://github.com/atomicfinance/node-dlc/blob/master/packages/messaging/lib/messages/OrderOffer.ts#L26) and IRC private message for receiving [Order Accepts](https://github.com/atomicfinance/node-dlc/blob/master/packages/messaging/lib/messages/OrderAccept.ts#L26) which allows both parties to agree to contract terms before revealing funding inputs and commencing signature generation.

```
+-------+                       +---------------+        +-------+
|       |                       |IRC Trading Pit|        |       |
|       |+---(1) order offer--->|               |+------>|       |
|       |                       +---------------+        |       |
|       |                                                |       |
|       |                       +---------------+        |       |
|       |<---(2) order accept--+|IRC Private Msg|<------+|       |
|       |                       +---------------+        |       |
|       |                                                |       |
|   A   |                       +---------------+        |   B   |
|       |+---(3) dlc offer----->| Bob Transport |+------>|       |
|       |                       |    Server     |        |       |
|       |<---(4) dlc accept----+|               |<------+|       |
|       |                       |               |        |       |
|       |+---(5) dlc sign------>|               |+------>|       |
|       |                       |               |        |       |
|       |<---(6) dlc finalize--+|               |<------+|  (6) broadcast fund-tx
+-------+                       +---------------+        +-------+

    - where client A is 'offerer' and node B is 'accepter'
```

## Authentication

Authentication is accomplished via HTTP basic Auth, using your daemon's API Key. One will be randomly generated if no key was chosen. An API key can be chosen with the `--api-key` option.

## General

### Available Endpoints

##### Contract Creation/Closing Endpoints

| Method   | Path                                      | Description                                                    |
| -------- | ----------------------------------------- | -------------------------------------------------------------- |
| GET      | `/api/v1/order/offers`                    | Retrieve all order offers                                      |
| GET      | `/api/v1/order/offers/:tempOrderId`       | Retrieve order offers by `tempOrderId`                         |
| POST     | `/api/v1/order/offers`                    | Place an order offer                                           |
| GET      | `/api/v1/order/accepts`                   | Retrieve all order accepts                                     |
| GET      | `/api/v1/order/accepts/:orderId`          | Retrieve order accepts by `orderId`                            |
| POST     | `/api/v1/order/accepts`                   | Reply to order offer with acceptance                           |
| GET      | `/api/v1/contract/offers`                 | Retrieve all contract offers                                   |
| GET      | `/api/v1/contract/offers/:tempContractId` | Retrieve contract offers by `tempContractId`                   |
| POST     | `/api/v1/contract/offers`                 | Create Contract Offer (Dlc Offer V0) and send to counterparty  |
| GET      | `/api/v1/contract/accepts`                | Retrieve all contract accepts                                  |
| GET      | `/api/v1/contract/accepts/:contractId`    | Retrieve contract accepts by `contractId`                      |
| POST     | `/api/v1/contract/accepts`                | Create Contract Accept (Dlc Accept V0)                         |
| GET      | `/api/v1/contract/signs`                  | Retrieve all contract signs                                    |
| GET      | `/api/v1/contract/signs/:contractId`      | Retrieve contract signs by `contractId`                        |
| POST     | `/api/v1/contract/signs`                  | Create Contract Sign (Dlc Sign V0) and send to counterparty    |
| GET      | `/api/v1/contract/finalize`               | Retrieve all contract finalize                                 |
| GET      | `/api/v1/contract/finalize/:contractId`   | Retrieve contract signs by `contractId`                        |
| POST     | `/api/v1/contract/finalize`               | Create Contract Finalize                                       |
| POST     | `/api/v1/contract/broadcast`              | Broadcast DLC Funding Tx                                       |
| POST     | `/api/v1/contract/close`                  | Close Contract using oracle attestation                        |
| POST     | `/api/v1/contract/cancel`                 | Cancel Contract                                                |
| GET      | `/api/v1/contracts`                       | Retrieve all contracts                                         |
| GET      | `/api/v1/contracts/:contractId`           | Retrieve contract signs by `contractId`                        |
| GET      | `/api/v1/orders/open`                     | Retrieve list of orders                                        |
| GET      | `/api/v1/positions`                       | Retrieve current positions                                     |

##### Contract Interaction Endpoints for IRC Transport
Endpoints that allow a client to fetch contract state from transport daemon

Note: IRC Nickname refers to counterparty

| Method   | Path                         | Description                                                                              |
| -------- | ---------------------------  | ---------------------------------------------------------------------------------------- |
| POST     | `/api/v1/contract/:ircNickname/offers`                  | Send contract offer to counterparty                           |
| GET      | `/api/v1/contract/:ircNickname/accepts`                 | Retrieve all contract accepts by `ircNickname`                |
| GET      | `/api/v1/contract/:ircNickname/accepts/:tempContractId` | Retrieve contract accept by `ircNickname` and `tempContractId` |
| POST     | `/api/v1/contract/:ircNickname/signs`                   | Send contract sign to counterparty                            |
| GET      | `/api/v1/contract/:ircNickname/:contractId`             | Retrieve contract by `ircNickname` and `tempContractId`       |

### Websockets

WIP
- subscribe to IRC trading pit
- subscribe to IRC private messages
- subscribe to post requests at endpoint `/api/v1/contract/:ircNickname/offers` and `/api/v1/contract/:ircNickname/signs`

### Node.js environment

```js
// --------------------------
// Example with websockets:
// --------------------------
const WebSocket = require('ws');
const fs = require('fs');
let ws = new WebSocket('wss://localhost:9575/ws/api/v1', {
   headers: {
    Authorization: `Basic ${apikey}`,
  },
});

ws.on('message', function(body) {
  console.log(body)
})
```
