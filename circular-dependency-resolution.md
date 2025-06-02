# Circular Dependency Resolution

## Problem
There was a circular dependency between packages:
- `@node-dlc/core` → `@node-dlc/messaging` → `@node-dlc/wire` → `@node-dlc/core`

This prevented the packages from building successfully with `yarn bootstrap`.

## Root Cause
The issue was that node-lightning's core utilities (BitField, ShortChannelId, ChannelId, Base32, etc.) were placed in the core package alongside DLC/finance-specific functionality. The wire package needed these basic utilities, creating the circular dependency.

## Solution
Created a new `@node-dlc/common` package to hold shared utilities that don't have dependencies on other packages:

### 1. Created @node-dlc/common package
- Moved `BitField`, `BigIntUtils`, `Base32`, `ShortChannelId`, `ShortChannelIdUtils`, and `ChannelId` from core to common
- These are fundamental utilities used by multiple packages

### 2. Updated Dependencies
- `@node-dlc/wire`: Now depends on `@node-dlc/common` (instead of core) and `@node-dlc/bitcoin`
- `@node-dlc/core`: Now depends on `@node-dlc/common` and re-exports its types for backward compatibility
- `@node-dlc/messaging`: Now depends on `@node-dlc/common` for BitField

### 3. Import Updates
Fixed imports across all packages:
- Common types (BitField, ShortChannelId, ChannelId, Base32) → from `@node-dlc/common`
- Bitcoin types (Value, Script, Tx, OutPoint, HashValue, etc.) → from `@node-dlc/bitcoin`
- Kept re-exports in core for backward compatibility

### 4. Build Order
Established clear dependency hierarchy:
1. `bufio` (no dependencies)
2. `crypto`, `checksum`, `logger` (only depend on bufio)
3. `bitcoin` (depends on bufio, crypto)
4. `common` (depends on bufio, bitcoin)
5. `noise` (depends on bufio, crypto)
6. `bitcoind` (no internal dependencies)
7. `chainmon` (depends on bitcoin, bitcoind, logger)
8. `wire` (depends on bufio, checksum, common, bitcoin, crypto, logger, noise)
9. `core` (depends on bitcoin, bufio, common, crypto)
10. `messaging` (depends on bitcoin, bufio, checksum, common, crypto, wire)
11. `transport`, `rocksdb` (depend on core, messaging, and others)

## Result
All packages now build successfully without circular dependencies. The separation of concerns is clearer:
- `@node-dlc/common`: Shared utilities and types
- `@node-dlc/core`: DLC/finance-specific core functionality
- `@node-dlc/bitcoin`: Bitcoin-specific types and utilities

## Manual Symlink Creation
Due to lerna issues, packages were manually symlinked:
```bash
cd packages/<package>/node_modules/@node-dlc
ln -s ../../../<dependency> <dependency>
```

This approach successfully resolved the circular dependencies while maintaining backward compatibility. 