#!/usr/bin/env ts-node
/* eslint-disable no-console */

import * as fs from 'fs';
import * as path from 'path';

import { DlcAccept } from '../lib/messages/DlcAccept';
import { DlcInput } from '../lib/messages/DlcInput';
import { DlcOffer } from '../lib/messages/DlcOffer';

// Read the existing test vector
const inputPath = path.join(
  __dirname,
  '../test_vectors/dlcspecs/enum_3_of_5_test.json',
);
const outputPath = path.join(
  __dirname,
  '../test_vectors/dlcspecs/enum_3_of_5_with_dlc_input_test.json',
);

const originalTestVector = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

// Parse the original DlcOffer and DlcAccept from JSON
const originalOffer = DlcOffer.fromJSON(
  originalTestVector.offer_message.message,
);
const originalAccept = DlcAccept.fromJSON(
  originalTestVector.accept_message.message,
);

// Create DlcInput objects
const offerDlcInput = new DlcInput();
offerDlcInput.localFundPubkey = Buffer.from(
  '029cc53354913396a861122a3770198d0f628d782a252d002faf4430f3550119e4',
  'hex',
);
offerDlcInput.remoteFundPubkey = Buffer.from(
  '02a1b9b4b2db1b1fa8d5d0e2c3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3',
  'hex',
);
offerDlcInput.contractId = Buffer.from(
  '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  'hex',
);

const acceptDlcInput = new DlcInput();
acceptDlcInput.localFundPubkey = Buffer.from(
  '02a1b9b4b2db1b1fa8d5d0e2c3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3',
  'hex',
);
acceptDlcInput.remoteFundPubkey = Buffer.from(
  '029cc53354913396a861122a3770198d0f628d782a252d002faf4430f3550119e4',
  'hex',
);
acceptDlcInput.contractId = Buffer.from(
  '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  'hex',
);

// Add DlcInput to the funding inputs
if (originalOffer.fundingInputs.length > 0) {
  originalOffer.fundingInputs[0].dlcInput = offerDlcInput;
}

if (originalAccept.fundingInputs.length > 0) {
  originalAccept.fundingInputs[0].dlcInput = acceptDlcInput;
}

// Test serialization/deserialization round-trip (skipping validation as it may fail due to oracle signature verification)
try {
  const offerSerialized = originalOffer.serialize();
  const offerDeserialized = DlcOffer.deserialize(offerSerialized);
  console.log('✓ DlcOffer serialization/deserialization successful');

  if (offerDeserialized.fundingInputs[0].dlcInput) {
    console.log('✓ DlcInput preserved in DlcOffer round-trip');
  } else {
    console.error('✗ DlcInput lost in DlcOffer round-trip');
  }
} catch (error) {
  console.error(
    '✗ DlcOffer serialization/deserialization failed:',
    error.message,
  );
}

try {
  const acceptSerialized = originalAccept.serialize();
  const acceptDeserialized = DlcAccept.deserialize(acceptSerialized, false); // Skip CET parsing for test
  console.log('✓ DlcAccept serialization/deserialization successful');

  if (acceptDeserialized.fundingInputs[0].dlcInput) {
    console.log('✓ DlcInput preserved in DlcAccept round-trip');
  } else {
    console.error('✗ DlcInput lost in DlcAccept round-trip');
  }
} catch (error) {
  console.error(
    '✗ DlcAccept serialization/deserialization failed:',
    error.message,
  );
}

// Convert back to JSON with BigInt handling
const newTestVector = {
  offer_message: {
    message: originalOffer.toJSON(),
  },
  accept_message: {
    message: originalAccept.toJSON(),
  },
};

// Handle BigInt serialization
const jsonString = JSON.stringify(
  newTestVector,
  (key, value) => {
    if (typeof value === 'bigint') {
      return Number(value);
    }
    return value;
  },
  2,
);

// Write the new test vector
fs.writeFileSync(outputPath, jsonString);

console.log(`\n✓ Generated new test vector with DlcInput at: ${outputPath}`);
console.log('\nSummary:');
console.log(`- Offer funding inputs: ${originalOffer.fundingInputs.length}`);
console.log(
  `- Offer DlcInput present: ${
    originalOffer.fundingInputs[0]?.dlcInput ? 'Yes' : 'No'
  }`,
);
console.log(`- Accept funding inputs: ${originalAccept.fundingInputs.length}`);
console.log(
  `- Accept DlcInput present: ${
    originalAccept.fundingInputs[0]?.dlcInput ? 'Yes' : 'No'
  }`,
);

if (originalOffer.fundingInputs[0]?.dlcInput) {
  console.log(
    `- Offer DlcInput contractId: ${originalOffer.fundingInputs[0].dlcInput.contractId.toString(
      'hex',
    )}`,
  );
}

if (originalAccept.fundingInputs[0]?.dlcInput) {
  console.log(
    `- Accept DlcInput contractId: ${originalAccept.fundingInputs[0].dlcInput.contractId.toString(
      'hex',
    )}`,
  );
}
