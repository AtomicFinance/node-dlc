#!/usr/bin/env node

/* eslint-disable */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define the correct field order for each message type and nested structures based on struct definitions
const FIELD_ORDERS = {
  // Top-level message structures
  offer: [
    'protocolVersion',
    'contractFlags',
    'chainHash',
    'temporaryContractId',
    'contractInfo',
    'fundingPubkey',
    'payoutSpk',
    'payoutSerialId',
    'offerCollateral',
    'fundingInputs',
    'changeSpk',
    'changeSerialId',
    'fundOutputSerialId',
    'feeRatePerVb',
    'cetLocktime',
    'refundLocktime'
  ],
  accept: [
    'protocolVersion',
    'temporaryContractId',
    'acceptCollateral',
    'fundingPubkey',
    'payoutSpk',
    'payoutSerialId',
    'fundingInputs',
    'changeSpk',
    'changeSerialId',
    'cetAdaptorSignatures',
    'refundSignature',
    'negotiationFields'
  ],
  sign: [
    'protocolVersion',
    'contractId',
    'cetAdaptorSignatures',
    'refundSignature',
    'fundingSignatures'
  ],

  // Contract Info structures
  singleContractInfo: [
    'totalCollateral',
    'contractInfo'
  ],
  disjointContractInfo: [
    'totalCollateral',
    'contractOraclePairs'
  ],
  contractInfo: [
    'contractDescriptor',
    'oracleInfo'
  ],

  // Contract Descriptor structures
  enumeratedContractDescriptor: [
    'payouts'
  ],
  numericOutcomeContractDescriptor: [
    'numDigits',
    'payoutFunction',
    'roundingIntervals'
  ],
  payout: [
    'outcome',
    'offerPayout'
  ],

  // Oracle Info structures
  single: [
    'oracleAnnouncement'
  ],
  multi: [
    'threshold',
    'oracleAnnouncements',
    'oracleParams'
  ],
  oracleParams: [
    'maxErrorExp',
    'minFailExp',
    'maximizeCoverage'
  ],

  // Oracle Announcement structures
  oracleAnnouncement: [
    'announcementSignature',
    'oraclePublicKey',
    'oracleEvent'
  ],

  // Oracle Event structures
  oracleEvent: [
    'oracleNonces',
    'eventMaturityEpoch',
    'eventDescriptor',
    'eventId'
  ],

  // Event Descriptor structures
  enumEvent: [
    'outcomes'
  ],
  digitDecompositionEvent: [
    'base',
    'isSigned',
    'unit',
    'precision',
    'nbDigits'
  ],

  // Payout Function structures
  payoutFunction: [
    'payoutFunctionPieces',
    'lastEndpoint'
  ],
  payoutFunctionPiece: [
    'endPoint',
    'payoutCurvePiece'
  ],
  payoutPoint: [
    'eventOutcome',
    'outcomePayout',
    'extraPrecision'
  ],
  polynomialPayoutCurvePiece: [
    'payoutPoints'
  ],
  hyperbolaPayoutCurvePiece: [
    'leftEndPoint',
    'rightEndPoint',
    'usePositivePiece',
    'translateOutcome',
    'translatePayout',
    'a',
    'b',
    'c',
    'd'
  ],

  // Rounding Intervals structures
  roundingIntervals: [
    'intervals'
  ],
  roundingInterval: [
    'beginInterval',
    'roundingMod'
  ],

  // Funding Input structures
  fundingInput: [
    'inputSerialId',
    'prevTx',
    'prevTxVout',
    'sequence',
    'maxWitnessLen',
    'redeemScript'
  ],

  // CET Adaptor Signatures structures
  cetAdaptorSignatures: [
    'ecdsaAdaptorSignatures'
  ],
  ecdsaAdaptorSignature: [
    'signature'
  ],

  // Funding Signatures structures
  fundingSignatures: [
    'fundingSignatures'
  ],
  fundingSignature: [
    'witnessElements'
  ],
  witnessElement: [
    'witness'
  ]
};

/**
 * Recursively orders object fields according to the field order definitions
 * @param {any} obj - The object to reorder
 * @param {string} type - The type/context of the object for field ordering
 * @returns {any} - The reordered object
 */
function orderFields(obj, type = null) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item, index) => {
      // For arrays, try to infer the type from the parent type
      let itemType = null;
      if (type === 'payouts') itemType = 'payout';
      else if (type === 'oracleAnnouncements') itemType = 'oracleAnnouncement';
      else if (type === 'fundingInputs') itemType = 'fundingInput';
      else if (type === 'intervals') itemType = 'roundingInterval';
      else if (type === 'payoutFunctionPieces') itemType = 'payoutFunctionPiece';
      else if (type === 'payoutPoints') itemType = 'payoutPoint';
      else if (type === 'ecdsaAdaptorSignatures') itemType = 'ecdsaAdaptorSignature';
      else if (type === 'fundingSignatures') itemType = 'fundingSignature';
      else if (type === 'witnessElements') itemType = 'witnessElement';
      else if (type === 'outcomes') return item; // strings don't need reordering
      else if (type === 'oracleNonces') return item; // strings don't need reordering
      
      return orderFields(item, itemType);
    });
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle enum variants (objects with single key)
  const keys = Object.keys(obj);
  if (keys.length === 1) {
    const key = keys[0];
    const lowerKey = key.toLowerCase();
    
    // Check if this is a known enum variant
    if (FIELD_ORDERS[lowerKey]) {
      return {
        [key]: orderFields(obj[key], lowerKey)
      };
    }
  }

  // Determine the field order to use
  let fieldOrder = null;
  
  if (type && FIELD_ORDERS[type]) {
    fieldOrder = FIELD_ORDERS[type];
  } else {
    // Try to infer type from object structure
    if (obj.protocolVersion !== undefined && obj.temporaryContractId !== undefined && obj.chainHash !== undefined) {
      fieldOrder = FIELD_ORDERS.offer;
    } else if (obj.protocolVersion !== undefined && obj.temporaryContractId !== undefined && obj.acceptCollateral !== undefined) {
      fieldOrder = FIELD_ORDERS.accept;
    } else if (obj.protocolVersion !== undefined && obj.contractId !== undefined) {
      fieldOrder = FIELD_ORDERS.sign;
    } else if (obj.totalCollateral !== undefined && obj.contractInfo !== undefined) {
      fieldOrder = FIELD_ORDERS.singleContractInfo;
    } else if (obj.contractDescriptor !== undefined && obj.oracleInfo !== undefined) {
      fieldOrder = FIELD_ORDERS.contractInfo;
    } else if (obj.payouts !== undefined) {
      fieldOrder = FIELD_ORDERS.enumeratedContractDescriptor;
    } else if (obj.threshold !== undefined && obj.oracleAnnouncements !== undefined) {
      fieldOrder = FIELD_ORDERS.multi;
    } else if (obj.announcementSignature !== undefined && obj.oraclePublicKey !== undefined) {
      fieldOrder = FIELD_ORDERS.oracleAnnouncement;
    } else if (obj.oracleNonces !== undefined && obj.eventMaturityEpoch !== undefined) {
      fieldOrder = FIELD_ORDERS.oracleEvent;
    } else if (obj.outcomes !== undefined && !obj.base) {
      fieldOrder = FIELD_ORDERS.enumEvent;
    } else if (obj.inputSerialId !== undefined && obj.prevTx !== undefined) {
      fieldOrder = FIELD_ORDERS.fundingInput;
    } else if (obj.intervals !== undefined) {
      fieldOrder = FIELD_ORDERS.roundingIntervals;
    } else if (obj.beginInterval !== undefined && obj.roundingMod !== undefined) {
      fieldOrder = FIELD_ORDERS.roundingInterval;
    } else if (obj.payoutFunctionPieces !== undefined) {
      fieldOrder = FIELD_ORDERS.payoutFunction;
    } else if (obj.eventOutcome !== undefined && obj.outcomePayout !== undefined) {
      fieldOrder = FIELD_ORDERS.payoutPoint;
    }
  }

  // Create ordered object
  const ordered = {};
  
  if (fieldOrder) {
    // Add fields in the specified order
    for (const field of fieldOrder) {
      if (obj.hasOwnProperty(field)) {
        ordered[field] = orderFields(obj[field], field);
      }
    }
    
    // Add any remaining fields that weren't in the order specification
    for (const key of Object.keys(obj)) {
      if (!fieldOrder.includes(key)) {
        ordered[key] = orderFields(obj[key], key);
      }
    }
  } else {
    // No specific order defined, just recursively order nested objects
    for (const key of Object.keys(obj)) {
      ordered[key] = orderFields(obj[key], key);
    }
  }

  return ordered;
}

/**
 * Updates a test vector JSON file using rust-dlc CLI for canonical format
 * @param {string} filePath - Path to the test vector file
 */
function updateTestVector(filePath) {
  console.log(`\n🔄 Processing ${path.basename(filePath)}...`);
  
  try {
    // Read the current test vector
    const fileContent = fs.readFileSync(filePath, 'utf8');
    let testVector;
    
    try {
      testVector = JSON.parse(fileContent);
    } catch (parseError) {
      console.error(`❌ Failed to parse JSON in ${filePath}: ${parseError.message}`);
      return;
    }

    let updated = false;
    const results = {};

    // Process each message type
    for (const messageType of ['offer', 'accept', 'sign']) {
      const messageKey = `${messageType}_message`;
      
      if (testVector[messageKey]) {
        console.log(`  📝 Processing ${messageType} message...`);
        
        try {
          // Get the hex from current test vector
          const currentHex = testVector[messageKey].serialized;
          
          if (!currentHex) {
            console.log(`  ⚠️  No serialized hex found for ${messageType}, skipping`);
            continue;
          }

          // Use rust-dlc CLI to deserialize hex to canonical JSON
          const cmd = `cd rust-dlc-cli && cargo run --bin dlc-compat -- deserialize --hex "${currentHex}"`;
          const output = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
          
          // Parse the canonical JSON from rust-dlc
          let canonicalJson;
          try {
            const rustResponse = JSON.parse(output.trim());
            // Extract the data portion if it's a response wrapper
            canonicalJson = rustResponse.data || rustResponse;
          } catch (parseError) {
            console.error(`  ❌ Failed to parse rust-dlc output for ${messageType}: ${parseError.message}`);
            continue;
          }

          // Order the fields according to struct definitions
          const orderedJson = orderFields(canonicalJson, messageType);
          
          // Update the test vector with ordered canonical format
          testVector[messageKey].message = orderedJson;
          
          // Keep the same serialized hex
          testVector[messageKey].serialized = currentHex;
          
          results[messageType] = {
            status: 'success',
            fieldsReordered: JSON.stringify(orderedJson) !== JSON.stringify(canonicalJson)
          };
          
          updated = true;
          console.log(`  ✅ Updated ${messageType} message with canonical format`);
          
        } catch (error) {
          console.error(`  ❌ Failed to process ${messageType}: ${error.message}`);
          results[messageType] = {
            status: 'error',
            error: error.message
          };
        }
      }
    }

    // Write the updated test vector back to file
    if (updated) {
      const updatedContent = JSON.stringify(testVector, null, 2);
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`✅ Successfully updated ${path.basename(filePath)}`);
    } else {
      console.log(`⏭️  No updates needed for ${path.basename(filePath)}`);
    }

    // Log results summary
    console.log(`📊 Results for ${path.basename(filePath)}:`);
    for (const [messageType, result] of Object.entries(results)) {
      if (result.status === 'success') {
        const reorderedText = result.fieldsReordered ? ' (fields reordered)' : ' (no reordering needed)';
        console.log(`  ✅ ${messageType}: ${result.status}${reorderedText}`);
      } else {
        console.log(`  ❌ ${messageType}: ${result.status} - ${result.error}`);
      }
    }

  } catch (error) {
    console.error(`❌ Failed to process ${filePath}: ${error.message}`);
  }
}

/**
 * Main function to process all test vector files
 */
function main() {
  console.log('🚀 Starting test vector update with field ordering...\n');
  
  // Find all test vector files
  const testVectorsDir = path.join(__dirname, 'packages/messaging/test_vectors/dlcspecs');
  
  if (!fs.existsSync(testVectorsDir)) {
    console.error(`❌ Test vectors directory not found: ${testVectorsDir}`);
    process.exit(1);
  }

  const testVectorFiles = fs.readdirSync(testVectorsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(testVectorsDir, f));

  if (testVectorFiles.length === 0) {
    console.error(`❌ No test vector files found in ${testVectorsDir}`);
    process.exit(1);
  }

  console.log(`📁 Found ${testVectorFiles.length} test vector files:`);
  testVectorFiles.forEach((file, index) => {
    console.log(`  ${index + 1}. ${path.basename(file)}`);
  });

  // Process each test vector file
  for (const filePath of testVectorFiles) {
    updateTestVector(filePath);
  }

  console.log('\n🎉 Test vector update completed!');
  console.log('\n📝 Summary:');
  console.log('   - Updated test vectors to use canonical rust-dlc JSON format');
  console.log('   - Reordered fields to match TypeScript and Rust struct definitions');
  console.log('   - Preserved original hex serialization for compatibility');
  console.log('\n💡 Next steps:');
  console.log('   - Run the compatibility tests to verify the updates');
  console.log('   - Update DlcOffer.ts toJSON() method to use the same field ordering');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  updateTestVector,
  orderFields,
  FIELD_ORDERS
}; 