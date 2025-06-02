# Node DLC

Node DLC is a Discreet Log Contract (DLC) client written in TypeScript that allows you to create, manage, and execute DLCs on the Bitcoin blockchain.

## Overview

Discreet Log Contracts (DLCs) are a type of smart contract that enables conditional payments on Bitcoin based on outcomes of real-world events, as determined by oracles. This implementation provides a complete toolkit for building DLC applications.

## Features

- 🔐 Complete DLC protocol implementation
- 📡 IRC transport layer for peer communication
- 💾 RocksDB storage backend (migrated to classic-level)
- 🔗 Bitcoin blockchain integration
- 📊 Oracle integration for external data
- 🛠️ Comprehensive development tools

## Project Structure

This project was inspired by [Node-Lightning](https://github.com/altangent/node-lightning/) and has now absorbed its functionality. The monorepo contains the following packages:

### Core Packages

- `@node-dlc/bitcoin` - Bitcoin primitives and utilities
- `@node-dlc/core` - Core DLC functionality and types
- `@node-dlc/messaging` - DLC messaging protocol implementation
- `@node-dlc/leveldb` - Storage layer using classic-level
- `@node-dlc/transport` - Network transport layer (IRC)

### Supporting Packages

- `@node-dlc/bitcoind` - Bitcoin Core RPC and ZMQ client
- `@node-dlc/bufio` - Buffer I/O utilities
- `@node-dlc/chainmon` - Blockchain monitoring tools
- `@node-dlc/checksum` - Checksum utilities
- `@node-dlc/crypto` - Cryptographic functions
- `@node-dlc/logger` - Logging infrastructure
- `@node-dlc/noise` - Noise protocol implementation
- `@node-dlc/wire` - Lightning Network wire protocol

## Installation

```bash
# Clone the repository
git clone https://github.com/atomicfinance/node-dlc.git
cd node-dlc

# Install dependencies and bootstrap packages
yarn install
yarn bootstrap
```

## Requirements

- Node.js v18+
- Yarn package manager
- Bitcoin Core node (for blockchain interaction)

## Development

```bash
# Build all packages
yarn build

# Run tests
yarn test

# Lint code
yarn lint

# Format code
yarn format
```

## Usage

See individual package READMEs for specific usage instructions.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see LICENSE file for details.

## Acknowledgments

This project builds upon the architecture and components originally developed in the Node-Lightning project.
