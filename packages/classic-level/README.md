# @node-dlc/classic-level

This package provides a basic datalayer built on top of [classic-level](https://github.com/Level/classic-level). It mirrors the interface used by the RocksDB based stores but does not require the `rocksdb` native module.

## Usage

```ts
import { ClassicLevelBase } from '@node-dlc/classic-level';

class MyStore extends ClassicLevelBase {
  async save(key: Buffer, value: Buffer) {
    await this._db.put(key, value);
  }

  async load(key: Buffer) {
    return this._safeGet<Buffer>(key);
  }
}

const store = new MyStore('./mydb');
await store.open();
await store.save(Buffer.from('a'), Buffer.from('b'));
const value = await store.load(Buffer.from('a'));
```

The API is the same as the RocksDB based `RocksdbBase` class. Internally it uses `classic-level` instead of the deprecated `rocksdb` package.
