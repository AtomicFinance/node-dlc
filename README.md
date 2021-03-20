# Node-DLC

## Description

Node-DLC is a an implementation of Bitcoin DLC Protocol in the Node.js runtime, with CET signature generation achieved with [cfd-dlc](https://github.com/cryptogarageinc/cfd-dlc-js) wrapper (written in C++).

## Modules
- [@node-dlc/cli](https://github.com/atomicfinance/node-dlc/tree/master/packages/cli)
- [@node-dlc/core](https://github.com/atomicfinance/node-dlc/tree/master/packages/core)
- [@node-dlc/daemon](https://github.com/atomicfinance/node-dlc/tree/master/packages/daemon)
- [@node-dlc/logger](https://github.com/atomicfinance/node-dlc/tree/master/packages/logger)
- [@node-dlc/messaging](https://github.com/atomicfinance/node-dlc/tree/master/packages/messaging)
- [@node-dlc/rocksdb](https://github.com/atomicfinance/node-dlc/tree/master/packages/rocksdb)

## Dependencies

Many elements of the project as well as components are inspired by [Node-Lightning](https://github.com/altangent/node-lightning/), an Node.js implementation of the Bitcoin Lightning Network. The project also uses several packages such as:
- [@node-lightning/bitcoin](https://github.com/altangent/node-lightning/tree/main/packages/bitcoin)
- [@node-lightning/bufio](https://github.com/altangent/node-lightning/tree/main/packages/bufio)
- [@node-lightning/core](https://github.com/altangent/node-lightning/tree/main/packages/core)
[@node-lightning/crypto](https://github.com/altangent/node-lightning/tree/main/packages/crypto)
- [@node-lightning/gossip-rocksdb](https://github.com/altangent/node-lightning/tree/main/packages/gossip-rocksdb)
- [@node-lightning/logger](https://github.com/altangent/node-lightning/tree/main/packages/logger)
- [@node-lightning/wire](https://github.com/altangent/node-lightning/tree/main/packages/wire)

## Development

```bash
yarn install
yarn bootstrap
yarn test
```
