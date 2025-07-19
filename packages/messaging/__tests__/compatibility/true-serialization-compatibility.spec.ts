/* eslint-disable no-console */
import { expect } from 'chai';
import { execSync } from 'child_process';
import * as fs from 'fs';
import JSONbig from 'json-bigint';
import * as path from 'path';

import { DlcAccept, DlcOffer, DlcSign } from '../../lib';

// Configure json-bigint to handle large integers as BigInt but preserve floating point numbers
const JSONBigInt = JSONbig({
  storeAsString: false, // Store as BigInt, not string
  useNativeBigInt: true, // Use native BigInt support
  alwaysParseAsBig: false, // Don't convert all numbers to BigInt - preserve smaller numbers and floats
  // This will automatically use BigInt for integers that exceed MAX_SAFE_INTEGER
  // and keep regular numbers for smaller integers and floats
});

interface RustDlcCliResult {
  status: 'success' | 'error';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  messageType?: string;
  message: string;
}

// Helper function to call rust-dlc CLI
function callRustCli(command: string, input?: string): RustDlcCliResult {
  const rustCliPath = path.join(__dirname, '../../../../rust-dlc-cli');
  const cliCmd = `cd ${rustCliPath} && cargo run --bin dlc-compat -- ${command}`;

  try {
    // Use shorter timeout in CI environments to avoid test timeouts
    const isCI = process.env.CI === 'true';
    const cliTimeout = isCI ? 60000 : 300000; // 1 minute in CI, 5 minutes locally

    const result = execSync(cliCmd, {
      input: input || '',
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: cliTimeout,
    });

    return JSON.parse(result.trim());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // If the command failed, try to parse stderr or stdout as JSON
    try {
      const errorOutput = error.stdout || error.stderr || '';
      if (errorOutput.trim().startsWith('{')) {
        return JSON.parse(errorOutput.trim());
      }

      // If not JSON, create error response
      return {
        status: 'error',
        message: `CLI execution failed: ${error.message}. Output: ${errorOutput}`,
      };
    } catch {
      return {
        status: 'error',
        message: `CLI execution failed: ${error.message}`,
      };
    }
  }
}

// Load test vectors at module level so they're available for test generation
const testVectorsDir = path.join(__dirname, '../../test_vectors/dlcspecs');
const testVectorFiles: string[] = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const allTestData: { [filename: string]: any } = {};

// Load test data synchronously at module level
if (fs.existsSync(testVectorsDir)) {
  const files = fs
    .readdirSync(testVectorsDir)
    .filter((f) => f.endsWith('.json'))
    .sort(); // Sort for consistent test order

  files.forEach((filename) => {
    // if (filename !== 'enum_3_of_3_test.json') return;
    const filePath = path.join(testVectorsDir, filename);
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      allTestData[filename] = JSONBigInt.parse(fileContent);
      testVectorFiles.push(filename);
    } catch (error) {
      console.warn(
        `Failed to load test vector ${filename}:`,
        (error as Error).message,
      );
    }
  });
}

describe('True DLC Serialization Compatibility Tests', () => {
  describe('Comprehensive Test Vector Coverage', () => {
    it('should discover and load all available test vector files', () => {
      expect(testVectorFiles.length).to.be.greaterThan(
        0,
        'Should find test vector files',
      );
      expect(Object.keys(allTestData).length).to.be.greaterThan(
        0,
        'Should load test data',
      );

      console.log(`\nTest Vector Discovery:`);
      console.log(`  Found ${testVectorFiles.length} test vector files:`);
      testVectorFiles.forEach((file, index) => {
        const hasOfferMessage = allTestData[file]?.offer_message
          ? '[OFFER]'
          : '[NO_OFFER]';
        const hasAcceptMessage = allTestData[file]?.accept_message
          ? '[ACCEPT]'
          : '[NO_ACCEPT]';
        const hasSignMessage = allTestData[file]?.sign_message
          ? '[SIGN]'
          : '[NO_SIGN]';
        console.log(
          `  ${
            index + 1
          }. ${file} (${hasOfferMessage} ${hasAcceptMessage} ${hasSignMessage})`,
        );
      });
    });
  });

  describe('Round-trip Serialization Compatibility', () => {
    // Test representative samples against current Rust-DLC CLI for compatibility
    const rustCompatTestVectors = [
      'enum_3_of_3_test.json',
      'single_oracle_numerical_test.json',
    ];

    rustCompatTestVectors.forEach((filename) => {
      const testData = allTestData[filename];
      if (!testData) return;

      if (testData.offer_message) {
        it(`should have Node.js DlcOffer compatible with Rust-DLC CLI for ${filename}`, function () {
          // Use longer timeout in CI to account for slower build times
          const isCI = process.env.CI === 'true';
          this.timeout(isCI ? 90000 : 15000); // 90s in CI, 15s locally

          const nodeOffer = DlcOffer.fromJSON(testData.offer_message.message);
          const nodeJson = nodeOffer.toJSON();
          const nodeHex = nodeOffer.serialize().toString('hex');

          const rustSerialization = callRustCli(
            'serialize -t offer',
            JSONBigInt.stringify(nodeJson),
          );

          expect(rustSerialization.status).to.equal(
            'success',
            `Rust CLI serialization failed: ${rustSerialization.message}`,
          );

          const rustHex = rustSerialization.data;
          expect(nodeHex).to.equal(
            rustHex,
            `Node.js vs Rust-DLC CLI serialization mismatch for ${filename}`,
          );
        });
      }

      if (testData.accept_message) {
        it(`should have Node.js DlcAccept compatible with Rust-DLC CLI for ${filename}`, function () {
          // Use longer timeout in CI to account for slower build times
          const isCI = process.env.CI === 'true';
          this.timeout(isCI ? 90000 : 15000); // 90s in CI, 15s locally

          const nodeAccept = DlcAccept.fromJSON(
            testData.accept_message.message,
          );
          const nodeJson = nodeAccept.toJSON();
          const nodeHex = nodeAccept.serialize().toString('hex');

          const rustSerialization = callRustCli(
            'serialize -t accept',
            JSONBigInt.stringify(nodeJson),
          );

          expect(rustSerialization.status).to.equal(
            'success',
            `Rust CLI serialization failed: ${rustSerialization.message}`,
          );

          const rustHex = rustSerialization.data;
          expect(nodeHex).to.equal(
            rustHex,
            `Node.js vs Rust-DLC CLI serialization mismatch for ${filename}`,
          );
        });
      }

      if (testData.sign_message) {
        it(`should have Node.js DlcSign compatible with Rust-DLC CLI for ${filename}`, function () {
          // Use longer timeout in CI to account for slower build times
          const isCI = process.env.CI === 'true';
          this.timeout(isCI ? 90000 : 15000); // 90s in CI, 15s locally

          const nodeSign = DlcSign.fromJSON(testData.sign_message.message);
          const nodeJson = nodeSign.toJSON();
          const nodeHex = nodeSign.serialize().toString('hex');

          const rustSerialization = callRustCli(
            'serialize -t sign',
            JSONBigInt.stringify(nodeJson),
          );

          expect(rustSerialization.status).to.equal(
            'success',
            `Rust CLI serialization failed: ${rustSerialization.message}`,
          );

          const rustHex = rustSerialization.data;
          expect(nodeHex).to.equal(
            rustHex,
            `Node.js vs Rust-DLC CLI serialization mismatch for ${filename}`,
          );
        });
      }
    });

    // Generate individual test cases for DlcOffer serialization
    testVectorFiles.forEach((filename) => {
      const testData = allTestData[filename];
      if (!testData?.offer_message) return;

      it(`should correctly serialize DlcOffer for ${filename}`, () => {
        const expectedHex = testData.offer_message.serialized;
        const messageJson = testData.offer_message.message;

        const offer = DlcOffer.fromJSON(messageJson);
        const actualHex = offer.serialize().toString('hex');

        expect(actualHex).to.equal(
          expectedHex,
          `DlcOffer serialization mismatch for ${filename}`,
        );
      });
    });

    // Generate individual test cases for DlcAccept serialization
    testVectorFiles.forEach((filename) => {
      const testData = allTestData[filename];
      if (!testData?.accept_message) return;

      it(`should correctly serialize DlcAccept for ${filename}`, () => {
        const expectedHex = testData.accept_message.serialized;
        const messageJson = testData.accept_message.message;

        const accept = DlcAccept.fromJSON(messageJson);
        const actualHex = accept.serialize().toString('hex');

        expect(actualHex).to.equal(
          expectedHex,
          `DlcAccept serialization mismatch for ${filename}`,
        );
      });
    });

    // Generate individual test cases for DlcSign serialization
    testVectorFiles.forEach((filename) => {
      const testData = allTestData[filename];
      if (!testData?.sign_message) return;

      it(`should correctly serialize DlcSign for ${filename}`, () => {
        const expectedHex = testData.sign_message.serialized;
        const messageJson = testData.sign_message.message;

        const sign = DlcSign.fromJSON(messageJson);
        const actualHex = sign.serialize().toString('hex');

        expect(actualHex).to.equal(
          expectedHex,
          `DlcSign serialization mismatch for ${filename}`,
        );
      });
    });

    // Generate individual test cases for DlcOffer deserialization
    testVectorFiles.forEach((filename) => {
      const testData = allTestData[filename];
      if (!testData?.offer_message) return;

      it(`should correctly deserialize DlcOffer for ${filename}`, () => {
        const serializedHex = testData.offer_message.serialized;
        const inputBuffer = Buffer.from(serializedHex, 'hex');

        const offer = DlcOffer.deserialize(inputBuffer);
        const reserializedHex = offer.serialize().toString('hex');

        expect(reserializedHex).to.equal(
          serializedHex,
          `DlcOffer deserialization round-trip failed for ${filename}`,
        );
      });
    });

    // Generate individual test cases for DlcAccept deserialization
    testVectorFiles.forEach((filename) => {
      const testData = allTestData[filename];
      if (!testData?.accept_message) return;

      it(`should correctly deserialize DlcAccept for ${filename}`, () => {
        const serializedHex = testData.accept_message.serialized;
        const inputBuffer = Buffer.from(serializedHex, 'hex');

        const accept = DlcAccept.deserialize(inputBuffer);
        const reserializedHex = accept.serialize().toString('hex');

        expect(reserializedHex).to.equal(
          serializedHex,
          `DlcAccept deserialization round-trip failed for ${filename}`,
        );
      });
    });

    // Generate individual test cases for DlcSign deserialization
    testVectorFiles.forEach((filename) => {
      const testData = allTestData[filename];
      if (!testData?.sign_message) return;

      it(`should correctly deserialize DlcSign for ${filename}`, () => {
        const serializedHex = testData.sign_message.serialized;
        const inputBuffer = Buffer.from(serializedHex, 'hex');

        const sign = DlcSign.deserialize(inputBuffer);
        const reserializedHex = sign.serialize().toString('hex');

        expect(reserializedHex).to.equal(
          serializedHex,
          `DlcSign deserialization round-trip failed for ${filename}`,
        );
      });
    });
  });
});
