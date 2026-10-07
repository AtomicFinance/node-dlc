import { expect } from 'chai';

import { PayoutScriptOverrides } from '../../lib';

const OUTCOME = 'liquidated-by-0x1111111111111111111111111111111111111111';
const SCRIPT = Buffer.from('0014aabb', 'hex');

function record(): PayoutScriptOverrides {
  const overrides = new PayoutScriptOverrides();
  overrides.overrides = [{ outcome: OUTCOME, scriptPubkey: SCRIPT }];
  return overrides;
}

/**
 * The bytes ddk-messages writes for `record()`. Pinned on both sides so a
 * change to either encoder fails here rather than at signature verification.
 */
const WIRE = Buffer.concat([
  Buffer.from('fdfded', 'hex'), // type 65005
  Buffer.from('40', 'hex'), // body length 64
  Buffer.from('01', 'hex'), // one override
  Buffer.from('38', 'hex'), // outcome length 56
  Buffer.from(OUTCOME, 'utf8'),
  Buffer.from('0004', 'hex'), // script length, u16
  SCRIPT,
]);

describe('PayoutScriptOverrides TLV', () => {
  it('encodes to the same bytes as ddk-messages', () => {
    expect(record().serialize()).to.deep.equal(WIRE);
  });

  it('round trips', () => {
    const decoded = PayoutScriptOverrides.deserialize(WIRE);
    expect(decoded.overrides).to.deep.equal(record().overrides);
    expect(decoded.serialize()).to.deep.equal(WIRE);
  });

  it('finds only named outcomes', () => {
    expect(record().scriptFor(OUTCOME)).to.deep.equal(SCRIPT);
    expect(record().scriptFor('released')).to.equal(undefined);
  });
});
