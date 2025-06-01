import { expect } from 'chai';
import { BitField } from '../lib/BitField';

describe('BitField', () => {
  it('should export BitField', () => {
    expect(BitField).to.exist;
  });

  it('should allow creation of BitField', () => {
    const bf = new BitField();
    expect(bf).to.be.instanceOf(BitField);
  });
});
