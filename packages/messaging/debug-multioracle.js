const fs = require('fs');
const path = require('path');

// Load our classes from the compiled JS
const { MultiOracleInfo, SingleOracleInfo, ContractInfo } = require('./dist');

console.log('🔍 Multi-Oracle Serialization Debug');
console.log('');

// Load the 3-of-3 test to debug multi-oracle
const testData = JSON.parse(fs.readFileSync(path.join(__dirname, 'test_vectors/dlcspecs/enum_3_of_3_test.json'), 'utf8'));
const contractInfoJson = testData.offer_message.message.contractInfo.singleContractInfo.contractInfo;
const oracleInfoJson = contractInfoJson.oracleInfo.multi;

console.log('📋 Oracle Info JSON:');
console.log('Threshold:', oracleInfoJson.threshold);
console.log('Announcements count:', oracleInfoJson.oracleAnnouncements.length);
console.log('Oracle params:', oracleInfoJson.oracleParams);
console.log('');

// Create MultiOracleInfo from JSON
const multiOracle = MultiOracleInfo.fromJSON(oracleInfoJson);
console.log('✅ MultiOracleInfo created from JSON');
console.log('Threshold:', multiOracle.threshold);
console.log('Announcements count:', multiOracle.announcements.length);
console.log('Oracle params:', multiOracle.oracleParams);
console.log('');

// Serialize the body (without TLV wrapper)
const serializedBody = multiOracle.serializeBody();
console.log('📦 Serialized body length:', serializedBody.length, 'bytes');
console.log('📦 Serialized body hex:', serializedBody.toString('hex'));
console.log('');

// Break down the hex manually
const hex = serializedBody.toString('hex');
console.log('🔬 Hex Breakdown:');
console.log('First 4 bytes (threshold):', hex.substring(0, 8), '=', parseInt(hex.substring(4, 8), 16));
console.log('Next 4 bytes (count):', hex.substring(8, 16), '=', parseInt(hex.substring(12, 16), 16));
console.log('Remaining bytes start with:', hex.substring(16, 32));
console.log('');

// Now test the full ContractInfo to see where the issue occurs
const fullContractInfo = ContractInfo.fromJSON(contractInfoJson);
const fullSerialized = fullContractInfo.serialize();
console.log('📦 Full ContractInfo serialized length:', fullSerialized.length, 'bytes');

// Find the specific bytes around the oracle section
const fullHex = fullSerialized.toString('hex');
const expectedPattern = '1000303f';
const actualPattern = '100030003f';

const expectedIndex = fullHex.indexOf(expectedPattern);
const actualIndex = fullHex.indexOf(actualPattern);

console.log('🔍 Pattern Search:');
console.log('Looking for expected pattern "1000303f":', expectedIndex >= 0 ? 'FOUND at ' + expectedIndex : 'NOT FOUND');
console.log('Looking for actual pattern "100030003f":', actualIndex >= 0 ? 'FOUND at ' + actualIndex : 'NOT FOUND');

if (actualIndex >= 0) {
  const start = Math.max(0, actualIndex - 10);
  const end = Math.min(fullHex.length, actualIndex + 30);
  console.log('Context around actual pattern:', fullHex.substring(start, end));
} 