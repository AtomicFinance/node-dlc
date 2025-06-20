#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load the DlcSign class (compiled JS)
const { DlcSign } = require('./packages/messaging/lib/messages/DlcSign');

// Load a test vector
const testVectorPath = path.join(__dirname, 'packages/messaging/test_vectors/dlcspecs/enum_3_of_3_test.json');
const testVector = JSON.parse(fs.readFileSync(testVectorPath, 'utf8'));

try {
  // Create DlcSign from test vector JSON
  const dlcSign = DlcSign.fromJSON(testVector.sign_message.message);
  
  // Get the JSON output from our implementation
  const nodeJson = dlcSign.toJSON();
  
  // Compare with the expected canonical format from test vector
  const expectedJson = testVector.sign_message.message;
  
  console.log('🔍 Testing DlcSign canonical format...\n');
  
  console.log('✅ Expected canonical format:');
  console.log(JSON.stringify(expectedJson, null, 2));
  
  console.log('\n🚀 Node.js output format:');
  console.log(JSON.stringify(nodeJson, null, 2));
  
  // Check key fields
  const checks = {
    'protocolVersion': nodeJson.protocolVersion === expectedJson.protocolVersion,
    'contractId': nodeJson.contractId === expectedJson.contractId,
    'has cetAdaptorSignatures': !!nodeJson.cetAdaptorSignatures,
    'has ecdsaAdaptorSignatures': !!nodeJson.cetAdaptorSignatures?.ecdsaAdaptorSignatures,
    'first signature format': nodeJson.cetAdaptorSignatures?.ecdsaAdaptorSignatures?.[0]?.signature?.length > 0,
    'refundSignature': nodeJson.refundSignature === expectedJson.refundSignature,
    'has fundingSignatures': !!nodeJson.fundingSignatures,
    'has fundingSignatures array': !!nodeJson.fundingSignatures?.fundingSignatures,
    'has witnessElements': !!nodeJson.fundingSignatures?.fundingSignatures?.[0]?.witnessElements,
    'first witness format': !!nodeJson.fundingSignatures?.fundingSignatures?.[0]?.witnessElements?.[0]?.witness
  };
  
  console.log('\n📊 Format Checks:');
  Object.entries(checks).forEach(([key, passed]) => {
    console.log(`  ${passed ? '✅' : '❌'} ${key}: ${passed}`);
  });
  
  // Check if formats match exactly
  const formatsMatch = JSON.stringify(nodeJson) === JSON.stringify(expectedJson);
  console.log(`\n🎯 Exact format match: ${formatsMatch ? '✅ YES' : '❌ NO'}`);
  
  if (!formatsMatch) {
    console.log('\n🔍 Differences detected - this is expected as we\'re transitioning formats');
  }
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
} 