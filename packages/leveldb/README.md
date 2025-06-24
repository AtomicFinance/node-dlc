# `@node-dlc/leveldb`

LevelDB package for DLC message and transaction storage.

## Overview

This package provides a LevelDB-based storage layer for DLC (Discreet Log Contract) operations. It uses the `classic-level` library to provide a Node.js interface to LevelDB.

## Installation

```bash
npm install @node-dlc/leveldb
```

## Usage

The package provides several store classes for different types of data:

- `LeveldbDlcStore` - For DLC offers, accepts, signs, cancels, closes, and transactions
- `LeveldbOracleStore` - For oracle events and identifiers
- `LeveldbOrderStore` - For order offers and accepts
- `LeveldbWalletStore` - For wallet seed and address cache storage
- `LeveldbIrcStore` - For IRC-related DLC data
- `LeveldbInfoStore` - For DLC statistics and info
- `LeveldbGossipStore` - For gossip protocol data

Each store extends the base `LeveldbBase` class which provides common database operations.
