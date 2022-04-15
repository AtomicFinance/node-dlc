import { OracleAnnouncementV0 } from '@node-dlc/messaging';
import { expect } from 'chai';
import sinon from 'sinon';

import {
  buildCoveredCallOrderOffer,
  buildShortPutOrderOffer,
  computeRoundingModulus,
} from '../../../lib';

describe('OrderOffer Builder', () => {
  describe('buildCoveredCallOrderOffer', () => {
    const strikePrice = 50000;
    const contractSize = 100000000;
    const premium = 25000;
    const totalCollateral = contractSize;
    const oracleAnnouncementBuf = Buffer.from(
      'fdd824fd02ab1efe41fa42ea1dcd103a0251929dd2b192d2daece8a4ce4d81f68a183b750d92d6f02d796965dc79adf4e7786e08f861a1ecc897afbba2dab9cff6eb0a81937eb8b005b07acf849ad2cec22107331dedbf5a607654fad4eafe39c278e27dde68fdd822fd02450011f9313f1edd903fab297d5350006b669506eb0ffda0bb58319b4df89ac24e14fd15f9791dc78d1596b06f4969bdb37d9e394dc9fedaa18d694027fa32b5ea2a5e60080c58e13727367c3a4ce1ad65dfb3c7e3ca1ea912b0299f6e383bab2875058aa96a1c74633130af6fbd008788de6ac9db76da4ecc7303383cc1a49f525316413850f7e3ac385019d560e84c5b3a3e9ae6c83f59fe4286ddfd23ea46d7ae04610a175cd28a9bf5f574e245c3dfe230dc4b0adf4daaea96780e594f6464f676505f4b74cfe3ffc33415a23de795bf939ce64c0c02033bbfc6c9ff26fb478943a1ece775f38f5db067ca4b2a9168b40792398def9164bfe5c46838472dc3c162af16c811b7a116e9417d5bccb9e5b8a5d7d26095aba993696188c3f85a02f7ab8d12ada171c352785eb63417228c7e248909fc2d673e1bb453140bf8bf429375819afb5e9556663b76ff09c2a7ba9779855ffddc6d360cb459cf8c42a2b949d0de19fe96163d336fd66a4ce2f1791110e679572a20036ffae50204ef520c01058ff4bef28218d1c0e362ee3694ad8b2ae83a51c86c4bc1630ed6202a158810096726f809fc828fafdcf053496affdf887ae8c54b6ca4323ccecf6a51121c4f0c60e790536dab41b221db1c6b35065dc19a9d31cf75901aa35eefecbb6fefd07296cda13cb34ce3b58eba20a0eb8f9614994ec7fee3cc290e30e6b1e3211ae1f3a85b6de6abdbb77d6d9ed33a1cee3bd5cd93a71f12c9c45e385d744ad0e7286660305100fdd80a11000200076274632f75736400000000001109425443205072696365',
      'hex',
    );

    const oracleAnnouncement = OracleAnnouncementV0.deserialize(
      oracleAnnouncementBuf,
    );

    it('should build a covered call OrderOffer correctly', () => {
      sinon.stub(Date.prototype, 'getTime').returns(Date.UTC(2021, 1, 5));

      const orderOffer = buildCoveredCallOrderOffer(
        oracleAnnouncement,
        contractSize,
        strikePrice,
        premium,
        12,
        10000,
        'bitcoin',
      );

      expect(() => orderOffer.validate()).to.not.throw(Error);
    });

    it('should build a short put OrderOffer correctly', () => {
      const orderOffer = buildShortPutOrderOffer(
        oracleAnnouncement,
        contractSize,
        strikePrice,
        totalCollateral,
        premium,
        12,
        10000,
        'bitcoin',
      );

      expect(() => orderOffer.validate()).to.not.throw(Error);
    });

    it('should fail to build an OrderOffer with an invalid oracleAnnouncement', () => {
      oracleAnnouncement.announcementSig = Buffer.from('deadbeef', 'hex');

      const orderOffer = buildShortPutOrderOffer(
        oracleAnnouncement,
        contractSize,
        strikePrice,
        totalCollateral,
        premium,
        12,
        10000,
        'bitcoin',
      );

      expect(() => orderOffer.validate()).to.throw(Error);
    });
  });

  describe('computeRoundingModulus', () => {
    it('should properly compute the rounding modulus for 0.0001 BTC', () => {
      const modulus = computeRoundingModulus(100000, 10000);
      expect(modulus).to.equal(BigInt(10));
    });

    it('should properly compute the rounding modulus for 1 BTC', () => {
      const modulus = computeRoundingModulus(100000, 100000000);
      expect(modulus).to.equal(BigInt(100000));
    });

    it('should properly compute the rounding modulus for 1.25 BTC', () => {
      const modulus = computeRoundingModulus(5000, 125000000);
      expect(modulus).to.equal(BigInt(6250));
    });

    it('should properly compute the rounding modulus for 0.9 BTC', () => {
      const modulus = computeRoundingModulus(100000, 90000000);
      expect(modulus).to.equal(BigInt(90000));
    });
  });
});
