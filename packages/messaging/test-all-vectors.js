const fs = require('fs');
const path = require('path');

// Load our classes
const { DlcOffer } = require('./dist');

console.log('🔍 Comprehensive Test Vector Analysis');
console.log('');

// Get all test vector files
const testVectorDir = path.join(__dirname, 'test_vectors/dlcspecs');
const testFiles = fs.readdirSync(testVectorDir).filter(f => f.endsWith('.json'));

console.log(`Found ${testFiles.length} test vectors`);
console.log('');

let totalTests = 0;
let passingTests = 0;
let failingTests = 0;

const results = [];

testFiles.forEach(filename => {
  try {
    totalTests++;
    
    const testData = JSON.parse(fs.readFileSync(path.join(testVectorDir, filename), 'utf8'));
    const offerMessage = testData.offer_message.message;
    const expectedHex = testData.offer_message.serialized;

    // Parse and serialize
    const offer = DlcOffer.fromJSON(offerMessage);
    const actualHex = offer.serialize().toString('hex');
    
    const matches = expectedHex === actualHex;
    const lengthDiff = (actualHex.length - expectedHex.length) / 2;
    
    if (matches) {
      passingTests++;
      console.log(`✅ ${filename} - PASS`);
    } else {
      failingTests++;
      console.log(`❌ ${filename} - FAIL (${lengthDiff} byte diff)`);
    }
    
    results.push({
      filename,
      passed: matches,
      lengthDiff,
      expectedLength: expectedHex.length / 2,
      actualLength: actualHex.length / 2
    });
    
  } catch (error) {
    failingTests++;
    console.log(`💥 ${filename} - ERROR: ${error.message}`);
    results.push({
      filename,
      passed: false,
      error: error.message
    });
  }
});

console.log('');
console.log('📊 Summary:');
console.log(`Total tests: ${totalTests}`);
console.log(`Passing: ${passingTests}`);
console.log(`Failing: ${failingTests}`);
console.log(`Success rate: ${Math.round(passingTests / totalTests * 100)}%`);

console.log('');
console.log('📋 Detailed Results:');
results.forEach(result => {
  if (result.passed) {
    console.log(`✅ ${result.filename}`);
  } else if (result.error) {
    console.log(`💥 ${result.filename} - ${result.error}`);
  } else {
    console.log(`❌ ${result.filename} - ${result.lengthDiff} bytes (expected: ${result.expectedLength}, actual: ${result.actualLength})`);
  }
});

// Group by length difference
console.log('');
console.log('📈 Length Difference Analysis:');
const byLengthDiff = {};
results.forEach(result => {
  if (!result.passed && !result.error) {
    const diff = result.lengthDiff;
    if (!byLengthDiff[diff]) byLengthDiff[diff] = [];
    byLengthDiff[diff].push(result.filename);
  }
});

Object.keys(byLengthDiff).sort((a, b) => Number(a) - Number(b)).forEach(diff => {
  console.log(`${diff} byte difference: ${byLengthDiff[diff].length} tests`);
  byLengthDiff[diff].forEach(filename => console.log(`  - ${filename}`));
}); 