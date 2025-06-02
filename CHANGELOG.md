# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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