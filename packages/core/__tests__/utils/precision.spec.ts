// write tests for getPrecision and fromPrecision

import BigNumber from 'bignumber.js';
import { expect } from 'chai';

import { fromPrecision, getPrecision } from '../../lib/utils/Precision';

describe('getPrecision', () => {
  it('should get correct precision for integers', () => {
    const num = new BigNumber(1);
    expect(getPrecision(num)).eq(0);
  });

  it('should get correct precision for multiple decimal points', () => {
    const num = new BigNumber(1.123456789);
    expect(getPrecision(num)).eq(1234567890000000);
  });

  it('should get correct precision for max decimal points', () => {
    const num = new BigNumber('1.112233445566778899');
    expect(getPrecision(num)).eq(1122334455667789);
  });
});

describe('fromPrecision', () => {
  it('should create correct number from precision', () => {
    const num = 12345;
    expect(fromPrecision(num).toFormat()).eq('0.0000000000012345');
  });

  it('should create correct number from precision for max precision', () => {
    const num = 1122334455667788;
    expect(fromPrecision(num).toFormat()).eq('0.1122334455667788');
  });

  it('should throw error if precision is too large', () => {
    const num = Number('11223344556677889');
    expect(() => fromPrecision(num)).to.throw(Error);
  });
});
