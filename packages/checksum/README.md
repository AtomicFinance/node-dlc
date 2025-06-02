# `@node-dlc/checksum`

Calculates a CRC32C checksum based on RFC3720.

## Usage

```typescript
const { crc32c } = require('@node-dlc/checksum');
const checksum = crc32c(Buffer.from("hello")); // 2591144780
```
