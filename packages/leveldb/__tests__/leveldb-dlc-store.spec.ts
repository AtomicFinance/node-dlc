// tslint:disable: no-unused-expression

import {
  LockTime,
  OutPoint,
  Script,
  Sequence,
  Tx,
  TxIn,
  TxOut,
  Value,
} from '@node-dlc/bitcoin';
import { DlcTxBuilder } from '@node-dlc/core';
import { sha256, xor } from '@node-dlc/crypto';
import {
  CetAdaptorSignatures,
  ContractInfoType,
  DlcAccept,
  DlcCancelV0,
  DlcClose,
  DlcOffer,
  DlcSign,
  DlcTransactionsV0,
  EnumeratedDescriptor,
  EnumEventDescriptor,
  FundingInput,
  FundingSignatures,
  OracleAnnouncement,
  OracleEvent,
  ScriptWitnessV0,
  SingleContractInfo,
  SingleOracleInfo,
} from '@node-dlc/messaging';
import { expect } from 'chai';

import { LeveldbDlcStore } from '../lib/leveldb-dlc-store';
import * as util from './leveldb';

describe('LeveldbDlcStore', () => {
  let sut: LeveldbDlcStore;

  // Helper function to create Script from hex
  function createScriptFromHex(hex: string): Script {
    const scriptCmds = Script.parseCmds(Buffer.from(hex, 'hex'));
    return new Script(...scriptCmds);
  }

  // Create test data programmatically instead of using old hardcoded hex
  function createTestDlcOffer(): DlcOffer {
    // Create enum event descriptor
    const eventDescriptor = new EnumEventDescriptor();
    eventDescriptor.outcomes = ['dummy1', 'dummy2'];

    // Create oracle event
    const oracleEvent = new OracleEvent();
    oracleEvent.eventMaturityEpoch = 0;
    oracleEvent.eventDescriptor = eventDescriptor;
    oracleEvent.eventId = 'dummy';
    oracleEvent.oracleNonces = [Buffer.alloc(32, 0x3c)];

    // Create oracle announcement
    const oracleAnnouncement = new OracleAnnouncement();
    oracleAnnouncement.announcementSig = Buffer.alloc(64, 0xfa);
    oracleAnnouncement.oraclePubkey = Buffer.alloc(32, 0xda);
    oracleAnnouncement.oracleEvent = oracleEvent;

    // Create oracle info
    const oracleInfo = new SingleOracleInfo();
    oracleInfo.announcement = oracleAnnouncement;

    // Create contract descriptor
    const contractDescriptor = new EnumeratedDescriptor();
    contractDescriptor.outcomes = [
      { outcome: 'dummy1', localPayout: BigInt(0) },
      { outcome: 'dummy2', localPayout: BigInt(153323539) },
    ];

    // Create contract info
    const contractInfo = new SingleContractInfo();
    contractInfo.contractInfoType = ContractInfoType.Single; // Set explicit type for Single
    contractInfo.totalCollateral = BigInt(200000000);
    contractInfo.contractDescriptor = contractDescriptor;
    contractInfo.oracleInfo = oracleInfo;

    // Create funding input
    const fundingInput = new FundingInput();
    fundingInput.inputSerialId = BigInt(64081);
    fundingInput.prevTxVout = 0;
    fundingInput.sequence = Sequence.default();
    fundingInput.maxWitnessLen = 107;
    fundingInput.redeemScript = Buffer.alloc(0);

    // Create a minimal prev transaction with enough funding (2 BTC to cover collateral + fees)
    const prevTx = new Tx(
      2, // version
      [
        new TxIn(
          new OutPoint('0'.repeat(64), 0), // Use hex string instead of Buffer
          new Script(), // Empty script
          Sequence.default(), // Use Sequence instead of number
          [],
        ),
      ],
      [
        new TxOut(
          Value.fromBitcoin(2), // Increased from 1 to 2 BTC to cover collateral + fees
          createScriptFromHex('0014369d63a82ed846f4d47ad55045e594ab95539d60'),
        ),
      ],
      new LockTime(0),
    );
    fundingInput.prevTx = prevTx;

    // Create DLC offer
    const dlcOffer = new DlcOffer();
    dlcOffer.contractFlags = Buffer.from('00', 'hex');
    dlcOffer.chainHash = Buffer.from(
      '06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f',
      'hex',
    );
    dlcOffer.temporaryContractId = Buffer.from(
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      'hex',
    );
    dlcOffer.contractInfo = contractInfo;
    dlcOffer.fundingPubkey = Buffer.from(
      '0327efea09ff4dfb13230e887cbab8821d5cc249c7ff28668c6633ff9f4b4c08e3',
      'hex',
    );
    dlcOffer.payoutSpk = Buffer.from(
      '00142bbdec425007dc360523b0294d2c64d2213af498',
      'hex',
    );
    dlcOffer.payoutSerialId = BigInt(11546076);
    dlcOffer.offerCollateral = BigInt(100000000);
    dlcOffer.fundingInputs = [fundingInput];
    dlcOffer.changeSpk = Buffer.from(
      '0014afa16f949f3055f38bd3a73312bed00b61558884',
      'hex',
    );
    dlcOffer.changeSerialId = BigInt(2008045);
    dlcOffer.fundOutputSerialId = BigInt(5412474);
    dlcOffer.feeRatePerVb = BigInt(1);
    dlcOffer.cetLocktime = 100;
    dlcOffer.refundLocktime = 200;

    return dlcOffer;
  }

  function createTestDlcAccept(tempContractId: Buffer): DlcAccept {
    // Create funding input for accept
    const fundingInput = new FundingInput();
    fundingInput.inputSerialId = BigInt(56040);
    fundingInput.prevTxVout = 0;
    fundingInput.sequence = Sequence.default();
    fundingInput.maxWitnessLen = 107;
    fundingInput.redeemScript = Buffer.alloc(0);

    // Create a minimal prev transaction with enough funding (2 BTC to cover collateral + fees)
    const prevTx = new Tx(
      2,
      [
        new TxIn(
          new OutPoint('0'.repeat(64), 0),
          new Script(),
          Sequence.default(),
          [],
        ),
      ],
      [
        new TxOut(
          Value.fromBitcoin(2), // Increased from 1 to 2 BTC to cover collateral + fees
          createScriptFromHex('00149ea3bf2d6eb9c2ffa35e36f41e117403ed7fafe9'),
        ),
      ],
      new LockTime(0),
    );
    fundingInput.prevTx = prevTx;

    // Create CET adaptor signatures
    const cetAdaptorSignatures = new CetAdaptorSignatures();
    cetAdaptorSignatures.sigs = [
      {
        encryptedSig: Buffer.from(
          '016292f1b5c67b675aea69c95ec81e8462ab5bb9b7a01f810f6d1a7d1d886893b3605fe7fcb75a14b1b1de917917d37e9efac6437d7a080da53fb6dbbcfbfbe7a8',
          'hex',
        ),
        dleqProof: Buffer.from(
          '01efbecb2bce89556e1fb4d31622628830e02a6d04c487f67aca20e9f60fb127f985293541cd14e2bf04e4777d50953531e169dd37c65eb3cc17d6b5e4dbe58487f9fae1f68f603fe014a699a346b14a63048c26c9b31236d83a7e369a2b29a292',
          'hex',
        ),
      },
      {
        encryptedSig: Buffer.from(
          '00e52fe05d832bcce4538d9c27f3537a0f2086b265b6498f30cf667f77ff2fa87606574bc9a915ef57f7546ebb6852a490ad0547bdc52b19791d2d0f0cc0acabab',
          'hex',
        ),
        dleqProof: Buffer.from(
          '01f32459001a28850fa8ee4278111deb0494a8175f02e31a1c18b39bd82ec64026a6f341bcd5ba169d67b855030e36bdc65feecc0397a07d3bc514da69811ec5485f5553aebda782bc5ac9b47e8e11d701a38ef2c2b7d8af3906dd8dfc759754ce',
          'hex',
        ),
      },
      {
        encryptedSig: Buffer.from(
          '006f769592c744141a5ddface6e98f756a9df1bb75ad41508ea013bdfee133b396d85be51f870bf2e0ae836bfa984109dab96cc6f4ab2a7f118bc6b0b25a4c70d4',
          'hex',
        ),
        dleqProof: Buffer.from(
          '01c768c1d677c6ff0b7ea69fdf29aff1000794227db368dff16e838d1f44c4afe9e952ee63d603f7b14de13c1d73b363cc2b1740d0b688e73d8e71cddf40f8e7e912df413903779c4e5d6644c504c8609baec8fdcb90d6d341cf316748f5d7945f',
          'hex',
        ),
      },
    ];

    // Create DLC accept
    const dlcAccept = new DlcAccept();
    dlcAccept.protocolVersion = 1;
    dlcAccept.temporaryContractId = tempContractId;
    dlcAccept.acceptCollateral = BigInt(100000000);
    dlcAccept.fundingPubkey = Buffer.from(
      '026d8bec9093f96ccc42de166cb9a6c576c95fc24ee16b10e87c3baaa4e49684d9',
      'hex',
    );
    dlcAccept.payoutSpk = Buffer.from(
      '001436054fa379f7564b5e458371db643666365c8fb3',
      'hex',
    );
    dlcAccept.payoutSerialId = BigInt(1594186);
    dlcAccept.fundingInputs = [fundingInput];
    dlcAccept.changeSpk = Buffer.from(
      '0014074c82dbe058212905bacc61814456b7415012ed',
      'hex',
    );
    dlcAccept.changeSerialId = BigInt(884503);
    dlcAccept.cetAdaptorSignatures = cetAdaptorSignatures;
    dlcAccept.refundSignature = Buffer.from(
      '7c8ad6de287b62a1ed1d74ed9116a5158abc7f97376d201caa88e0f9daad68fcda4c271cc003512e768f403a57e5242bd1f6aa1750d7f3597598094a43b1c7bb',
      'hex',
    );

    return dlcAccept;
  }

  function createTestDlcSign(contractId: Buffer): DlcSign {
    // Create CET adaptor signatures
    const cetAdaptorSignatures = new CetAdaptorSignatures();
    cetAdaptorSignatures.sigs = [
      {
        encryptedSig: Buffer.from(
          '016292f1b5c67b675aea69c95ec81e8462ab5bb9b7a01f810f6d1a7d1d886893b3605fe7fcb75a14b1b1de917917d37e9efac6437d7a080da53fb6dbbcfbfbe7a8',
          'hex',
        ),
        dleqProof: Buffer.from(
          '01efbecb2bce89556e1fb4d31622628830e02a6d04c487f67aca20e9f60fb127f985293541cd14e2bf04e4777d50953531e169dd37c65eb3cc17d6b5e4dbe58487f9fae1f68f603fe014a699a346b14a63048c26c9b31236d83a7e369a2b29a292',
          'hex',
        ),
      },
      {
        encryptedSig: Buffer.from(
          '00e52fe05d832bcce4538d9c27f3537a0f2086b265b6498f30cf667f77ff2fa87606574bc9a915ef57f7546ebb6852a490ad0547bdc52b19791d2d0f0cc0acabab',
          'hex',
        ),
        dleqProof: Buffer.from(
          '01f32459001a28850fa8ee4278111deb0494a8175f02e31a1c18b39bd82ec64026a6f341bcd5ba169d67b855030e36bdc65feecc0397a07d3bc514da69811ec5485f5553aebda782bc5ac9b47e8e11d701a38ef2c2b7d8af3906dd8dfc759754ce',
          'hex',
        ),
      },
      {
        encryptedSig: Buffer.from(
          '006f769592c744141a5ddface6e98f756a9df1bb75ad41508ea013bdfee133b396d85be51f870bf2e0ae836bfa984109dab96cc6f4ab2a7f118bc6b0b25a4c70d4',
          'hex',
        ),
        dleqProof: Buffer.from(
          '01c768c1d677c6ff0b7ea69fdf29aff1000794227db368dff16e838d1f44c4afe9e952ee63d603f7b14de13c1d73b363cc2b1740d0b688e73d8e71cddf40f8e7e912df413903779c4e5d6644c504c8609baec8fdcb90d6d341cf316748f5d7945f',
          'hex',
        ),
      },
    ];

    // Create funding signatures
    const fundingSignatures = new FundingSignatures();
    fundingSignatures.witnessElements = [
      [
        (() => {
          const witness = new ScriptWitnessV0();
          witness.witness = Buffer.from(
            '304402203812d7d194d44ec68f244cc3fd68507c563ec8c729fdfa3f4a79395b98abe84f0220704ab3f3ffd9c50c2488e59f90a90465fccc2d924d67a1e98a133676bf52f37201',
            'hex',
          );
          witness.length = witness.witness.length;
          return witness;
        })(),
        (() => {
          const witness = new ScriptWitnessV0();
          witness.witness = Buffer.from(
            '02dde41aa1f21671a2e28ad92155d2d66e0b5428de15d18db4cbcf216bf00de919',
            'hex',
          );
          witness.length = witness.witness.length;
          return witness;
        })(),
      ],
    ];

    // Create DLC sign
    const dlcSign = new DlcSign();
    dlcSign.contractId = contractId;
    dlcSign.cetAdaptorSignatures = cetAdaptorSignatures;
    dlcSign.refundSignature = Buffer.from(
      'fbf56fbb4bbcb01d1be3169dfda6f465020ee89c1e368d4a91e36d0d4cc44e6123db348c223988dfe147d611ae9351d6e78cfb902e3d01beed0c909e52a3aae9',
      'hex',
    );
    dlcSign.fundingSignatures = fundingSignatures;

    return dlcSign;
  }

  function createTestDlcTransactions(contractId: Buffer): DlcTransactionsV0 {
    // Create minimal funding transaction
    const fundTx = new Tx(
      2, // version
      [
        new TxIn(
          new OutPoint(
            '7d271264eaa899ce808a151b67a05a5e138bc59bff4a81acc606bbcc2054c33a',
            0,
          ),
          new Script(),
          Sequence.default(),
          [],
        ),
        new TxIn(
          new OutPoint(
            '49956aee0f04ebeed5935729a2d6d5dc6abb5342acaa0248090c78b049e4d4e3',
            0,
          ),
          new Script(),
          Sequence.default(),
          [],
        ),
      ],
      [
        new TxOut(
          Value.fromSats(BigInt(77400149)),
          createScriptFromHex(
            '0020543ff4768635379e2d3101d97f5a2a5e15d2acba04a6bd1322970241de8c593c',
          ),
        ),
        new TxOut(
          Value.fromSats(BigInt(122446337)),
          createScriptFromHex('0014dddb7840134737de920ac4337cfd700a94d40ee6'),
        ),
        new TxOut(
          Value.fromSats(BigInt(199153650)),
          createScriptFromHex('00141b77056446c159cd6228632173c6117d67ed7df2'),
        ),
      ],
      new LockTime(0),
    );

    // Create minimal CET
    const cet = new Tx(
      2, // version
      [
        new TxIn(
          new OutPoint(
            'b2beedb20c5df1ab779b521a3a8fdb217784b76c76de505db3686b3b788f9d08',
            0,
          ),
          new Script(),
          new Sequence(0xfffffffe),
          [],
        ),
      ],
      [
        new TxOut(
          Value.fromSats(BigInt(77399777)),
          createScriptFromHex('00144b71dd93c0727574dfd8403ed5f375922c6e3813'),
        ),
        new TxOut(
          Value.fromSats(BigInt(2000)),
          createScriptFromHex('0014cc6f10246659b11e40bc8c7d346f43aae79cf2d7'),
        ),
      ],
      new LockTime(100),
    );

    // Create minimal refund transaction
    const refundTx = new Tx(
      2, // version
      [
        new TxIn(
          new OutPoint(
            'b2beedb20c5df1ab779b521a3a8fdb217784b76c76de505db3686b3b788f9d08',
            0,
          ),
          new Script(),
          Sequence.default(),
          [],
        ),
      ],
      [
        new TxOut(
          Value.fromSats(BigInt(77398752)),
          createScriptFromHex('00144b71dd93c0727574dfd8403ed5f375922c6e3813'),
        ),
        new TxOut(
          Value.fromSats(BigInt(3025)),
          createScriptFromHex('0014cc6f10246659b11e40bc8c7d346f43aae79cf2d7'),
        ),
      ],
      new LockTime(0),
    );

    // Create DLC transactions
    const dlcTxs = new DlcTransactionsV0();
    dlcTxs.contractId = contractId;
    dlcTxs.fundTx = fundTx;
    dlcTxs.fundTxVout = 0;
    dlcTxs.cets = [cet];
    dlcTxs.refundTx = refundTx;

    return dlcTxs;
  }

  function createTestDlcCancel(contractId: Buffer): DlcCancelV0 {
    const dlcCancel = new DlcCancelV0();
    dlcCancel.contractId = contractId;
    return dlcCancel;
  }

  function createTestDlcClose(contractId: Buffer): DlcClose {
    // Create funding input for close
    const fundingInput = new FundingInput();
    fundingInput.inputSerialId = BigInt(56040);
    fundingInput.prevTxVout = 0;
    fundingInput.sequence = Sequence.default();
    fundingInput.maxWitnessLen = 107;
    fundingInput.redeemScript = Buffer.alloc(0);

    // Create a minimal prev transaction with enough funding (2 BTC to cover collateral + fees)
    const prevTx = new Tx(
      2, // version
      [
        new TxIn(
          new OutPoint('0'.repeat(64), 0),
          new Script(),
          Sequence.default(),
          [],
        ),
      ],
      [
        new TxOut(
          Value.fromBitcoin(2), // Increased from 1 to 2 BTC to cover collateral + fees
          createScriptFromHex('00149ea3bf2d6eb9c2ffa35e36f41e117403ed7fafe9'),
        ),
      ],
      new LockTime(0),
    );
    fundingInput.prevTx = prevTx;

    // Create funding signatures
    const fundingSignatures = new FundingSignatures();
    fundingSignatures.witnessElements = [
      [
        (() => {
          const witness = new ScriptWitnessV0();
          witness.witness = Buffer.from(
            '304402203812d7d194d44ec68f244cc3fd68507c563ec8c729fdfa3f4a79395b98abe84f0220704ab3f3ffd9c50c2488e59f90a90465fccc2d924d67a1e98a133676bf52f37201',
            'hex',
          );
          witness.length = witness.witness.length;
          return witness;
        })(),
        (() => {
          const witness = new ScriptWitnessV0();
          witness.witness = Buffer.from(
            '02dde41aa1f21671a2e28ad92155d2d66e0b5428de15d18db4cbcf216bf00de919',
            'hex',
          );
          witness.length = witness.witness.length;
          return witness;
        })(),
      ],
    ];

    const dlcClose = new DlcClose();
    dlcClose.contractId = contractId;
    dlcClose.closeSignature = Buffer.from(
      '7c8ad6de287b62a1ed1d74ed9116a5158abc7f97376d201caa88e0f9daad68fcda4c271cc003512e768f403a57e5242bd1f6aa1750d7f3597598094a43b1c7bb',
      'hex',
    );
    dlcClose.offerPayoutSatoshis = BigInt(100000000);
    dlcClose.acceptPayoutSatoshis = BigInt(100000000);
    dlcClose.fundInputSerialId = BigInt(56040);
    dlcClose.fundingInputs = [fundingInput];
    dlcClose.fundingSignatures = fundingSignatures;

    return dlcClose;
  }

  // Create test objects
  const dlcOffer = createTestDlcOffer();
  const dlcOfferHex = dlcOffer.serialize();
  const tempContractId = sha256(dlcOfferHex);
  const dlcAccept = createTestDlcAccept(tempContractId);

  const txBuilder = new DlcTxBuilder(dlcOffer, dlcAccept.withoutSigs());
  const tx = txBuilder.buildFundingTransaction();
  const fundingTxid = tx.txId.serialize();
  const contractId = xor(fundingTxid, tempContractId);

  const dlcSign = createTestDlcSign(contractId);
  const dlcTxs = createTestDlcTransactions(contractId);
  const dlcCancel = createTestDlcCancel(contractId);
  const dlcClose = createTestDlcClose(contractId);

  // Batch Dlc Messages

  // Create fresh objects for batch testing to avoid serialization issues
  const dlcOfferForBatch = createTestDlcOffer();
  // Increase funding input amount to match minimum collateral for batch
  (dlcOfferForBatch
    .fundingInputs[0] as FundingInput).prevTx.outputs[0].value = Value.fromBitcoin(
    4,
  );

  // Create fresh dlcAccept for batch testing
  const dlcOfferForBatchHex = dlcOfferForBatch.serialize();
  const tempContractIdForBatch = sha256(dlcOfferForBatchHex);
  const dlcAcceptForBatch = createTestDlcAccept(tempContractIdForBatch);
  // Increase funding input amount to match minimum collateral for batch
  (dlcAcceptForBatch
    .fundingInputs[0] as FundingInput).prevTx.outputs[0].value = Value.fromBitcoin(
    4,
  );

  before(async () => {
    util.rmdir('.testdb');
    sut = new LeveldbDlcStore('./.testdb/nested/dir');
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

      // Use round-trip testing for consistency - serialize and deserialize the expected object
      const expectedSerialized = dlcOffer.serialize();
      const expected = DlcOffer.deserialize(expectedSerialized);

      const actualFundingInputs = actual.fundingInputs as FundingInput[];
      const expectedFundingInputs = expected.fundingInputs as FundingInput[];

      expect(
        actualFundingInputs[0].prevTx.serialize().toString('hex'),
      ).to.equal(expectedFundingInputs[0].prevTx.serialize().toString('hex'));
      expect(actual.contractInfo.serialize()).to.deep.equal(
        expected.contractInfo.serialize(),
      );
    });
  });

  describe('find dlc_offer by eventId', () => {
    it('should return the dlc_offer object', async () => {
      const response = await sut.findDlcOffersByEventId('dummy');

      const actual = response[0];

      // Use round-trip testing for consistency - serialize and deserialize the expected object
      const expectedSerialized = dlcOffer.serialize();
      const expected = DlcOffer.deserialize(expectedSerialized);

      const actualFundingInputs = actual.fundingInputs as FundingInput[];
      const expectedFundingInputs = expected.fundingInputs as FundingInput[];

      expect(
        actualFundingInputs[0].prevTx.serialize().toString('hex'),
      ).to.equal(expectedFundingInputs[0].prevTx.serialize().toString('hex'));
      expect(actual.contractInfo.serialize()).to.deep.equal(
        expected.contractInfo.serialize(),
      );
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
      expect(actual.cetAdaptorSignatures).to.deep.equal(
        dlcAccept.cetAdaptorSignatures,
      );
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
      expect(actual.cetAdaptorSignatures).to.deep.equal(
        dlcAccept.cetAdaptorSignatures,
      );
    });
  });

  describe('find dlc_accept by temp_contract_id', () => {
    it('should return dlc accept object', async () => {
      const actualContractId = await sut.findContractIdFromTemp(
        dlcAccept.temporaryContractId,
      );
      const actual = await sut.findDlcAccept(actualContractId);

      expect(
        actual.fundingInputs[0].prevTx.serialize().toString('hex'),
      ).to.equal(dlcAccept.fundingInputs[0].prevTx.serialize().toString('hex'));
      expect(actual.cetAdaptorSignatures).to.deep.equal(
        dlcAccept.cetAdaptorSignatures,
      );
    });
  });

  describe('find dlc_offer by contract_id', () => {
    it('should return dlc offer object', async () => {
      // Clean up any existing DlcAccept objects to avoid old format issues
      try {
        await sut.deleteDlcAccept(contractId);
      } catch (e) {
        // Ignore if doesn't exist
      }

      // Ensure DlcAccept is properly saved with the new format
      await sut.saveDlcOffer(dlcOffer);
      await sut.saveDlcAccept(dlcAccept);

      const tempContractIdsMapping = await sut.findTempContractIds([
        contractId,
      ]);
      const dlcOffers = await sut.findDlcOffersByTempContractIds(
        tempContractIdsMapping.map(
          (tempContractIdsMapping) => tempContractIdsMapping[1],
        ),
      );

      const actual = dlcOffers[0];

      // Use round-trip testing for consistency - serialize and deserialize the expected object
      const expectedSerialized = dlcOffer.serialize();
      const expected = DlcOffer.deserialize(expectedSerialized);

      const actualFundingInputs = actual.fundingInputs as FundingInput[];
      const expectedFundingInputs = expected.fundingInputs as FundingInput[];

      expect(
        actualFundingInputs[0].prevTx.serialize().toString('hex'),
      ).to.equal(expectedFundingInputs[0].prevTx.serialize().toString('hex'));
      expect(actual.contractInfo.serialize()).to.deep.equal(
        expected.contractInfo.serialize(),
      );
    });
  });

  describe('find first dlc_accept', () => {
    it('should return dlc accept object', async () => {
      const actual = await sut.findFirstDlcAccept();

      expect(
        actual.fundingInputs[0].prevTx.serialize().toString('hex'),
      ).to.equal(dlcAccept.fundingInputs[0].prevTx.serialize().toString('hex'));
      expect(actual.cetAdaptorSignatures).to.deep.equal(
        dlcAccept.cetAdaptorSignatures,
      );
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

      // Use round-trip testing for consistency - serialize and deserialize the expected object
      const expectedSerialized = dlcClose.serialize();
      const expected = DlcClose.deserialize(expectedSerialized);

      expect(actual.serialize()).to.deep.equal(expected.serialize());
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
