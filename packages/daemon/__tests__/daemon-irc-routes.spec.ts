import chai from 'chai';
import chaiHttp from 'chai-http';
import Server from '../lib/server';
import { ConsoleTransport, Logger } from '@node-lightning/logger';
import { Application } from 'express';
import express from 'express';
import * as util from './daemon';
import { Endpoint } from '../lib/routes';
import {
  ContractInfoV0,
  DlcOfferV0,
  OrderAcceptV0,
  OrderNegotiationFieldsV0,
  OrderNegotiationFieldsV1,
  OrderOfferV0,
  AddressCache,
  ChainManager,
  DlcTransactionsV0,
  MessageType,
} from '@node-dlc/messaging';
import { confToLogLevel } from '../lib/utils/config';
import HttpException from '../lib/routes/handler/HttpException';
import request from 'superagent';
import { sha256 } from '@node-lightning/crypto';
import { createWallet } from './wallet';
import { client, importAndFundClient } from './chain';
import { signAsync as signBitcoinMessage } from 'bitcoinjs-message';
import { EXPECTED_PREFIX, verifyToken } from '../lib/utils/crypto';
import secp256k1 from 'secp256k1';

chai.use(chaiHttp);
chai.should();
const expect = chai.expect;

describe('Irc Routes', () => {
  const argv = util.getArgv('irc');
  let server: Server;
  const logger = new Logger('DLCd');
  if (util.enableLogger) {
    logger.transports.push(new ConsoleTransport(console));
    logger.level = confToLogLevel(argv.loglevel);
  }
  const app: Application = express();
  const apiPrefix = 'api';
  const apiV0Prefix = 'api/v0';

  const contractInfo = ContractInfoV0.deserialize(
    Buffer.from(
      'fdd82e' + // contract_info_v0
        'fd0332' + // length
        '00000000000f06a5' + // total_collateral
        'fda720' + // contract_descriptor_v1
        '45' + // length
        '0012' + // num_digits
        'fda726' + // payout_function
        '35' + // length
        '0001' + // num_pieces
        '00' + // endpoint_0
        'fe000f06a5' + // endpoint_payout_0
        '0000' + // extra_precision
        'fda72c' + // hyperbola_payout_curve_piece
        '1f' + // length
        '01' + // use_positive_piece
        '01' + // translate_outcome_sign
        '00' + // translate_outcome
        '0000' + // translate_outcome_extra_precision
        '00' + // translate_payout_sign
        'fd3b9b' + // translate_payout
        '0000' + // translate_payout_extra_precision
        '01' + // a_sign
        '01' + // a
        '0000' + // a_extra_precision
        '01' + // b_sign
        '00' + // b
        '0000' + // b_extra_precision
        '01' + // c_sign
        '00' + // c
        '0000' + // c_extra_precision
        '01' + // d_sign
        'feee6b2800' + // d
        '0000' + // d_extra_precision
        'fe0003ffff' + // endpoint
        '00' + // endpoint_payout
        '0000' + // extra_precision
        'fda724' + // rounding_interval
        '06' + // length
        '0001' + // num_rounding_intervals
        '00' + // begin_interval
        'fd01f4' + // rounding_mod
        'fda712' + // oracle_info
        'fd02db' + // length
        'fdd824' + // oracle_announcement_v0
        'fd02d5' + // length
        '9a121c157514df82ea0c57d0d82c78105f6272fc4ebd26d0c8f2903f406759e38e77578edee940590b11b875bacdac30ce1f4b913089a7e4e95884edf6f3eb19' + // announcement_sig
        '5d1bcfab252c6dd9edd7aea4c5eeeef138f7ff7346061ea40143a9f5ae80baa9' + // oracle_pubkey
        'fdd822' + // oracle_event
        'fd026f0012' +
        'd39fca86c2492977c0a2909583b2c154bb121834658d75502d41a0e3b719fb0c' + // oracle_nonce_1
        'd80ea2438d18d049be2d3aa4f1a3096628614d7bdda32757fd9a206c8e8c25c5' + // oracle_nonce_2
        '14b68799e03bb713d542f6c35ffaa0917fe18646969c77d56f4d8aa0f0fb30b2' + // oracle_nonce_3
        '6d746cb0713e27a56f8aa56dc828120b523fee21b2f0bc9d3a4a6d9855c251fd' + // oracle_nonce_4
        '6405bb7f6c1dfee97d24cfd7ad533c06162a22f4fc9fdd0e5c02e94201c239bb' + // oracle_nonce_5
        '13753ab5c56881f55367321ebd44e302241b42c99aa67dffb2d229178701d71a' + // oracle_nonce_6
        '756244c433d15f9b20d33628540da5c07face604980e5f709aa0bbfdb157b7a8' + // oracle_nonce_7
        'abc8d946f9e5d67c1e91bf22d77f5c097e6b3a51a420a8d882a3cad98cb4f84a' + // oracle_nonce_8
        'ce075a8acee1ef4f229e1b2b403ffb9f43a825ca8410b7d803b91ae54959ecd6' + // oracle_nonce_9
        '30e824310749ed1ee54e0e40e0af49d9a11bfbdbf36146234063c00520ed4416' + // oracle_nonce_10
        'a2dafe74f9c0542b2d58c58fa75e9bb5a95c291d934f4dd513c405e9ddc58543' + // oracle_nonce_11
        'ab4a586bf0b9abf7a12aa272ff29429df38164e3e5d418b913c818c1858a3a8b' + // oracle_nonce_12
        '19355a1ceaee7318a245bab2b09d94bf39f7b600665c3b8b8a655cf54f85c1b3' + // oracle_nonce_13
        '8ed41798968a0da05884d9f0e201b3e3be3a3740cf31439fd325248eed65fa93' + // oracle_nonce_14
        '44390f5748bbbbbcab4b2f200b9fdd860a1fc813431e0aff174476f4d4d254c6' + // oracle_nonce_15
        'ecbb4f8f31ba16858a95a4d138e206c8d96126a69b2b7ebb6b2ec9c3a37a9a12' + // oracle_nonce_16
        '8162aed19361e41b0fe4ff1504df2a0bd150d7c96860d08990f12eb65bf5e5da' + // oracle_nonce_17
        'b79e0fe16db4e7a26d9817d7e50a2c37a8c44a330de349d2ce9e33b802aa0f97' + // oracle_nonce_18
        '605d2400' + // event_maturity_epoch
        'fdd80a' + // event_descriptor
        '11' + // length
        '0002' + // base
        '00074254432d55534400000000001213446572696269742d4254432d32364d41523231',
      'hex',
    ),
  );
  const offerCollateralSatoshis = 967482;
  const feeRatePerVb = 30;
  const cetLocktime = 1616723990;
  const refundLocktime = 1616723990;

  const newFeeRatePerVb = 35;

  const orderOffer = new OrderOfferV0();
  orderOffer.chainHash = util.chainHash;
  orderOffer.contractInfo = contractInfo;
  orderOffer.offerCollateralSatoshis = BigInt(offerCollateralSatoshis);
  orderOffer.feeRatePerVb = BigInt(feeRatePerVb);
  orderOffer.cetLocktime = cetLocktime;
  orderOffer.refundLocktime = refundLocktime;

  const tempOrderId = sha256(orderOffer.serialize());

  const orderNegotiationFieldsOne = new OrderNegotiationFieldsV0();

  const orderAcceptOne = new OrderAcceptV0();
  orderAcceptOne.tempOrderId = tempOrderId;
  orderAcceptOne.negotiationFields = orderNegotiationFieldsOne;

  const acceptOrderOffer = new OrderOfferV0();
  acceptOrderOffer.chainHash = util.chainHash;
  acceptOrderOffer.contractInfo = contractInfo;
  acceptOrderOffer.offerCollateralSatoshis = BigInt(offerCollateralSatoshis);
  acceptOrderOffer.feeRatePerVb = BigInt(newFeeRatePerVb); // set new feerate
  acceptOrderOffer.cetLocktime = cetLocktime;
  acceptOrderOffer.refundLocktime = refundLocktime;

  const orderNegotiationFieldsTwo = new OrderNegotiationFieldsV1();
  orderNegotiationFieldsTwo.orderOffer = acceptOrderOffer;

  const orderAcceptTwo = new OrderAcceptV0();
  orderAcceptTwo.tempOrderId = tempOrderId;
  orderAcceptTwo.negotiationFields = orderNegotiationFieldsTwo;

  const dlcOfferHex = Buffer.from(
    "a71a" + // type
    "00" + // contract_flags
    "06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f" + // chain_hash
    "fdd82e" + // type contract_info
    "fd0131" + // length
    "000000000bebc200" + // total_collateral
    "fda710" + // type contract_descriptor
    "79" + // length
    "03" + // num_outcomes
    "c5a7affd51901bc7a51829b320d588dc7af0ad1f3d56f20a1d3c60c9ba7c6722" + // outcome_1
    "0000000000000000" + // payout_1
    "adf1c23fbeed6611efa5caa0e9ed4c440c450a18bc010a6c867e05873ac08ead" + // outcome_2
    "00000000092363a3" + // payout_2
    "6922250552ad6bb10ab3ddd6981b530aa9a6fd05725bf85b59e3e51163905288" + // outcome_3
    "000000000bebc200" + // payout_3
    "fda712" + // type oracle_info
    "a8" + // length
    "fdd824" + // type oracle_announcement
    "a4" + // length
    "fab22628f6e2602e1671c286a2f63a9246794008627a1749639217f4214cb4a9" + // announcement_signature_r
    "494c93d1a852221080f44f697adb4355df59eb339f6ba0f9b01ba661a8b108d4" + // announcement_signature_s
    "da078bbb1d34e7729e38e2ae34236e776da121af442626fa31e31ae55a279a0b" + // oracle_public_key
    "fdd822" + // type oracle_event
    "40" + // length
    "0001" + // nb_nonces
    "3cfba011378411b20a5ab773cb95daab93e9bcd1e4cce44986a7dda84e01841b" + // oracle_nonces
    "00000000" + // event_maturity_epoch
    "fdd806" + // type enum_event_descriptor
    "10" + // length
    "0002" + // num_outcomes
    "06" + // outcome_1_len
    "64756d6d7931" + // outcome_1
    "06" + // outcome_2_len
    "64756d6d7932" + // outcome_2
    "05" + // event_id_length
    "64756d6d79" + // event_id
    "0327efea09ff4dfb13230e887cbab8821d5cc249c7ff28668c6633ff9f4b4c08e3" + // funding_pubkey
    "0016" + // payout_spk_len
    "00142bbdec425007dc360523b0294d2c64d2213af498" + // payout_spk
    "0000000000b051dc" + // payout_serial_id
    "0000000005f5e100" + // total_collateral_satoshis
    "0001" + // funding_inputs_len
    "fda714" + // type funding_input
    "3f" + // length
    "000000000000fa51" + // input_serial_id
    "0029" + // prevtx_len
    "02000000000100c2eb0b00000000160014369d63a82ed846f4d47ad55045e594ab95539d6000000000" + // prevtx
    "00000000" + // prevtx_vout
    "ffffffff" + // sequence
    "006b" + // max_witness_len
    "0000" + // redeemscript_len
    "0016" + // change_spk_len
    "0014afa16f949f3055f38bd3a73312bed00b61558884" + // change_spk
    "00000000001ea3ed" + // change_serial_id
    "000000000052947a" + // funding_output_serial_id
    "0000000000000001" + // fee_rate_per_vb
    "00000064" + // cet_locktime
    "000000c8" // refund_locktime
    , "hex"
  ); // prettier-ignore

  const dlcOffer = DlcOfferV0.deserialize(dlcOfferHex);

  before(async () => {
    util.rmdir(argv.datadir);
    server = new Server(app, argv, logger);
    server.start();
    createWallet(server);
  });

  after(async () => {
    util.rmdir(argv.datadir);
    server.stop();
  });

  describe.only('Send Dlc Offer', () => {
    it('should', async () => {
      const derivationPath = `${MessageType.DlcOfferV0}'/1'/0'/0/0`;
      const keyPair = await client.getMethod('keyPair')(derivationPath);
      console.log('keyPair privkey', keyPair.privateKey);
      console.log('keyPair pubkey', keyPair.publicKey);

      const currentTime = Math.floor(new Date().getTime() / 1000);

      const msg = sha256(Buffer.from(`${EXPECTED_PREFIX}/${currentTime}`));
      const sig = secp256k1.ecdsaSign(msg, keyPair.privateKey);
      console.log('sig', sig);

      verifyToken(sig.signature, currentTime, keyPair.publicKey);

      expect(1).to.equal(1);
    });
  });
});
