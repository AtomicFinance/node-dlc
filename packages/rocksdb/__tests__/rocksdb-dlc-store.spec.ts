// tslint:disable: no-unused-expression

import { OutPoint, Value } from '@node-dlc/bitcoin';
import { DlcTxBuilder } from '@node-dlc/core';
import { sha256, xor } from '@node-dlc/crypto';
import {
  DlcAcceptV0,
  DlcCancelV0,
  DlcCloseV0,
  DlcOfferV0,
  DlcSignV0,
  DlcTransactionsV0,
  FundingInputV0,
} from '@node-dlc/messaging';
import { expect } from 'chai';

import { RocksdbDlcStore } from '../lib/rocksdb-dlc-store';
import * as util from './rocksdb';

describe('RocksdbDlcStore', () => {
  let sut: RocksdbDlcStore;

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
    "64756d6d79" + // event_id dummy

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

  const dlcAcceptHex = Buffer.from(
    "a71c" + // type accept_dlc_v0
    "d5c1f8c466681e3e00830cef2de76e32705271790ea3d211ed2ab9f02780bece" + // temp_contract_id
    "0000000005f5e100" + // total_collateral_satoshis
    "026d8bec9093f96ccc42de166cb9a6c576c95fc24ee16b10e87c3baaa4e49684d9" + // funding_pubkey
    "0016" + // payout_spk_len
    "001436054fa379f7564b5e458371db643666365c8fb3" + // payout_spk
    "000000000018534a" + // payout_serial_id
    "0001" + // funding_inputs_len
    "fda714" + // type funding_input_v0
    "3f" + // length
    "000000000000dae8" + // input_serial_id
    "0029" + // prevtx_len
    "02000000000100c2eb0b000000001600149ea3bf2d6eb9c2ffa35e36f41e117403ed7fafe900000000" + // prevtx
    "00000000" + // prevtx_vout
    "ffffffff" + // sequence
    "006b" + // max_witness_len
    "0000" + // redeem_script_len
    "0016" + // change_spk_len
    "0014074c82dbe058212905bacc61814456b7415012ed" + // change_spk
    "00000000000d8117" + // change_serial_id
    "fda716" + // type cet_adaptor_signatures_v0
    "fd01e7" + // length
    "03" + // nb_signatures
    "016292f1b5c67b675aea69c95ec81e8462ab5bb9b7a01f810f6d1a7d1d886893b3605fe7fcb75a14b1b1de917917d37e9efac6437d7a080da53fb6dbbcfbfbe7a8" + // ecdsa_adaptor_signature_1
    "01efbecb2bce89556e1fb4d31622628830e02a6d04c487f67aca20e9f60fb127f985293541cd14e2bf04e4777d50953531e169dd37c65eb3cc17d6b5e4dbe58487f9fae1f68f603fe014a699a346b14a63048c26c9b31236d83a7e369a2b29a292" + // dleq_proof_1
    "00e52fe05d832bcce4538d9c27f3537a0f2086b265b6498f30cf667f77ff2fa87606574bc9a915ef57f7546ebb6852a490ad0547bdc52b19791d2d0f0cc0acabab" + // ecdsa_adaptor_signature_2
    "01f32459001a28850fa8ee4278111deb0494a8175f02e31a1c18b39bd82ec64026a6f341bcd5ba169d67b855030e36bdc65feecc0397a07d3bc514da69811ec5485f5553aebda782bc5ac9b47e8e11d701a38ef2c2b7d8af3906dd8dfc759754ce" + // dleq_proof_2
    "006f769592c744141a5ddface6e98f756a9df1bb75ad41508ea013bdfee133b396d85be51f870bf2e0ae836bfa984109dab96cc6f4ab2a7f118bc6b0b25a4c70d4" + // ecdsa_adaptor_signature_3
    "01c768c1d677c6ff0b7ea69fdf29aff1000794227db368dff16e838d1f44c4afe9e952ee63d603f7b14de13c1d73b363cc2b1740d0b688e73d8e71cddf40f8e7e912df413903779c4e5d6644c504c8609baec8fdcb90d6d341cf316748f5d7945f" +
    "7c8ad6de287b62a1ed1d74ed9116a5158abc7f97376d201caa88e0f9daad68fcda4c271cc003512e768f403a57e5242bd1f6aa1750d7f3597598094a43b1c7bb" + // refund_signature
    "fdd82600" // negotiation_fields
    , "hex"
  ); // prettier-ignore

  const dlcAccept = DlcAcceptV0.deserialize(dlcAcceptHex);

  const tempContractId = sha256(dlcOfferHex);

  const txBuilder = new DlcTxBuilder(dlcOffer, dlcAccept.withoutSigs());
  const tx = txBuilder.buildFundingTransaction();
  const fundingTxid = tx.txId.serialize();
  const contractId = xor(fundingTxid, tempContractId);

  const dlcSignHex = Buffer.from(
    "a71e" + // sign_dlc_v0
    contractId.toString('hex') + // contract_id
    "fda716" + // type cet_adaptor_signatures_v0
    "fd01e7" + // length
    "03" + // nb_signatures
    "00c706fe7ed70197a77397fb7ce8445fcf1d0b239b4ab41ebdad4f76e0a671d7830470f4fef96d0838e8f3cec33176a6a427d777b57d256f8545b570cd70297291" + // ecdsa_adaptor_signature_1
    "0192f8ad4eb341ac2867d203360516028b967b46ef0e5d1603b59a7d8ebc81d655dd11673febcf098006eba74b3604d0a1da818208ea2833079505a3dee7392255f0682e5b357a7382aae6e5bdcc728b94c9d0a52fb6f49ac5cbe32804fcfb71b1" + // dleq_proof_1
    "0125e92381be588737f6ac5c28325c843c6551995880f830d926abd35ee3f8ed9fdfc47a5fd277d0df2a1f1d0bafba8efad7b127e2a232a4846ed90810c81e6575" + // ecdsa_adaptor_signature_2
    "0039dba803adb78100f20ca12b09b68a92b996b07a5ee47806379cedfa217848644f48d96ed6443ea7143adf1ce19a4386d0841b5071e31f5d3e4c479eab6a856b426c80d091da3de3959b29e4c2e3ae47ddba2758c2ca1c6a064dfee4671ba501" + // dleq_proof_2
    "0098f2595778a1596054ffcafb599f8f4a65c4215de757548c142d50b12eb67d4c1407690b808e33eba95fe818223886fd8e9ce4c758b4662636af663e00553763" + // ecdsa_adaptor_signature_3
    "00a915ee71914ee8ae2c18d55b397649c0057a01f0a85c6ecf1b0eb26f7485f21b24c89013e1cb15a4bf40256e52a66751f33de46032db0801975933be2977a1e37d5d5f2d43f48481cc68783dbfeb21a35c62c1ca2eb6ee2ccfc12b74e9fd7a08" + // dleq_proof_3
    "fbf56fbb4bbcb01d1be3169dfda6f465020ee89c1e368d4a91e36d0d4cc44e6123db348c223988dfe147d611ae9351d6e78cfb902e3d01beed0c909e52a3aae9" + // refund_signature
    "fda718" + // type funding_signatures_v0
    "70" + // length
    "0001" + // num_witnesses
    "0002" + // stack_len
    "0047" + // stack_element_len
    "304402203812d7d194d44ec68f244cc3fd68507c563ec8c729fdfa3f4a79395b98abe84f0220704ab3f3ffd9c50c2488e59f90a90465fccc2d924d67a1e98a133676bf52f37201" + // stack_element
    "0021" + // stack_element_len
    "02dde41aa1f21671a2e28ad92155d2d66e0b5428de15d18db4cbcf216bf00de919" // stack_element
    , "hex"
  ); // prettier-ignore

  const dlcSign = DlcSignV0.deserialize(dlcSignHex);

  const dlcTxsHex = Buffer.from(
    'ef2e5beedf007afc0528fadd297df3ad2568ab23b777cc1f1cbc36ee42aad5fdc83b00c502000000027d271264eaa899ce808a151b67a05a5e138bc59bff4a81acc606bbcc2054c33a0000000000ffffffff49956aee0f04ebeed5935729a2d6d5dc6abb5342acaa0248090c78b049e4d4e30000000000ffffffff0355a8980400000000220020543ff4768635379e2d3101d97f5a2a5e15d2acba04a6bd1322970241de8c593ce11f530700000000160014dddb7840134737de920ac4337cfd700a94d40ee6f2b1eb0b000000001600141b77056446c159cd6228632173c6117d67ed7df200000000000000005293da71b1c64a177c6d9cef747ba44c7e05b476663ba1c2af423ee15077287a00000b460000000000710200000001b2beedb20c5df1ab779b521a3a8fdb217784b76c76de505db3686b3b788f9d080000000000feffffff02e1999804000000001600144b71dd93c0727574dfd8403ed5f375922c6e3813d007000000000000160014cc6f10246659b11e40bc8c7d346f43aae79cf2d78c1064600100710200000001b2beedb20c5df1ab779b521a3a8fdb217784b76c76de505db3686b3b788f9d080000000000ffffffff02e0739804000000001600144b71dd93c0727574dfd8403ed5f375922c6e3813d12d000000000000160014cc6f10246659b11e40bc8c7d346f43aae79cf2d70000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    'hex',
  );

  const dlcTxs = DlcTransactionsV0.deserialize(dlcTxsHex);

  const dlcCancelHex = Buffer.from(
    'cbcc' +
      'c1c79e1e9e2fa2840b2514902ea244f39eb3001a4037a52ea43c797d4f841269' +
      '00',
    'hex',
  );

  const dlcCancel = DlcCancelV0.deserialize(dlcCancelHex);

  const dlcCloseHex = Buffer.from(
    'cbca' +
      'c1c79e1e9e2fa2840b2514902ea244f39eb3001a4037a52ea43c797d4f841269' +
      '7c8ad6de287b62a1ed1d74ed9116a5158abc7f97376d201caa88e0f9daad68fcda4c271cc003512e768f403a57e5242bd1f6aa1750d7f3597598094a43b1c7bb' +
      '0000000005f5e100' +
      '0000000005f5e100' +
      '00000000075bcd15' +
      '0001' +
      'fda714' + // type funding_input_v0
      '3f' + // length
      '000000000000dae8' + // input_serial_id
      '0029' + // prevtx_len
      '02000000000100c2eb0b000000001600149ea3bf2d6eb9c2ffa35e36f41e117403ed7fafe900000000' + // prevtx
      '00000000' + // prevtx_vout
      'ffffffff' + // sequence
      '006b' + // max_witness_len
      '0000' + // redeem_script_len
      'fda718' + // type funding_signatures_v0
      '70' + // length
      '0001' + // num_witnesses
      '0002' + // stack_len
      '0047' + // stack_element_len
      '304402203812d7d194d44ec68f244cc3fd68507c563ec8c729fdfa3f4a79395b98abe84f0220704ab3f3ffd9c50c2488e59f90a90465fccc2d924d67a1e98a133676bf52f37201' + // stack_element
      '0021' + // stack_element_len
      '02dde41aa1f21671a2e28ad92155d2d66e0b5428de15d18db4cbcf216bf00de919', // stack_element
    'hex',
  );

  const dlcClose = DlcCloseV0.deserialize(dlcCloseHex);

  // Batch Dlc Messages

  // Increase funding input amount to match minimum collateral for batch
  const dlcOfferForBatch = DlcOfferV0.deserialize(dlcOffer.serialize());
  (dlcOfferForBatch
    .fundingInputs[0] as FundingInputV0).prevTx.outputs[0].value = Value.fromBitcoin(
    4,
  );

  // Increase funding input amount to match minimum collateral for batch
  const dlcAcceptForBatch = DlcAcceptV0.deserialize(dlcAccept.serialize());
  dlcAcceptForBatch.tempContractId = sha256(dlcOfferForBatch.serialize());
  (dlcAcceptForBatch
    .fundingInputs[0] as FundingInputV0).prevTx.outputs[0].value = Value.fromBitcoin(
    4,
  );

  before(async () => {
    util.rmdir('.testdb');
    sut = new RocksdbDlcStore('./.testdb/nested/dir');
    await sut.open();
  });

  after(async () => {
    await sut.close();
    util.rmdir('.testdb');
  });

  describe('save dlc_offer', () => {
    it('should save dlc_offer', async () => {
      await sut.saveDlcOffer(dlcOffer);
    });
  });

  describe('find dlc_offer by tempContractId', () => {
    it('should return the dlc_offer object', async () => {
      const tempContractId = sha256(dlcOfferHex);
      const actual = await sut.findDlcOffer(tempContractId);

      const actualFundingInputs = actual.fundingInputs as FundingInputV0[];
      const expectedFundingInputs = dlcOffer.fundingInputs as FundingInputV0[];

      expect(
        actualFundingInputs[0].prevTx.serialize().toString('hex'),
      ).to.equal(expectedFundingInputs[0].prevTx.serialize().toString('hex'));
      expect(actual.contractInfo).to.deep.equal(dlcOffer.contractInfo);
    });
  });

  describe('find dlc_offer by eventId', () => {
    it('should return the dlc_offer object', async () => {
      const response = await sut.findDlcOffersByEventId('dummy');

      const actual = response[0];

      const actualFundingInputs = actual.fundingInputs as FundingInputV0[];
      const expectedFundingInputs = dlcOffer.fundingInputs as FundingInputV0[];

      expect(
        actualFundingInputs[0].prevTx.serialize().toString('hex'),
      ).to.equal(expectedFundingInputs[0].prevTx.serialize().toString('hex'));
      expect(actual.contractInfo).to.deep.equal(dlcOffer.contractInfo);
    });
  });

  describe('find num_dlc_offer', () => {
    it('should return the num_dlc_offer', async () => {
      const numDlcOffers = await sut.findNumDlcOffers();
      expect(numDlcOffers).to.equal(1);
    });
  });

  describe('delete dlc_offer', () => {
    it('should delete dlc_offer', async () => {
      const tempContractId = sha256(dlcOfferHex);

      await sut.deleteDlcOffer(tempContractId);

      const actual = await sut.findDlcOffer(tempContractId);
      expect(actual).to.be.undefined;
    });
  });

  describe('save dlc_accept', () => {
    it('should save dlc_accept', async () => {
      await sut.saveDlcOffer(dlcOffer);
      await sut.saveDlcAccept(dlcAccept);
    });
  });

  describe('find dlc_accept by contractId', () => {
    it('should return the dlc_accept object', async () => {
      const actual = await sut.findDlcAccept(contractId);

      expect(
        actual.fundingInputs[0].prevTx.serialize().toString('hex'),
      ).to.equal(dlcAccept.fundingInputs[0].prevTx.serialize().toString('hex'));
      expect(actual.cetSignatures).to.deep.equal(dlcAccept.cetSignatures);
    });
  });

  describe('find dlc_accept by outpoint', () => {
    it('should return dlc accept object', async () => {
      const outpointStr = `${dlcAccept.fundingInputs[0].prevTx.txId.toString()}:${
        dlcAccept.fundingInputs[0].prevTxVout
      }`;
      const outpoint = OutPoint.fromString(outpointStr);
      const actual = await sut.findDlcAcceptByOutpoint(outpoint);

      expect(
        actual.fundingInputs[0].prevTx.serialize().toString('hex'),
      ).to.equal(dlcAccept.fundingInputs[0].prevTx.serialize().toString('hex'));
      expect(actual.cetSignatures).to.deep.equal(dlcAccept.cetSignatures);
    });
  });

  describe('find dlc_accept by temp_contract_id', () => {
    it('should return dlc accept object', async () => {
      const actualContractId = await sut.findContractIdFromTemp(
        dlcAccept.tempContractId,
      );
      const actual = await sut.findDlcAccept(actualContractId);

      expect(
        actual.fundingInputs[0].prevTx.serialize().toString('hex'),
      ).to.equal(dlcAccept.fundingInputs[0].prevTx.serialize().toString('hex'));
      expect(actual.cetSignatures).to.deep.equal(dlcAccept.cetSignatures);
    });
  });

  describe('find dlc_offer by contract_id', () => {
    it('should return dlc offer object', async () => {
      const tempContractIdsMapping = await sut.findTempContractIds([
        contractId,
      ]);
      const dlcOffers = await sut.findDlcOffersByTempContractIds(
        tempContractIdsMapping.map(
          (tempContractIdsMapping) => tempContractIdsMapping[1],
        ),
      );

      const actual = dlcOffers[0];

      const actualFundingInputs = actual.fundingInputs as FundingInputV0[];
      const expectedFundingInputs = dlcOffer.fundingInputs as FundingInputV0[];

      expect(
        actualFundingInputs[0].prevTx.serialize().toString('hex'),
      ).to.equal(expectedFundingInputs[0].prevTx.serialize().toString('hex'));
      expect(actual.contractInfo).to.deep.equal(dlcOffer.contractInfo);
    });
  });

  describe('find first dlc_accept', () => {
    it('should return dlc accept object', async () => {
      const actual = await sut.findFirstDlcAccept();

      expect(
        actual.fundingInputs[0].prevTx.serialize().toString('hex'),
      ).to.equal(dlcAccept.fundingInputs[0].prevTx.serialize().toString('hex'));
      expect(actual.cetSignatures).to.deep.equal(dlcAccept.cetSignatures);
    });
  });

  describe('find num_dlc_accept', () => {
    it('should return the num_dlc_accept', async () => {
      const numDlcAccepts = await sut.findNumDlcAccepts();
      expect(numDlcAccepts).to.equal(1);
    });
  });

  describe('save dlc_accepts', () => {
    it('should save batch dlc accepts', async () => {
      await sut.saveDlcOffer(dlcOfferForBatch);
      await sut.saveDlcAccepts([dlcAcceptForBatch, dlcAcceptForBatch]);
    });
  });

  describe('delete dlc_offer', () => {
    it('should delete dlc_offer', async () => {
      await sut.deleteDlcOffer(contractId);

      const actual = await sut.findDlcOffer(contractId);
      expect(actual).to.be.undefined;
    });
  });

  describe('save dlc_sign', () => {
    it('should save dlc_sign', async () => {
      await sut.saveDlcSign(dlcSign);
    });
  });

  describe('find dlc_sign by contractId', () => {
    it('should return the dlc_sign object', async () => {
      const actual = await sut.findDlcSign(dlcSign.contractId);
      expect(actual).to.deep.equal(dlcSign);
    });
  });

  describe('find num_dlc_sign', () => {
    it('should return the num_dlc_sign', async () => {
      const numDlcSigns = await sut.findNumDlcSigns();
      expect(numDlcSigns).to.equal(1);
    });
  });

  describe('delete dlc_sign', () => {
    it('should delete dlc_sign', async () => {
      await sut.deleteDlcSign(dlcSign.contractId);

      const actual = await sut.findDlcSign(dlcSign.contractId);
      expect(actual).to.be.undefined;
    });
  });

  describe('save dlc_cancel', () => {
    it('should save dlc_cancel', async () => {
      await sut.saveDlcCancel(dlcCancel);
    });
  });

  describe('find dlc_cancel by contractId', () => {
    it('should return the dlc_cancel object', async () => {
      const actual = await sut.findDlcCancel(dlcCancel.contractId);
      expect(actual).to.deep.equal(dlcCancel);
    });
  });

  describe('delete dlc_cancel', () => {
    it('should delete dlc_cancel', async () => {
      await sut.deleteDlcCancel(dlcCancel.contractId);

      const actual = await sut.findDlcSign(dlcCancel.contractId);
      expect(actual).to.be.undefined;
    });
  });

  describe('save dlc_close', () => {
    it('should save dlc_close', async () => {
      await sut.saveDlcClose(dlcClose);
    });
  });

  describe('find dlc_close by contractId', () => {
    it('should return the dlc_close object', async () => {
      const actual = await sut.findDlcClose(dlcClose.contractId);
      expect(actual).to.deep.equal(dlcClose);
    });
  });

  describe('delete dlc_close', () => {
    it('should delete dlc_close', async () => {
      await sut.deleteDlcClose(dlcClose.contractId);
      const actual = await sut.findDlcSign(dlcClose.contractId);
      expect(actual).to.be.undefined;
    });
  });

  describe('save dlc_transactions', () => {
    it('should save dlc_transactions', async () => {
      await sut.saveDlcTransactions(dlcTxs);
    });
  });

  describe('find dlc_transactions by contractId', () => {
    it('should return the dlc_txs object', async () => {
      const actual = await sut.findDlcTransactions(dlcTxs.contractId);
      expect(actual.fundTx.serialize()).to.deep.equal(
        dlcTxs.fundTx.serialize(),
      );
    });
  });

  describe('find dlc_transactions by outpoint', () => {
    it('should return dlc_txs object', async () => {
      const outpoint = OutPoint.fromString(
        `${dlcTxs.fundTx.txId.toString()}:${dlcTxs.fundTxVout}`,
      );

      const actual = await sut.findDlcTransactionsByOutpoint(outpoint);
      expect(actual.fundTx.serialize()).to.deep.equal(
        dlcTxs.fundTx.serialize(),
      );
    });
  });

  describe('find dlc_transactions by scriptpubkey', () => {
    it('should return dlc_txs object', async () => {
      const scriptPubKey =
        dlcTxs.fundTx.outputs[dlcTxs.fundTxVout].scriptPubKey;

      const actual = await sut.findDlcTransactionsByScriptPubKey(scriptPubKey);
      expect(actual.fundTx.serialize()).to.deep.equal(
        dlcTxs.fundTx.serialize(),
      );
    });
  });

  describe('find num_dlc_transactions', () => {
    it('should return the num_dlc_transactions', async () => {
      const numDlcTxs = await sut.findNumDlcTransactionsList();
      expect(numDlcTxs).to.equal(1);
    });
  });

  describe('delete dlc_transactions', () => {
    it('should', async () => {
      await sut.deleteDlcTransactions(dlcTxs.contractId);

      const actual = await sut.findDlcTransactions(dlcTxs.contractId);
      expect(actual).to.be.undefined;
    });
  });
});
