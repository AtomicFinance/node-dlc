import { BitcoinErrorCode } from './BitcoinErrorCode';

function getMessage(code: BitcoinErrorCode) {
  switch (code) {
    case BitcoinErrorCode.ValueUnderflow:
      return 'Value underflow';
  }
}

export class BitcoinError extends Error {
  constructor(readonly code: BitcoinErrorCode, readonly info?: any) {
    super(getMessage(code));
    this.name = 'BitcoinError';
  }
}
