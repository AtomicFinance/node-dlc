import { BitcoinNetworks } from 'bitcoin-networks';
import { expect } from 'chai';

import {
  BatchFundingGroup,
  OrderIrcInfoV0,
  OrderMetadataV0,
  OrderPositionInfoV0,
} from '../../lib';
import { CloseTLV } from '../../lib/messages/CloseTLV';
import { ContractInfo, ContractInfoV0 } from '../../lib/messages/ContractInfo';
import {
  DlcOffer,
  DlcOfferContainer,
  DlcOfferV0,
  LOCKTIME_THRESHOLD,
} from '../../lib/messages/DlcOffer';
import { FundingInputV0 } from '../../lib/messages/FundingInput';
import { MessageType } from '../../lib/MessageType';

describe('DlcOffer', () => {
  const bitcoinNetwork = BitcoinNetworks.bitcoin_regtest;

  let instance: DlcOfferV0;
  const type = Buffer.from('a71a', 'hex');
  const contractFlags = Buffer.from('00', 'hex');
  const chainHash = Buffer.from(
    '06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f',
    'hex',
  );
  const contractInfo = Buffer.from(
    'fdd82e' + // type contract_info
      'fd0131' + // length
      '000000000bebc200' + // total_collateral
      'fda710' + // type contract_descriptor
      '79' + // length
      '03' + // num_outcomes
      'c5a7affd51901bc7a51829b320d588dc7af0ad1f3d56f20a1d3c60c9ba7c6722' + // outcome_1
      '0000000000000000' + // payout_1
      'adf1c23fbeed6611efa5caa0e9ed4c440c450a18bc010a6c867e05873ac08ead' + // outcome_2
      '00000000092363a3' + // payout_2
      '6922250552ad6bb10ab3ddd6981b530aa9a6fd05725bf85b59e3e51163905288' + // outcome_3
      '000000000bebc200' + // payout_3
      'fda712' + // type oracle_info
      'a8' + // length
      'fdd824' + // type oracle_announcement
      'a4' + // length
      'fab22628f6e2602e1671c286a2f63a9246794008627a1749639217f4214cb4a9' + // announcement_signature_r
      '494c93d1a852221080f44f697adb4355df59eb339f6ba0f9b01ba661a8b108d4' + // announcement_signature_s
      'da078bbb1d34e7729e38e2ae34236e776da121af442626fa31e31ae55a279a0b' + // oracle_public_key
      'fdd822' + // type oracle_event
      '40' + // length
      '0001' + // nb_nonces
      '3cfba011378411b20a5ab773cb95daab93e9bcd1e4cce44986a7dda84e01841b' + // oracle_nonces
      '00000000' + // event_maturity_epoch
      'fdd806' + // type enum_event_descriptor
      '10' + // length
      '0002' + // num_outcomes
      '06' + // outcome_1_len
      '64756d6d7931' + // outcome_1
      '06' + // outcome_2_len
      '64756d6d7932' + // outcome_2
      '05' + // event_id_length
      '64756d6d79', // event_id
    'hex',
  );

  const fundingPubKey = Buffer.from(
    '0327efea09ff4dfb13230e887cbab8821d5cc249c7ff28668c6633ff9f4b4c08e3',
    'hex',
  );

  const payoutSPKLen = Buffer.from('0016', 'hex');
  const payoutSPK = Buffer.from(
    '00142bbdec425007dc360523b0294d2c64d2213af498',
    'hex',
  );

  const payoutSerialID = Buffer.from('0000000000b051dc', 'hex');
  const offerCollateralSatoshis = Buffer.from('0000000005f5e0FF', 'hex'); // 99999999
  const fundingInputsLen = Buffer.from('0001', 'hex');

  const fundingInputV0 = Buffer.from(
    'fda714' +
      '3f' + // length
      '000000000000fa51' + // input_serial_id
      '0029' + // prevtx_len
      '02000000000100c2eb0b00000000160014369d63a82ed846f4d47ad55045e594ab95539d6000000000' + // prevtx
      '00000000' + // prevtx_vout
      'ffffffff' + // sequence
      '006b' + // max_witness_len
      '0000', // redeemscript_len
    'hex',
  );

  const changeSPKLen = Buffer.from('0016', 'hex');
  const changeSPK = Buffer.from(
    '0014afa16f949f3055f38bd3a73312bed00b61558884',
    'hex',
  );

  const changeSerialID = Buffer.from('00000000001ea3ed', 'hex');
  const fundOutputSerialID = Buffer.from('000000000052947a', 'hex');
  const feeRatePerVb = Buffer.from('0000000000000001', 'hex');
  const cetLocktime = Buffer.from('00000064', 'hex');
  const refundLocktime = Buffer.from('000000c8', 'hex');

  const dlcOfferHex = Buffer.concat([
    type,
    contractFlags,
    chainHash,
    contractInfo,
    fundingPubKey,
    payoutSPKLen,
    payoutSPK,
    payoutSerialID,
    offerCollateralSatoshis,
    fundingInputsLen,
    fundingInputV0,
    changeSPKLen,
    changeSPK,
    changeSerialID,
    fundOutputSerialID,
    feeRatePerVb,
    cetLocktime,
    refundLocktime,
  ]);

  beforeEach(() => {
    instance = new DlcOfferV0();
    instance.contractFlags = contractFlags;
    instance.chainHash = chainHash;
    instance.contractInfo = ContractInfo.deserialize(contractInfo);
    instance.fundingPubKey = fundingPubKey;
    instance.payoutSPK = payoutSPK;
    instance.payoutSerialId = BigInt(11555292);
    instance.offerCollateralSatoshis = BigInt(99999999);
    instance.fundingInputs = [FundingInputV0.deserialize(fundingInputV0)];
    instance.changeSPK = changeSPK;
    instance.changeSerialId = BigInt(2008045);
    instance.fundOutputSerialId = BigInt(5411962);
    instance.feeRatePerVb = BigInt(1);
    instance.cetLocktime = 100;
    instance.refundLocktime = 200;
  });

  describe.only('test-deserialize', () => {
    it('should deserialize', () => {
      const dlcOfferHexInfo = Buffer.from(
        'a71a0043497fd7f826957108f4a30fd9cec3aeba79972084e90ead01ea330900000000fdd82efd018f000000000000c350fda7107903f95e1393d334bb4c3c8d106ef58855bf6e71a7dfd63f986c2a24d423a02c724e000000000000c3503a6b3f90ea14fb986390c7be5f19b3134eeae7d571a7f4a44dffc2341db1ee520000000000000000afe572dbdbf6324f7ba09a8a58c9c9f0c8862567b18ca1388d46e6591caffa5800000000000061a8fda712fd0104fdd824fd00fe11d53ab09ec03503d34007454efa8543baa8c3870b0e238ef46b8aa997dcd6a17af8e742de9b796a48a44e4de2f0dfc1297a3dc2f067aa49a2fddabf6fe9bcf1795998c95e091a62d0dd1e6fd721c06dd0cbc04e65eacef9b81732c8262c85d8fdd8229a00034ac6e75f9690f540e7f8710fdc4fab527b1385f8934c82e99d294d1921114feea49f00bb87cf9b245b517dd53e61de917985bc114951bad9470f08f8580ce3e30e263895c8a769fe7ddbb5002f795109144b64476d983d821825b8a21003efbe671c7452fdd806200003085452554d5057494e094b414d414c4157494e0a4e45495448455257494e0f6b616d616c612d76732d7472756d7002195201c6de9cdd676ab5031b238683209a148efe62b9942659ead701a97217e0001600144e48397c06c3b950428f669d3fda671076c30cac0000000000003dfb00000000000061a80001fda714f400000000000e65ff00de020000000001019bef73cbb153c4415a05a2469e3a42e79383e8c47c4dbc8ccd589c72fa1c0a780100000000fdffffff02a086010000000000160014f6cb2ff4c4b413b08c062a72ab0b13fe5282d2802438e80b000000001600144557dfd35227701c6e170b953c4801dfddf787f3024730440220634dbf56e0c60ebd858f56671ed01462ec47e25657cd3fff30614fbe3f9c676102201b5560bd7725826bd07d36fea76ce40fc636ed9933317137fbdb30790ff1caf00121023370f7daaabc11a5e7a37c072c3d5c35abf32be586907138b80990f9868edc3b0758030000000000ffffffff006c0000001600147bdc428a3bbd823d135f57ca89b7bede2a8df2b10000000000a0f88a000000000000b773000000000000000a6064108c6064108d',
        'hex',
      );
      const instance = DlcOfferV0.deserialize(dlcOfferHexInfo);
      expect(instance.serialize().toString('hex')).to.equal(
        dlcOfferHexInfo.toString('hex'),
      );
    });
  });

  describe('deserialize', () => {
    it('should throw if incorrect type', () => {
      instance.type = 0x123 as MessageType;
      expect(function () {
        DlcOffer.deserialize(instance.serialize());
      }).to.throw(Error);
    });

    it('has correct type', () => {
      expect(DlcOffer.deserialize(instance.serialize()).type).to.equal(
        instance.type,
      );
    });
  });

  describe('DlcOfferV0', () => {
    describe('serialize', () => {
      it('serializes', () => {
        expect(instance.serialize().toString('hex')).to.equal(
          dlcOfferHex.toString('hex'),
        );
      });

      it('serializes with positioninfo', () => {
        const positionInfo = new OrderPositionInfoV0();
        positionInfo.shiftForFees = 'acceptor';
        positionInfo.fees = BigInt(1000);

        instance.positionInfo = positionInfo;
        expect(instance.serialize().toString('hex')).to.equal(
          Buffer.concat([dlcOfferHex, positionInfo.serialize()]).toString(
            'hex',
          ),
        );
      });
    });

    describe('deserialize', () => {
      it('deserializes', () => {
        const instance = DlcOfferV0.deserialize(dlcOfferHex);

        expect(instance.contractFlags).to.deep.equal(contractFlags);
        expect(instance.chainHash).to.deep.equal(chainHash);
        expect(instance.contractInfo.serialize().toString('hex')).to.equal(
          contractInfo.toString('hex'),
        );
        expect(instance.fundingPubKey).to.deep.equal(fundingPubKey);
        expect(instance.payoutSPK).to.deep.equal(payoutSPK);
        expect(Number(instance.payoutSerialId)).to.equal(11555292);
        expect(Number(instance.offerCollateralSatoshis)).to.equal(99999999);
        expect(instance.fundingInputs[0].serialize().toString('hex')).to.equal(
          fundingInputV0.toString('hex'),
        );
        expect(instance.changeSPK).to.deep.equal(changeSPK);
        expect(Number(instance.changeSerialId)).to.equal(2008045);
        expect(Number(instance.fundOutputSerialId)).to.equal(5411962);
        expect(Number(instance.feeRatePerVb)).to.equal(1);
        expect(instance.cetLocktime).to.equal(100);
        expect(instance.refundLocktime).to.equal(200);
      });

      it('has correct type', () => {
        expect(DlcOfferV0.deserialize(dlcOfferHex).type).to.equal(
          MessageType.DlcOfferV0,
        );
      });

      it('deserializes with positioninfo', () => {
        const positionInfo = new OrderPositionInfoV0();
        positionInfo.shiftForFees = 'acceptor';
        positionInfo.fees = BigInt(1000);

        instance.positionInfo = positionInfo;
        expect(
          DlcOfferV0.deserialize(instance.serialize()).positionInfo.serialize(),
        ).to.deep.equal(positionInfo.serialize());
      });
    });

    describe('toJSON', () => {
      it('converts to JSON', async () => {
        const json = instance.toJSON();
        expect(json.type).to.equal(instance.type);
        expect(json.contractFlags).to.equal(
          instance.contractFlags.toString('hex'),
        );
        expect(json.chainHash).to.equal(instance.chainHash.toString('hex'));
        expect(json.contractInfo.type).to.equal(instance.contractInfo.type);
        expect(json.contractInfo.totalCollateral).to.equal(
          Number(instance.contractInfo.totalCollateral),
        );

        expect(json.fundingPubKey).to.equal(
          instance.fundingPubKey.toString('hex'),
        );
        expect(json.payoutSPK).to.equal(instance.payoutSPK.toString('hex'));
        expect(json.payoutSerialId).to.equal(Number(instance.payoutSerialId));
        expect(json.offerCollateralSatoshis).to.equal(
          Number(instance.offerCollateralSatoshis),
        );
        expect(json.fundingInputs[0].type).to.equal(
          instance.fundingInputs[0].type,
        );
        expect(json.fundingInputs[0].inputSerialId).to.equal(
          Number(instance.fundingInputs[0].toJSON().inputSerialId),
        );

        expect(json.changeSPK).to.equal(instance.changeSPK.toString('hex'));
        expect(json.changeSerialId).to.equal(Number(instance.changeSerialId));
        expect(json.fundOutputSerialId).to.equal(
          Number(instance.fundOutputSerialId),
        );
        expect(json.feeRatePerVb).to.equal(Number(instance.feeRatePerVb));
        expect(json.cetLocktime).to.equal(instance.cetLocktime);
        expect(json.refundLocktime).to.equal(instance.refundLocktime);
      });
    });

    describe('getAddresses', () => {
      it('should get addresses', () => {
        const expectedFundingAddress =
          'bcrt1qayylp95g2tzq2a60x2l7f8mclnx5y2jxm0yt09';
        const expectedChangeAddress =
          'bcrt1q47skl9ylxp2l8z7n5ue390kspds4tzyy5jdxs8';
        const expectedPayoutAddress =
          'bcrt1q9w77csjsqlwrvpfrkq556try6gsn4ayc2kn0kl';

        const instance = DlcOfferV0.deserialize(dlcOfferHex);

        const {
          fundingAddress,
          changeAddress,
          payoutAddress,
        } = instance.getAddresses(bitcoinNetwork);

        expect(fundingAddress).to.equal(expectedFundingAddress);
        expect(changeAddress).to.equal(expectedChangeAddress);
        expect(payoutAddress).to.equal(expectedPayoutAddress);
      });
    });

    describe('validate', () => {
      it('should throw if payout_spk is invalid', () => {
        instance.payoutSPK = Buffer.from('fff', 'hex');
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });
      it('should throw if change_spk is invalid', () => {
        instance.changeSPK = Buffer.from('fff', 'hex');
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });
      it('should throw if fundingpubkey is not a valid pubkey', () => {
        instance.fundingPubKey = Buffer.from(
          '00f003aa11f2a97b6be755a86b9fd798a7451c670196a5245b7bae971306b7c87e',
          'hex',
        );
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });
      it('should throw if fundingpubkey is not in compressed secp256k1 format', () => {
        instance.fundingPubKey = Buffer.from(
          '045162991c7299223973cabc99ef5087d7bab2dafe61f78e5388b2f9492f7978123f51fd05ef0693790c0b2d4f30848363a3f3fbcf2bd53a05ba0fd5bb708c3184',
          'hex',
        );
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });
      it('should throw if offerCollateralSatoshis is less than 1000', () => {
        instance.offerCollateralSatoshis = BigInt(999);
        expect(function () {
          instance.validate();
        }).to.throw(Error);

        // boundary check
        instance.offerCollateralSatoshis = BigInt(1000);
        expect(function () {
          instance.validate();
        }).to.not.throw(Error);
      });

      it('should throw if cet_locktime is less than 0', () => {
        instance.cetLocktime = -1;
        expect(() => {
          instance.validate();
        }).to.throw('cet_locktime must be greater than or equal to 0');
      });

      it('should throw if refund_locktime is less than 0', () => {
        instance.refundLocktime = -1;
        expect(() => {
          instance.validate();
        }).to.throw('refund_locktime must be greater than or equal to 0');
      });

      it('should throw if cet_locktime and refund_locktime are not in same units', () => {
        instance.cetLocktime = 100;
        instance.refundLocktime = LOCKTIME_THRESHOLD + 200;
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });

      it('should not throw if cet_locktime and refund_locktime are in same units', () => {
        instance.cetLocktime = 100;
        instance.refundLocktime = 200;
        expect(function () {
          instance.validate();
        }).to.not.throw(Error);

        instance.cetLocktime = LOCKTIME_THRESHOLD + 100;
        instance.refundLocktime = LOCKTIME_THRESHOLD + 200;
        expect(function () {
          instance.validate();
        }).to.not.throw(Error);
      });

      it('should throw if cet_locktime >= refund_locktime', () => {
        instance.cetLocktime = 200;
        instance.refundLocktime = 100;
        expect(function () {
          instance.validate();
        }).to.throw(Error);

        instance.cetLocktime = 100;
        instance.refundLocktime = 100;
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });

      it('should throw if inputSerialIds arent unique', () => {
        instance.fundingInputs = [
          FundingInputV0.deserialize(fundingInputV0),
          FundingInputV0.deserialize(fundingInputV0),
        ];
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });

      it('should throw if changeSerialId  == fundOutputSerialId', () => {
        instance.changeSerialId = instance.fundOutputSerialId;
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });

      it('should throw if totalCollateral <= offerCollateral', () => {
        instance.contractInfo.totalCollateral = BigInt(200000000);
        instance.offerCollateralSatoshis = BigInt(200000000);
        expect(function () {
          instance.validate();
        }).to.throw(Error);

        instance.contractInfo.totalCollateral = BigInt(200000000);
        instance.offerCollateralSatoshis = BigInt(200000001);
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });

      it('should throw if funding amount less than offer collateral satoshis', () => {
        instance.offerCollateralSatoshis = BigInt(3e8);
        expect(function () {
          instance.validate();
        }).to.throw(Error);
      });
    });
  });

  describe('DlcOfferContainer', () => {
    it('should serialize and deserialize', () => {
      const dlcOffer = DlcOfferV0.deserialize(dlcOfferHex);
      // swap payout and change spk to differentiate between dlcoffers
      const dlcOffer2 = DlcOfferV0.deserialize(dlcOfferHex);
      dlcOffer2.payoutSPK = dlcOffer.changeSPK;
      dlcOffer2.changeSPK = dlcOffer.payoutSPK;

      const container = new DlcOfferContainer();
      container.addOffer(dlcOffer);
      container.addOffer(dlcOffer2);

      const instance = DlcOfferContainer.deserialize(container.serialize());

      expect(container.serialize()).to.deep.equal(instance.serialize());
    });
  });

  describe('TLVs', () => {
    it('should deserialize with all TLV types present', () => {
      const contractFlags = Buffer.from('00', 'hex');
      const chainHash = Buffer.from(
        '06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f',
        'hex',
      );
      const contractInfo = ContractInfoV0.deserialize(
        Buffer.from(
          'fdd82efd03e80000000000fe502bfda7209c0015fda72684000300fe00f3e2a30000fda72816000200fe00f3e2a30000fe000ea79ffe00f3e2a30000fe000ea79ffe00f3e2a30000fda7281a0002fe000ea79ffe00f3e2a30000fe000f47c8fe00fe502b0000fe000f47c8fe00fe502b0000fda7281a0002fe000f47c8fe00fe502b0000fe001ffffffe00fe502b0000fe001ffffffe00fe502b0000fda7240e000200fd8235fe000b71b0fd411afda712fd033afdd824fd03340c9050848d0ae5294a88020f45ee3c920dcf5c050effa1894480f1c7d6c8fb24ffb379ba9b87f6b4279b104761c776126f85400ea9bb6c6c91c8953af92ae686c3d07289c2ade25405c1c421b38c9322cd73fb2c89f42ce0730a35fae1f8875dfdd822fd02ce001536393424064fae281c59dfce1842dbdb1a696f34620611d25035ed53b8f79f07a855f3c3b2d300d4bfdce1e325b6a59a60272276d89f283db41ca90e3aedbb522fa3c1f8bc08de68c4c5b6ce177f0c62c683fca22b61eccb41fb06bb6e8881d3c23b4d88536e68d65de66e8a7d1c2ec0e6316fdc0d25c4cf42ebaf1775b168fdc847c824efd6f6ae43d9ba0e973de205979971020ebec4919c97cae238513e41e2bc759cd11d213ca2a118e948e0c380eb8bdcf4bcb5eebce6e57c2b22c10fd7083e53643d29206ff66ca5e02485c710e57a1a2de36612323cb7d6ddd1521b4128ce0fb18ff87dda1b796cefa1ec25e89e26f964a0bb6b78423cdf2dbf60df41f6187bdb7e01aeb6c53d7ccb608cc5afbd469e8b45017e1c34bf94dbfb58f3b9a363d4c89bb3ca7f060540b6b03ea6e296381c781fe70d9343aefa095dfdd39dc65f6f748a7a23d4b293ad36e2df52fd988d7a6327088afb483c45b4d21a8e13ef3bec9324cd8b8945dc3c7c534c2c742bd3ecd45bd2c50b78707ea43752ced2620e3cf429ab93c07e137ccf1662376e1d3290818a2020033911deeedc0fe8322091d5bb7b959723c15cb20b7fd2d71abded50cfd4b4db89076d87ad2a0171de9bac64d34e18b7c741618a4e68ca2431631c6fd88b5b90a1d007cc7ac22597df943df27b23d53a1e3a6fe01f5f230a8eb6ae8c7f4c1d40e63d2765250b66f468692bf1b0afa7d7e2ccc8cdc7ca6d691f3327aa3b5b27440ecf3cdcc0da0a9be605f3b4518685624688aa3da90e6a74041cf9330dda94f44d8aabf904e2e31fa54c0503289729cf92bbd63aaf56f97df7baa5a3b677cce06edf54602242671f18695728b465e95fa997a8a4852727e5416433970b902f918485554577129f130b177b7f9d958936c8adf69711e0369f07e8ce92cba06f6e0d91c3f32a8634e52b67046313fdd80a0e00020004626974730000000000151561746f6d69632d656e67696e652d74726164652d31',
          'hex',
        ),
      );
      const fundingPubkey = Buffer.from(
        '03636a2812026c6ea83a6eb27f579ae588aa48dd221fafa049e6613e48ff03953a',
        'hex',
      );
      const payoutSPK = Buffer.from(
        '0014ecf78cf9c4e3cf16b5dccdbd013a7b84cd530d0c',
        'hex',
      );
      const payoutSerialId = BigInt(29829);
      const offerCollateralSatoshis = BigInt(16649967);
      const fundingInput = FundingInputV0.deserialize(
        Buffer.from(
          'fda714fd01fd0000000000a34e3b01e70200000000010369a13b156aff1cf5027140f45d41840c5c552b6d1c512cbb3b1610b850e47ae40000000000feffffff55767d33c145aea3efe723d9803916340fd013ee4f5ad8491e88d38bf8cd180e0000000000feffffff6bab2f95d6b0ca6abf8e8adbec1e70a79bc553c433e1d942f49084f1a1b73bb70100000000feffffff0100e1f50500000000160014bc32a8067fe02ea3a0d1b0daf42e17dd4039992d02473044022055662f02effb509e37bc074c6915eddb09658e6d388e545270ad08ce0bf339a702204b54713323a9bf37e575d4f3349080e4fae1a50762ab2d572967d185a0d16e8901210293914f759527e8e47770750242e7198738705b3a4b2de4f672456497aebf00820247304402202f9d4f5dc184868f866f978f7b4433167d4f50d13329a91eef5f6feec1974019022059b38836960fc3d45fc60021fd2215ad54d2a50224f523e110d48ab63dec4e61012102248d7ea318582d01f9f4c5267a18e28b9a4c03f69877075451f37f4c38af529e0247304402202b592244c641b678d13b059b822754b8f532c0d8ba7ece9a1c3b199b7acea27e02202c506668a40278075d4c6ad68bab0fa8db26fcd1b458aa5becc8a3c845cd86d701210230dbeb555b88731390f0431d3b329002c057cec662d80a8b47f5560433f2efd63104000000000000ffffffff006c0000',
          'hex',
        ),
      );
      const changeSPK = Buffer.from(
        '0014a734d87e6d29d79422f7e5ea7a7709f65dac60e9',
        'hex',
      );
      const changeSerialId = BigInt(94880);
      const fundOutputSerialId = BigInt(44394);
      const feeRatePerVb = BigInt(45);
      const cetLocktime = 1712689645;
      const refundLocktime = 1719255498;
      const metadata = OrderMetadataV0.deserialize(
        Buffer.from('fdf5360f06656e67696e650000000000000000', 'hex'),
      );
      const ircInfo = OrderIrcInfoV0.deserialize(
        Buffer.from(
          'fdf53832104130346a7a504b4b726a6751456f506802dff1fe9bd33ce81881120be26c27d443247bfd3398866a7dc071867e94ff69c9',
          'hex',
        ),
      );
      const positionInfo = OrderPositionInfoV0.deserialize(
        Buffer.from(
          'fdf53a32010000000000001b121561746f6d69632d656e67696e652d74726164652d310000000000fe502b0000000000000000000000',
          'hex',
        ),
      );
      const batchFundingGroup = BatchFundingGroup.deserialize(
        BatchFundingGroup.deserialize(
          Buffer.from(
            'fdff967900000000000005f5e100051561746f6d69632d656e67696e652d74726164652d311561746f6d69632d656e67696e652d74726164652d321561746f6d69632d656e67696e652d74726164652d331561746f6d69632d656e67696e652d74726164652d341561746f6d69632d656e67696e652d74726164652d35',
            'hex',
          ),
        ).serialize(),
      );

      const closeInfos = CloseTLV.deserialize(
        Buffer.from(
          'fdff984cc1c79e1e9e2fa2840b2514902ea244f39eb3001a4037a52ea43c797d4f8412690000000005f5e100000000000000000000000000000000000000000000000000000000000000000000000000',
          'hex',
        ),
      );

      const dlcOffer = new DlcOfferV0();

      dlcOffer.contractFlags = contractFlags;
      dlcOffer.chainHash = chainHash;
      dlcOffer.contractInfo = contractInfo;
      dlcOffer.fundingPubKey = fundingPubkey;
      dlcOffer.payoutSPK = payoutSPK;
      dlcOffer.payoutSerialId = payoutSerialId;
      dlcOffer.offerCollateralSatoshis = offerCollateralSatoshis;
      dlcOffer.fundingInputs = [fundingInput];
      dlcOffer.changeSPK = changeSPK;
      dlcOffer.changeSerialId = changeSerialId;
      dlcOffer.fundOutputSerialId = fundOutputSerialId;
      dlcOffer.feeRatePerVb = feeRatePerVb;
      dlcOffer.cetLocktime = cetLocktime;
      dlcOffer.refundLocktime = refundLocktime;
      dlcOffer.metadata = metadata;
      dlcOffer.ircInfo = ircInfo;
      dlcOffer.positionInfo = positionInfo;
      dlcOffer.batchFundingGroups = [batchFundingGroup];
      dlcOffer.closeInfos = [closeInfos];

      expect(dlcOffer.toJSON()).to.deep.equal(
        DlcOfferV0.deserialize(dlcOffer.serialize()).toJSON(),
      );
    });
  });
});
