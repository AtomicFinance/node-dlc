import { expect } from 'chai';

import { Script } from '../../lib/Script';

describe('Script', () => {
  it('outputs Taproot scriptPubKey', () => {
    const pubkey =
      'f1637044d08d5891cdf4c6b066667e75eebaae79a9de91c5f5eb5bcc682a502e';
    const buffer = Buffer.from(pubkey, 'hex');

    const expected = Buffer.concat([Buffer.from([34, 81, 32]), buffer]);

    expect(Script.p2trLock(buffer).serialize()).to.be.eql(expected);
  });

  it('parses raw Taproot scriptPubKey bytes', () => {
    const pubkey =
      'f1637044d08d5891cdf4c6b066667e75eebaae79a9de91c5f5eb5bcc682a502e';
    const script = Script.p2trLock(Buffer.from(pubkey, 'hex'));

    expect(Script.fromRaw(script.serializeCmds()).serializeCmds()).to.be.eql(
      script.serializeCmds(),
    );
  });

  it('throws on invalid length pubkey', () => {
    const buffer = Buffer.from([0x00, 0x01, 0x02]);
    expect(() => Script.p2trLock(buffer)).to.throw();
  });
});
