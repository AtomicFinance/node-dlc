# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-07-15

### New Features

#### Single Funded DLC Support (PR #224)

- **Added single funded DLC detection**: New `singleFunded` flag and methods in `DlcOffer` and `DlcAccept`
- **Auto-detection logic**: Automatically identifies single funded DLC scenarios
- **Updated validation rules**: Enhanced validation for single funded DLC scenarios
- **Comprehensive test coverage**: Added tests for all new single funded functionality

In single funded DLCs:

- `DlcOffer`: `totalCollateral` equals `offerCollateral`
- `DlcAccept`: `acceptCollateral` is typically 0 or minimal

### Bug Fixes

#### Number Input Handling (PR #225)

- **Fixed `computeRoundingModulus`**: Now correctly handles number inputs by converting to satoshis (multiply by 1e8)
- **Preserved existing behavior**: Value objects and BigInt inputs continue to work as before
- **Enhanced test coverage**: Added comprehensive tests for all input types
- **Updated test consistency**: Existing tests now use BigInt for raw satoshi values

Previously, number inputs were incorrectly treated as raw satoshi values instead of bitcoin amounts, leading to incorrect calculations.

### 🔧 Improvements

#### Development Tooling (PR #226)

- **ESLint upgrade**: Updated from v7 to v8 with related plugins
- **TypeScript ESLint upgrade**: Updated from v4 to v5
- **Import/export organization**: Added `simple-import-sort/exports` rule for consistent ordering
- **Type safety improvements**: Fixed TypeScript types (`BigInt` → `bigint`) and enhanced type safety
- **Build configuration**: Updated tsconfig.json files with consistent build output
- **Code quality**: Improved BigNumber usage and better type inference with `as const`

---

## [1.0.0] - 2025-06-30

### 🚨 BREAKING CHANGES

- **DLC Protocol Version 1**: Complete protocol overhaul with new serialization format
- **Message Class Naming**: Removed V0 suffixes from all DLC message classes
- **Incompatible with Previous Versions**: All DLC messages use new format incompatible with v0.x releases
- **Type System Refactor**: Introduced new type enums (ContractInfoType, ContractDescriptorType, OracleInfoType)

### 🚀 Major Features

#### DLC Specifications Compliance (PR #163)

- **Full rust-dlc Compatibility**: 100% compatibility with rust-dlc implementation
- **Protocol Version 1**: Added `PROTOCOL_VERSION = 1` constant
- **Enhanced Type System**: New discriminated union types for better type safety
- **F64 Precision Class**: High-precision floating-point calculations for financial operations
- **Standardized Properties**: Consistent naming across all message types

#### Message System Overhaul

- **New Message Formats**: Complete refactor of DLC message serialization
- **TLV Compatibility**: Preserved forward compatibility with unknown TLV handling
- **Enhanced Oracle Support**: Improved oracle message parsing and compatibility
- **Simplified Class Names**: Cleaner naming convention without version suffixes

### 🔧 Improvements

- **TypeScript Type Safety**: Enhanced type checking with discriminated unions
- **Code Quality**: Standardized formatting and removed duck typing patterns
- **Test Coverage**: 171 passing internal tests with 24 new test vector files
- **Cross-Language Testing**: Compatibility testing infrastructure with rust-dlc
- **Defensive Programming**: Added error handling and validation throughout

### 🐛 Bug Fixes

- **Payout Calculations**: Improved accuracy in payout curve calculations
- **Message Parsing**: Enhanced oracle message parsing compatibility
- **BigInt Handling**: Consolidated BigInt helper functions
- **Import Organization**: Cleaned up package imports and dependencies

### 📦 Package Changes

- **Messaging Package**: F64 class moved to messaging package for better organization
- **Transport Updates**: Updated for new message format compatibility
- **Storage Libraries**: Updated to handle new serialization format
- **CLI Enhancements**: Improved rust-dlc CLI with oracle creation capabilities

### 🧪 Testing

- **Compatibility Tests**: Comprehensive testing against rust-dlc implementation
- **Test Vector Updates**: New test files for protocol version 1 compliance
- **Cross-Platform Testing**: Verified compatibility across different environments
- **Increased Timeout**: Extended compatibility test timeouts for complex scenarios

---

## [0.24.1] - 2025-06-09

### 🔧 Improvements

- **Dependency Updates**: Upgraded `bitcoinjs-lib` to version 6.1.7 across affected packages
  - `@node-dlc/chainmon` - Updated bitcoinjs-lib dependency
  - `@node-dlc/messaging` - Updated bitcoinjs-lib dependency
  - `@node-dlc/transport` - Updated bitcoinjs-lib dependency
- **Security**: Latest bitcoinjs-lib includes security fixes and performance improvements
- **Compatibility**: Enhanced Bitcoin protocol compatibility with latest library version

### 🐛 Bug Fixes

- **Package Dependencies**: Resolved dependency conflicts in affected packages
- **Build Process**: Updated package-lock.json files for consistent dependency resolution

---

## [0.24.0] - 2025-06-02

### 🚀 Major Features

#### Node-Lightning Integration Complete

- **Absorbed deprecated node-lightning packages** into node-dlc, making the project fully self-contained
- **Added new packages** from node-lightning:
  - `@node-dlc/bitcoind` - Bitcoin Core RPC and ZMQ client
  - `@node-dlc/bufio` - Buffer I/O utilities
  - `@node-dlc/checksum` - Checksum utilities (CRC32C)
  - `@node-dlc/crypto` - Cryptographic functions
  - `@node-dlc/wire` - Lightning Network wire protocol
  - `@node-dlc/noise` - Noise protocol implementation
- **Enhanced existing packages** with node-lightning functionality:
  - `@node-dlc/bitcoin` - Added Base58, Script, Tx, and other missing utilities
  - `@node-dlc/core` - Merged lightning utilities while preserving DLC functionality
  - `@node-dlc/logger` - Enhanced with additional features from node-lightning
  - `@node-dlc/chainmon` - Added BlockDiffer and BlockDiffResult functionality

#### Database Migration: RocksDB → LevelDB

- **Migrated from deprecated RocksDB** to actively maintained `classic-level`
- **Renamed package** from `@node-dlc/rocksdb` to `@node-dlc/leveldb`
- **Modern async/await API** replacing legacy stream-based interface
- **Better performance** with native LevelDB implementation

#### Architecture Improvements

- **Created `@node-dlc/common` package** to resolve circular dependencies
- **Moved shared utilities** (BitField, ShortChannelId, ChannelId, Base32) to common package
- **Cleaner dependency hierarchy** with no circular references
- **Improved maintainability** with better separation of concerns

### ⚡ New Features

- **Node.js 20.x Support**: Upgraded ZeroMQ to v6 for full Node.js 20.x compatibility
- **Batch Funding Group TLV**: Added support for batch funding group TLV in DlcSign messages
- **Enhanced DLC Messaging**: Improved DLC message containers with bigsize encoding
- **Modern TypeScript**: Updated to TypeScript 4.9.5 with better type safety

### 🔧 Improvements

- **Dependency Cleanup**: Removed deprecated `bcrypto` package
- **Code Quality**: Fixed linting and formatting across all packages
- **Documentation**: Comprehensive migration guides and technical documentation
- **CI/CD**: Updated GitHub Actions for Node.js 18+ support
- **Test Coverage**: Maintained ~66% test coverage across all packages

### 🏗️ Breaking Changes

- **Node.js 18+ Required**: Minimum Node.js version is now 18 (up from 14)
- **Database Format**: LevelDB format is incompatible with previous RocksDB databases
  - **Migration Required**: Existing databases cannot be directly migrated
  - **Fresh Start**: New projects will use LevelDB format going forward
- **Package Renames**: `@node-dlc/rocksdb` is now `@node-dlc/leveldb`
- **Import Changes**: Some internal imports may need updating (see migration guide)

### 🐛 Bug Fixes

- **Message Size Issues**: Fixed out of range errors in accept and sign messages
- **Missing Dependencies**: Added missing secp256k1 dependency to messaging package
- **TypeScript Compatibility**: Resolved type conflicts with modern TypeScript versions
- **Build Process**: Fixed circular dependency issues preventing successful builds

### 📚 Documentation

- **Migration Guides**: Detailed guides for RocksDB→LevelDB and node-lightning integration
- **API Documentation**: Updated documentation for all new and enhanced packages
- **Technical Summaries**: Comprehensive change documentation for developers
- **README Updates**: Removed references to deprecated components

### 🔄 Internal Changes

- **Lerna Configuration**: Improved monorepo management and publishing workflow
- **ESLint Configuration**: Enhanced linting rules and formatting consistency
- **TypeScript Configuration**: Added `skipLibCheck` for better compatibility
- **Build Optimization**: Streamlined build process across all packages

---

## [0.23.6] - 2024-05-01

### Features

- Added batch funding group TLV to DlcSign message

### Bug Fixes

- Fixed DLC message container size handling to prevent out of range errors
- Added missing length field to BatchFundingGroup TLV

---

## [0.23.5] - 2024-04-14

### Bug Fixes

- Switched DLC message container to bigsize encoding

---

## [0.23.4] - 2024-04-09

### Features

- Added DLC message containers

### Bug Fixes

- Fixed missing length in BatchFundingGroup TLV

---

## Migration Guide

### From 0.23.x to 0.24.0

#### 1. Node.js Version

```bash
# Update to Node.js 18+
nvm install 18
nvm use 18
```

#### 2. Package Updates

```bash
# Update dependencies
npm install
# or
yarn install

# Rebuild all packages
npm run bootstrap
# or
yarn bootstrap
```

#### 3. Database Migration

- **RocksDB databases are not compatible** with the new LevelDB format
- **For new projects**: No action needed, will use LevelDB automatically
- **For existing projects**: Consider if database migration is needed or start fresh

#### 4. Import Updates

```typescript
// Old
import { BitField } from '@node-dlc/core';

// New - still works (re-exported)
import { BitField } from '@node-dlc/core';
// Or use direct import
import { BitField } from '@node-dlc/common';
```

#### 5. Package Renames

```typescript
// Old
import something from '@node-dlc/rocksdb';

// New
import something from '@node-dlc/leveldb';
```

For detailed migration information, see the individual migration guides in the repository.
