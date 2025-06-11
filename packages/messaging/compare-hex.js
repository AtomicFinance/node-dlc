const fs = require('fs');

const expectedHex = fs.readFileSync('./expected_serialized.hex', 'utf8').trim();
const actualHex = fs.readFileSync('./our_serialized.hex', 'utf8').trim();

console.log('=== BYTE-BY-BYTE COMPARISON ===');
console.log('Expected length:', expectedHex.length / 2, 'bytes');
console.log('Actual length:', actualHex.length / 2, 'bytes');
console.log('Difference:', (expectedHex.length - actualHex.length) / 2, 'bytes');
console.log('');

// Find first difference
let firstDiff = -1;
for (let i = 0; i < Math.min(expectedHex.length, actualHex.length); i += 2) {
  const expectedByte = expectedHex.substr(i, 2);
  const actualByte = actualHex.substr(i, 2);
  
  if (expectedByte !== actualByte) {
    firstDiff = i / 2;
    break;
  }
}

if (firstDiff !== -1) {
  console.log('=== FIRST DIFFERENCE ===');
  console.log('Position: byte', firstDiff, '(hex offset', firstDiff * 2, ')');
  
  const start = Math.max(0, firstDiff - 10);
  const end = Math.min(expectedHex.length / 2, firstDiff + 10);
  
  console.log('');
  console.log('Expected context:');
  let expectedContext = '';
  let actualContext = '';
  
  for (let i = start; i < end; i++) {
    const expectedByte = expectedHex.substr(i * 2, 2);
    const actualByte = i < actualHex.length / 2 ? actualHex.substr(i * 2, 2) : '--';
    
    if (i === firstDiff) {
      expectedContext += `[${expectedByte}]`;
      actualContext += `[${actualByte}]`;
    } else {
      expectedContext += expectedByte;
      actualContext += actualByte;
    }
    
    if (i < end - 1) {
      expectedContext += ' ';
      actualContext += ' ';
    }
  }
  
  console.log('Expected:', expectedContext);
  console.log('Actual:  ', actualContext);
  
  console.log('');
  console.log('Missing/Different byte at position', firstDiff + ':');
  console.log('Expected byte:', expectedHex.substr(firstDiff * 2, 2));
  console.log('Actual byte:', firstDiff < actualHex.length / 2 ? actualHex.substr(firstDiff * 2, 2) : 'MISSING');
} 