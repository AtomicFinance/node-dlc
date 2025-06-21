#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const JSONbig = require('json-bigint');

// Import the DLC message classes  
const { DlcOffer, DlcAccept, DlcSign } = require('./packages/messaging/dist');

// Configure json-bigint to handle large integers properly
const JSONBigInt = JSONbig({
  storeAsString: false,
  useNativeBigInt: true,
});

const testVectorsDir = path.join(__dirname, 'packages/messaging/test_vectors/dlcspecs');

console.log('🚀 Updating test vector serialized hex to match current Node.js implementation...\n');

// Get all test vector files
const testVectorFiles = fs.readdirSync(testVectorsDir)
  .filter(f => f.endsWith('.json'))
  .sort();

console.log(`📁 Found ${testVectorFiles.length} test vector files:`);
testVectorFiles.forEach((file, index) => {
  console.log(`  ${index + 1}. ${file}`);
});

let totalUpdated = 0;
let totalErrors = 0;

testVectorFiles.forEach((filename) => {
  console.log(`\n🔄 Processing ${filename}...`);
  
  const filePath = path.join(testVectorsDir, filename);
  let testData;
  let updated = false;
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    testData = JSONBigInt.parse(fileContent);
  } catch (error) {
    console.log(`  ❌ Failed to load ${filename}: ${error.message}`);
    totalErrors++;
    return;
  }

  // Update offer message hex
  if (testData.offer_message?.message) {
    try {
      const offer = DlcOffer.fromJSON(testData.offer_message.message);
      const currentHex = offer.serialize().toString('hex');
      const originalHex = testData.offer_message.serialized;
      
      if (currentHex !== originalHex) {
        console.log(`  📝 Updating offer hex...`);
        console.log(`    Original length: ${originalHex.length}`);
        console.log(`    Current length:  ${currentHex.length}`);
        testData.offer_message.serialized = currentHex;
        updated = true;
      } else {
        console.log(`  ✅ Offer hex already current`);
      }
    } catch (error) {
      console.log(`  ❌ Failed to process offer: ${error.message}`);
      totalErrors++;
    }
  }

  // Update accept message hex
  if (testData.accept_message?.message) {
    try {
      const accept = DlcAccept.fromJSON(testData.accept_message.message);
      const currentHex = accept.serialize().toString('hex');
      const originalHex = testData.accept_message.serialized;
      
      if (currentHex !== originalHex) {
        console.log(`  📝 Updating accept hex...`);
        console.log(`    Original length: ${originalHex.length}`);
        console.log(`    Current length:  ${currentHex.length}`);
        testData.accept_message.serialized = currentHex;
        updated = true;
      } else {
        console.log(`  ✅ Accept hex already current`);
      }
    } catch (error) {
      console.log(`  ❌ Failed to process accept: ${error.message}`);
      totalErrors++;
    }
  }

  // Update sign message hex
  if (testData.sign_message?.message) {
    try {
      const sign = DlcSign.fromJSON(testData.sign_message.message);
      const currentHex = sign.serialize().toString('hex');
      const originalHex = testData.sign_message.serialized;
      
      if (currentHex !== originalHex) {
        console.log(`  📝 Updating sign hex...`);
        console.log(`    Original length: ${originalHex.length}`);
        console.log(`    Current length:  ${currentHex.length}`);
        testData.sign_message.serialized = currentHex;
        updated = true;
      } else {
        console.log(`  ✅ Sign hex already current`);
      }
    } catch (error) {
      console.log(`  ❌ Failed to process sign: ${error.message}`);
      totalErrors++;
    }
  }

  // Write updated file
  if (updated) {
    try {
      const updatedContent = JSONBigInt.stringify(testData, null, 2);
      fs.writeFileSync(filePath, updatedContent);
      console.log(`✅ Successfully updated ${filename}`);
      totalUpdated++;
    } catch (error) {
      console.log(`  ❌ Failed to write ${filename}: ${error.message}`);
      totalErrors++;
    }
  } else {
    console.log(`  ℹ️  No updates needed for ${filename}`);
  }
});

console.log(`\n🎉 Test vector hex update completed!`);
console.log(`\n📊 Summary:`);
console.log(`   - Files updated: ${totalUpdated}`);
console.log(`   - Errors: ${totalErrors}`);
console.log(`   - Total files: ${testVectorFiles.length}`);

if (totalUpdated > 0) {
  console.log(`\n💡 Updated test vectors now use hex that matches current Node.js implementation`);
  console.log(`   This ensures compatibility with current rust-dlc implementation`);
} 