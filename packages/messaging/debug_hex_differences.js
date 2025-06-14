#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { DlcOffer, DlcAccept, DlcSign } = require('./dist/index');

// Helper function to call rust-dlc CLI
function callRustCli(command, input) {
  const rustCliPath = path.join(__dirname, '../../rust-dlc-cli');
  const cliCmd = `cd ${rustCliPath} && cargo run --bin dlc-compat -- ${command}`;
  
  try {
    const result = execSync(cliCmd, {
      input: input || '',
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000,
    });
    return JSON.parse(result.trim());
  } catch (error) {
    return {
      status: 'error',
      message: `CLI execution failed: ${error.message}`,
    };
  }
}

console.log('🔍 Analyzing hex differences between Node.js and Rust-DLC...\n');

// Load test vector
const testVectorPath = path.join(__dirname, 'test_vectors/dlcspecs/enum_3_of_3_test.json');
const testVector = JSON.parse(fs.readFileSync(testVectorPath, 'utf8'));

console.log('=== OFFER MESSAGE ANALYSIS ===\n');

const originalOfferHex = testVector.offer_message.serialized;
const offerJson = testVector.offer_message.message;

console.log('1. Original test vector hex:');
console.log(`   Length: ${originalOfferHex.length}`);
console.log(`   First 100 chars: ${originalOfferHex.substring(0, 100)}`);

// Node.js deserialize original hex -> serialize back
console.log('\n2. Node.js deserialize original hex -> serialize back:');
try {
  const nodeOfferFromHex = DlcOffer.deserialize(Buffer.from(originalOfferHex, 'hex'));
  const nodeReserializedHex = nodeOfferFromHex.serialize().toString('hex');
  console.log(`   Length: ${nodeReserializedHex.length}`);
  console.log(`   First 100 chars: ${nodeReserializedHex.substring(0, 100)}`);
  console.log(`   Matches original: ${nodeReserializedHex === originalOfferHex}`);
  
  if (nodeReserializedHex !== originalOfferHex) {
    // Find first difference
    for (let i = 0; i < Math.min(originalOfferHex.length, nodeReserializedHex.length); i += 2) {
      if (originalOfferHex.substring(i, i + 2) !== nodeReserializedHex.substring(i, i + 2)) {
        console.log(`   First difference at byte ${i/2}: Original=${originalOfferHex.substring(i, i + 2)} vs Node=${nodeReserializedHex.substring(i, i + 2)}`);
        break;
      }
    }
  }
} catch (error) {
  console.log(`   Error: ${error.message}`);
}

// Node.js fromJSON -> serialize
console.log('\n3. Node.js fromJSON -> serialize:');
try {
  const nodeOfferFromJson = DlcOffer.fromJSON(offerJson);
  const nodeFromJsonHex = nodeOfferFromJson.serialize().toString('hex');
  console.log(`   Length: ${nodeFromJsonHex.length}`);
  console.log(`   First 100 chars: ${nodeFromJsonHex.substring(0, 100)}`);
  console.log(`   Matches original: ${nodeFromJsonHex === originalOfferHex}`);
  
  if (nodeFromJsonHex !== originalOfferHex) {
    // Find first difference
    for (let i = 0; i < Math.min(originalOfferHex.length, nodeFromJsonHex.length); i += 2) {
      if (originalOfferHex.substring(i, i + 2) !== nodeFromJsonHex.substring(i, i + 2)) {
        console.log(`   First difference at byte ${i/2}: Original=${originalOfferHex.substring(i, i + 2)} vs Node=${nodeFromJsonHex.substring(i, i + 2)}`);
        break;
      }
    }
  }
} catch (error) {
  console.log(`   Error: ${error.message}`);
}

// Rust deserialize original hex -> get JSON
console.log('\n4. Rust deserialize original hex -> get JSON:');
const rustDeserializeResult = callRustCli(`deserialize --hex "${originalOfferHex}"`);
if (rustDeserializeResult.status === 'success') {
  console.log(`   ✅ Rust can deserialize original hex`);
  const rustJsonFromHex = rustDeserializeResult.data;
  
  // Rust serialize that JSON back to hex
  console.log('\n5. Rust serialize JSON (from step 4) -> hex:');
  const rustReserializeResult = callRustCli('serialize -t offer', JSON.stringify(rustJsonFromHex));
  if (rustReserializeResult.status === 'success') {
    const rustReserializedHex = rustReserializeResult.data;
    console.log(`   Length: ${rustReserializedHex.length}`);
    console.log(`   First 100 chars: ${rustReserializedHex.substring(0, 100)}`);
    console.log(`   Matches original: ${rustReserializedHex === originalOfferHex}`);
    
    if (rustReserializedHex !== originalOfferHex) {
      // Find first difference
      for (let i = 0; i < Math.min(originalOfferHex.length, rustReserializedHex.length); i += 2) {
        if (originalOfferHex.substring(i, i + 2) !== rustReserializedHex.substring(i, i + 2)) {
          console.log(`   First difference at byte ${i/2}: Original=${originalOfferHex.substring(i, i + 2)} vs Rust=${rustReserializedHex.substring(i, i + 2)}`);
          break;
        }
      }
    }
  } else {
    console.log(`   ❌ Error: ${rustReserializeResult.message}`);
  }
} else {
  console.log(`   ❌ Error: ${rustDeserializeResult.message}`);
}

// Node.js vs Rust current compatibility
console.log('\n6. Node.js vs Current Rust compatibility:');
try {
  const nodeOffer = DlcOffer.fromJSON(offerJson);
  const nodeJsonCurrent = nodeOffer.toJSON();
  const nodeHexCurrent = nodeOffer.serialize().toString('hex');
  
  const rustSerializeCurrent = callRustCli('serialize -t offer', JSON.stringify(nodeJsonCurrent));
  if (rustSerializeCurrent.status === 'success') {
    const rustHexCurrent = rustSerializeCurrent.data;
    console.log(`   Node.js current hex length: ${nodeHexCurrent.length}`);
    console.log(`   Rust current hex length: ${rustHexCurrent.length}`);
    console.log(`   Node.js matches current Rust: ${nodeHexCurrent === rustHexCurrent}`);
    
    if (nodeHexCurrent !== rustHexCurrent) {
      console.log(`   First difference: TBD`);
    }
  } else {
    console.log(`   ❌ Rust error: ${rustSerializeCurrent.message}`);
  }
} catch (error) {
  console.log(`   ❌ Node.js error: ${error.message}`);
}

console.log('\n=== SUMMARY ===');
console.log('This analysis shows:');
console.log('1. Whether original test vector hex can be round-trip serialized by Node.js');
console.log('2. Whether original test vector hex can be round-trip serialized by Rust');
console.log('3. Whether Node.js and current Rust produce the same hex for the same JSON');
console.log('4. Where exactly the differences occur (byte-level analysis)'); 