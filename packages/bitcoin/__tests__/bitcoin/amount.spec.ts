import { expect } from 'chai';

import { Amount } from '../../lib/Amount';

describe('Amount', () => {
  it('#fromBitcoin()', () => {
    expect(Amount.fromBitcoin(0.00000001).bitcoin).to.equal(0.00000001);
    expect(Amount.fromBitcoin(0.12345678).bitcoin).to.equal(0.12345678);
    expect(Amount.fromBitcoin(1).bitcoin).to.equal(1);
    expect(Amount.fromBitcoin(1.23).bitcoin).to.equal(1.23);
    expect(Amount.fromBitcoin(20000000.00000008).bitcoin).to.equal(
      20000000.00000008,
    );
  });

  it('#fromSats()', () => {
    expect(Amount.fromSats(1).psats.toString()).to.equal('1000000000000');
    expect(Amount.fromSats(12345678).psats.toString()).to.equal(
      '12345678000000000000',
    );
  });

  it('#fromMilliSats()', () => {
    expect(Amount.fromMilliSats(1).psats.toString()).to.equal('1000000000');
    expect(Amount.fromMilliSats(12345678123).psats.toString()).to.equal(
      '12345678123000000000',
    );
  });

  it('#fromMicroSats()', () => {
    expect(Amount.fromMicroSats(1).psats.toString()).to.equal('1000000');
    expect(Amount.fromMicroSats(12345678123456).psats.toString()).to.equal(
      '12345678123456000000',
    );
  });

  it('#fromPicoSats()', () => {
    expect(Amount.fromPicoSats(1).psats.toString()).to.equal('1');
    expect(
      Amount.fromPicoSats(BigInt('12345678123456123456')).psats.toString(),
    ).to.equal('12345678123456123456');
  });

  it('.bitcoin', () => {
    expect(Amount.fromBitcoin(1).bitcoin).to.equal(1);
    expect(Amount.fromBitcoin(1.12345678).bitcoin).to.equal(1.12345678);
    expect(Amount.fromSats(1).bitcoin).to.equal(0.00000001);
    expect(Amount.fromSats(12345678).bitcoin).to.equal(0.12345678);
    expect(Amount.fromSats(112345678).bitcoin).to.equal(1.12345678);
    expect(Amount.fromSats(112345678).bitcoin).to.equal(1.12345678);
    expect(Amount.fromMilliSats(1).bitcoin).to.equal(0.0);
    expect(Amount.fromMilliSats(1000).bitcoin).to.equal(0.00000001);
    expect(Amount.fromMilliSats(1234).bitcoin).to.equal(0.00000001);
    expect(Amount.fromPicoSats(1).bitcoin).to.equal(0.0);
    expect(Amount.fromPicoSats(1000).bitcoin).to.equal(0.0);
    expect(Amount.fromPicoSats(1000000).bitcoin).to.equal(0.0);
    expect(Amount.fromPicoSats(1000000000).bitcoin).to.equal(0.0);
    expect(Amount.fromPicoSats(1000000000000).bitcoin).to.equal(0.00000001);
  });

  it('.sats', () => {
    expect(Amount.fromBitcoin(1).sats.toString()).to.equal('100000000');
    expect(Amount.fromBitcoin(1.12345678).sats.toString()).to.equal(
      '112345678',
    );
    expect(Amount.fromSats(1).sats.toString()).to.equal('1');
    expect(Amount.fromSats(12345678).sats.toString()).to.equal('12345678');
    expect(Amount.fromSats(112345678).sats.toString()).to.equal('112345678');
    expect(Amount.fromSats(112345678).sats.toString()).to.equal('112345678');
    expect(Amount.fromMilliSats(1).sats.toString()).to.equal('0');
    expect(Amount.fromMilliSats(1000).sats.toString()).to.equal('1');
    expect(Amount.fromMilliSats(1234).sats.toString()).to.equal('1');
    expect(Amount.fromPicoSats(1).sats.toString()).to.equal('0');
    expect(Amount.fromPicoSats(1000).sats.toString()).to.equal('0');
    expect(Amount.fromPicoSats(1000000).sats.toString()).to.equal('0');
    expect(Amount.fromPicoSats(1000000000).sats.toString()).to.equal('0');
    expect(Amount.fromPicoSats(1000000000000).sats.toString()).to.equal('1');
  });

  it('.msats', () => {
    expect(Amount.fromBitcoin(1).msats.toString()).to.equal('100000000000');
    expect(Amount.fromBitcoin(1.12345678).msats.toString()).to.equal(
      '112345678000',
    );
    expect(Amount.fromSats(1).msats.toString()).to.equal('1000');
    expect(Amount.fromSats(12345678).msats.toString()).to.equal('12345678000');
    expect(Amount.fromSats(112345678).msats.toString()).to.equal(
      '112345678000',
    );
    expect(Amount.fromSats(112345678).msats.toString()).to.equal(
      '112345678000',
    );
    expect(Amount.fromMilliSats(1).msats.toString()).to.equal('1');
    expect(Amount.fromMilliSats(1000).msats.toString()).to.equal('1000');
    expect(Amount.fromMilliSats(1234).msats.toString()).to.equal('1234');
    expect(Amount.fromPicoSats(1).msats.toString()).to.equal('0');
    expect(Amount.fromPicoSats(1000).msats.toString()).to.equal('0');
    expect(Amount.fromPicoSats(1000000).msats.toString()).to.equal('0');
    expect(Amount.fromPicoSats(1000000000).msats.toString()).to.equal('1');
    expect(Amount.fromPicoSats(1000000000000).msats.toString()).to.equal(
      '1000',
    );
  });

  it('.microsats', () => {
    expect(Amount.fromBitcoin(1).microsats.toString()).to.equal(
      '100000000000000',
    );
    expect(Amount.fromBitcoin(1.12345678).microsats.toString()).to.equal(
      '112345678000000',
    );
    expect(Amount.fromSats(1).microsats.toString()).to.equal('1000000');
    expect(Amount.fromSats(12345678).microsats.toString()).to.equal(
      '12345678000000',
    );
    expect(Amount.fromSats(112345678).microsats.toString()).to.equal(
      '112345678000000',
    );
    expect(Amount.fromSats(112345678).microsats.toString()).to.equal(
      '112345678000000',
    );
    expect(Amount.fromMilliSats(1).microsats.toString()).to.equal('1000');
    expect(Amount.fromMilliSats(1000).microsats.toString()).to.equal('1000000');
    expect(Amount.fromMilliSats(1234).microsats.toString()).to.equal('1234000');
    expect(Amount.fromPicoSats(1).microsats.toString()).to.equal('0');
    expect(Amount.fromPicoSats(1000).microsats.toString()).to.equal('0');
    expect(Amount.fromPicoSats(1000000).microsats.toString()).to.equal('1');
    expect(Amount.fromPicoSats(1000000000).microsats.toString()).to.equal(
      '1000',
    );
    expect(Amount.fromPicoSats(1000000000000).microsats.toString()).to.equal(
      '1000000',
    );
  });

  describe('.clone()', () => {
    it('clones via deep copy', () => {
      const a = Amount.fromBitcoin(1);
      const b = a.clone();
      expect(a).to.not.equal(b);
      expect(b.bitcoin).to.equal(a.bitcoin);
    });
  });

  describe('.eq()', () => {
    it('true when equal', () => {
      const a = Amount.fromBitcoin(1);
      const b = Amount.fromBitcoin(1);
      expect(a.eq(b)).to.equal(true);
    });

    it('false when not equal', () => {
      const a = Amount.fromBitcoin(1.00000001);
      const b = Amount.fromBitcoin(1);
      expect(a.eq(b)).to.equal(false);
    });
  });

  describe('.gt()', () => {
    it('true when greater', () => {
      const a = Amount.fromBitcoin(2);
      const b = Amount.fromBitcoin(1);
      expect(a.gt(b)).to.equal(true);
    });

    it('false when equal', () => {
      const a = Amount.fromBitcoin(1);
      const b = Amount.fromBitcoin(1);
      expect(a.gt(b)).to.equal(false);
    });

    it('false when less', () => {
      const a = Amount.fromBitcoin(1);
      const b = Amount.fromBitcoin(2);
      expect(a.gt(b)).to.equal(false);
    });
  });

  describe('.gte()', () => {
    it('true when greater', () => {
      const a = Amount.fromBitcoin(2);
      const b = Amount.fromBitcoin(1);
      expect(a.gte(b)).to.equal(true);
    });

    it('true when equal', () => {
      const a = Amount.fromBitcoin(1);
      const b = Amount.fromBitcoin(1);
      expect(a.gte(b)).to.equal(true);
    });

    it('false when less', () => {
      const a = Amount.fromBitcoin(1);
      const b = Amount.fromBitcoin(2);
      expect(a.gte(b)).to.equal(false);
    });
  });

  describe('.lt()', () => {
    it('false when greater', () => {
      const a = Amount.fromBitcoin(2);
      const b = Amount.fromBitcoin(1);
      expect(a.lt(b)).to.equal(false);
    });

    it('false when equal', () => {
      const a = Amount.fromBitcoin(1);
      const b = Amount.fromBitcoin(1);
      expect(a.lt(b)).to.equal(false);
    });

    it('true when less', () => {
      const a = Amount.fromBitcoin(1);
      const b = Amount.fromBitcoin(2);
      expect(a.lt(b)).to.equal(true);
    });
  });

  describe('.lte()', () => {
    it('false when greater', () => {
      const a = Amount.fromBitcoin(2);
      const b = Amount.fromBitcoin(1);
      expect(a.lte(b)).to.equal(false);
    });

    it('true when equal', () => {
      const a = Amount.fromBitcoin(1);
      const b = Amount.fromBitcoin(1);
      expect(a.lte(b)).to.equal(true);
    });

    it('true when less', () => {
      const a = Amount.fromBitcoin(1);
      const b = Amount.fromBitcoin(2);
      expect(a.lte(b)).to.equal(true);
    });
  });

  describe('.add()', () => {
    it('adds the supplied amount', () => {
      const a = Amount.fromBitcoin(1);
      const b = Amount.fromSats(1);
      a.add(b);
      expect(a.bitcoin).to.equal(1.00000001);
    });
    it('is fluent', () => {
      const sut = Amount.zero()
        .add(Amount.fromSats(1000))
        .add(Amount.fromSats(400));
      expect(sut.sats).to.equal(1400n);
    });
  });

  describe('.sub()', () => {
    it('subtracts the suplied amount', () => {
      const a = Amount.fromBitcoin(1.000000001);
      const b = Amount.fromBitcoin(0.000000001);
      a.sub(b);
      expect(a.bitcoin).to.equal(1);
    });

    it('does not throws when negative', () => {
      const a = Amount.fromBitcoin(1);
      const b = Amount.fromBitcoin(1.1);
      a.sub(b);
      expect(a.bitcoin).to.equal(-0.1);
    });

    it('is fluent', () => {
      const sut = Amount.fromSats(1000).sub(Amount.fromSats(400));
      expect(sut.sats).to.equal(600n);
    });
  });

  describe('.addn()', () => {
    it('adds the supplied amount', () => {
      const a = Amount.fromBitcoin(1);
      const b = Amount.fromSats(1);
      const c = a.addn(b);
      expect(c.bitcoin).to.equal(1.00000001);
      expect(c).to.not.equal(a);
    });
    it('is fluent', () => {
      const sut = Amount.zero()
        .addn(Amount.fromSats(1000))
        .addn(Amount.fromSats(400));
      expect(sut.sats).to.equal(1400n);
    });
  });

  describe('.subn()', () => {
    it('subtracts the suplied amount', () => {
      const a = Amount.fromBitcoin(1.000000001);
      const b = Amount.fromBitcoin(0.000000001);
      const c = a.subn(b);
      expect(c.bitcoin).to.equal(1);
      expect(c).to.not.equal(a);
    });

    it('does not throws when negative', () => {
      const a = Amount.fromBitcoin(1);
      const b = Amount.fromBitcoin(1.1);
      const c = a.subn(b);
      expect(c.bitcoin).to.equal(-0.1);
    });

    it('is fluent', () => {
      const sut = Amount.fromSats(1000).subn(Amount.fromSats(400));
      expect(sut.sats).to.equal(600n);
    });
  });

  describe('.toString()', () => {
    it('when zero', () => {
      expect(Amount.fromBitcoin(0).toString()).to.equal('0.00000000');
    });

    it('when bitcoin', () => {
      expect(Amount.fromBitcoin(1.12345678).toString()).to.equal('1.12345678');
    });

    it('when satoshis', () => {
      expect(Amount.fromSats(1).toString()).to.equal('0.00000001');
    });

    it('when millisats', () => {
      expect(Amount.fromMilliSats(1).toString()).to.equal('0.00000000');
    });
  });
});
