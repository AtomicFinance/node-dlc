import { expect } from 'chai';

import { PayoutScriptOverrides } from '../../lib';

const OUTCOME = 'liquidated-by-0x1111111111111111111111111111111111111111';
const ENUM_SCRIPT = Buffer.from('0014aabb', 'hex');
const NUMERIC_SCRIPT = Buffer.from('0014cc', 'hex');

/** The record dlcdevkit pins in dlc-messages/src/payout_overrides.rs. */
function record(): PayoutScriptOverrides {
  const overrides = new PayoutScriptOverrides();
  overrides.overrides = [
    { outcome: { type: 'enum', outcome: OUTCOME }, scriptPubkey: ENUM_SCRIPT },
    {
      outcome: { type: 'numeric', start: BigInt(0), end: BigInt(499) },
      scriptPubkey: NUMERIC_SCRIPT,
    },
  ];
  return overrides;
}

/**
 * The bytes dlcdevkit's `encodes_to_the_pinned_bytes` test writes out for
 * `record()`. A change to either encoder fails here rather than at
 * signature verification.
 */
const WIRE = Buffer.concat([
  Buffer.from('fdfded', 'hex'), // type 65005
  Buffer.from('57', 'hex'), // body length 87
  Buffer.from('02', 'hex'), // two overrides
  Buffer.from('00', 'hex'), // enum variant
  Buffer.from('38', 'hex'), // outcome length 56
  Buffer.from(OUTCOME, 'utf8'),
  Buffer.from('0004', 'hex'), // script length, u16
  ENUM_SCRIPT,
  Buffer.from('01', 'hex'), // numeric variant
  Buffer.from('0000000000000000', 'hex'), // start 0
  Buffer.from('00000000000001f3', 'hex'), // end 499
  Buffer.from('0003', 'hex'), // script length, u16
  NUMERIC_SCRIPT,
]);

describe('PayoutScriptOverrides TLV', () => {
  it('encodes to the bytes dlcdevkit pins', () => {
    expect(record().serialize()).to.deep.equal(WIRE);
    expect(WIRE.toString('hex')).to.equal(
      'fdfded570200386c6971756964617465642d62792d30783131313131313131313131313131313131313131313131313131313131313131313131313131313100040014aabb01000000000000000000000000000001f300030014cc',
    );
  });

  it('round trips', () => {
    const decoded = PayoutScriptOverrides.deserialize(WIRE);
    expect(decoded.overrides).to.deep.equal(record().overrides);
    expect(decoded.serialize()).to.deep.equal(WIRE);
  });

  it('rejects an unknown outcome variant', () => {
    const bad = Buffer.from(WIRE);
    bad[5] = 0x02; // first override's variant
    expect(() => PayoutScriptOverrides.deserialize(bad)).to.throw(/variant 2/);
  });

  it('rejects trailing bytes in the body', () => {
    const bad = Buffer.concat([
      Buffer.from('fdfded0200', 'hex'), // zero overrides
      Buffer.from('00', 'hex'),
    ]);
    bad[3] = 0x02; // body length 2: count byte plus one stray byte
    expect(() => PayoutScriptOverrides.deserialize(bad)).to.throw(
      /Trailing bytes/,
    );
  });

  it('finds only named enum outcomes', () => {
    expect(record().scriptForEnumOutcome(OUTCOME)).to.deep.equal(ENUM_SCRIPT);
    expect(record().scriptForEnumOutcome('released')).to.equal(undefined);
  });

  it('prices the longest script the accepter can be paid', () => {
    const p2tr = Buffer.alloc(34, 1);
    const overrides = record();
    expect(overrides.acceptPayoutScriptLen(Buffer.alloc(22))).to.equal(22);
    overrides.overrides[0].scriptPubkey = p2tr;
    expect(overrides.acceptPayoutScriptLen(Buffer.alloc(22))).to.equal(34);
  });

  describe('validate', () => {
    it('accepts the pinned record', () => {
      expect(() => record().validate()).to.not.throw();
    });

    it('rejects an empty script', () => {
      const overrides = record();
      overrides.overrides[1].scriptPubkey = Buffer.alloc(0);
      expect(() => overrides.validate()).to.throw(/empty/);
    });

    it('rejects a range that starts after it ends', () => {
      const overrides = record();
      overrides.overrides[1].outcome = {
        type: 'numeric',
        start: BigInt(5),
        end: BigInt(4),
      };
      expect(() => overrides.validate()).to.throw(/starts after it ends/);
    });

    it('rejects a script too long for its u16 length', () => {
      const overrides = record();
      overrides.overrides[0].scriptPubkey = Buffer.alloc(0x10000);
      expect(() => overrides.validate()).to.throw(/too long/);
    });
  });
});
