/* eslint-disable @typescript-eslint/no-explicit-any */
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
const allTestData: { [filename: string]: any } = {};

// Load test data synchronously at module level
if (fs.existsSync(testVectorsDir)) {
  const files = fs
    .readdirSync(testVectorsDir)
    .filter((f) => f.endsWith('.json'))
    .sort(); // Sort for consistent test order

  files.forEach((filename) => {
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

describe('Rust-DLC Cross-Language Compatibility Tests', () => {
  describe('Test Vector Discovery', () => {
    it('should discover and load test vector files for cross-language testing', () => {
      expect(testVectorFiles.length).to.be.greaterThan(
        0,
        'Should find test vector files',
      );
      expect(Object.keys(allTestData).length).to.be.greaterThan(
        0,
        'Should load test data',
      );

      console.error(`\nCross-Language Test Vector Discovery:`);
      console.error(
        `  Found ${testVectorFiles.length} test vector files for cross-language testing:`,
      );
      testVectorFiles.forEach((file, index) => {
        const hasOffer = allTestData[file]?.offer_message
          ? '[OFFER]'
          : '[NO_OFFER]';
        const hasAccept = allTestData[file]?.accept_message
          ? '[ACCEPT]'
          : '[NO_ACCEPT]';
        const hasSign = allTestData[file]?.sign_message
          ? '[SIGN]'
          : '[NO_SIGN]';
        console.error(
          `  ${index + 1}. ${file} (${hasOffer} ${hasAccept} ${hasSign})`,
        );
      });
    });
  });

  describe('DlcOffer Cross-Language Compatibility', () => {
    // Generate individual test cases for offers
    testVectorFiles.forEach((filename) => {
      const testData = allTestData[filename];
      if (!testData?.offer_message) return;

      // Skip DlcInput test vectors as Rust implementation doesn't support contractId field yet
      if (filename === 'enum_3_of_5_with_dlc_input_test.json') {
        it.skip(
          `should have Rust-compatible offer for ${filename} (SKIP: Rust doesn't support DlcInput contractId field yet)`,
        );
        return;
      }

      it(`should have Rust-compatible offer for ${filename}`, function () {
        // Use longer timeout in CI to account for slower build times
        const isCI = process.env.CI === 'true';
        this.timeout(isCI ? 90000 : 15000); // 90s in CI, 15s locally

        // Step 1: Create Node.js DLC message from JSON
        const nodeOffer = DlcOffer.fromJSON(testData.offer_message.message);
        const nodeJson = nodeOffer.toJSON(); // Now defaults to canonical rust-dlc format
        const nodeHex = nodeOffer.serialize().toString('hex');

        // Step 2: Test Rust validation of Node.js JSON
        const rustValidation = callRustCli(
          'validate -t offer',
          JSONBigInt.stringify(nodeJson),
        );

        expect(rustValidation.status).to.equal(
          'success',
          `Rust validation failed for ${filename}: ${rustValidation.message}`,
        );

        // Step 3: Test Rust serialization of Node.js JSON
        const rustSerialization = callRustCli(
          'serialize -t offer',
          JSONBigInt.stringify(nodeJson),
        );

        expect(rustSerialization.status).to.equal(
          'success',
          `Rust serialization failed for ${filename}: ${rustSerialization.message}`,
        );

        const rustHex = rustSerialization.data;
        expect(nodeHex).to.equal(
          rustHex,
          `Hex serialization mismatch for ${filename}. Node.js length: ${nodeHex.length}, Rust length: ${rustHex.length}`,
        );
      });
    });
  });

  describe('DlcAccept Cross-Language Compatibility', () => {
    // Generate individual test cases for accepts
    testVectorFiles.forEach((filename) => {
      const testData = allTestData[filename];
      if (!testData?.accept_message) return;

      // Skip DlcInput test vectors as Rust implementation doesn't support contractId field yet
      if (filename === 'enum_3_of_5_with_dlc_input_test.json') {
        it.skip(
          `should have Rust-compatible accept for ${filename} (SKIP: Rust doesn't support DlcInput contractId field yet)`,
        );
        return;
      }

      it(`should have Rust-compatible accept for ${filename}`, function () {
        // Use longer timeout in CI to account for slower build times
        const isCI = process.env.CI === 'true';
        this.timeout(isCI ? 90000 : 15000); // 90s in CI, 15s locally

        const nodeAccept = DlcAccept.fromJSON(testData.accept_message.message);
        const nodeJson = nodeAccept.toJSON();

        // Test Rust validation
        const rustValidation = callRustCli(
          'validate -t accept',
          JSONBigInt.stringify(nodeJson),
        );

        expect(rustValidation.status).to.equal(
          'success',
          `Rust validation failed for ${filename}: ${rustValidation.message}`,
        );
      });
    });
  });

  describe('DlcSign Cross-Language Compatibility', () => {
    // Generate individual test cases for signs
    testVectorFiles.forEach((filename) => {
      const testData = allTestData[filename];
      if (!testData?.sign_message) return;

      it(`should have Rust-compatible sign for ${filename}`, function () {
        // Use longer timeout in CI to account for slower build times
        const isCI = process.env.CI === 'true';
        this.timeout(isCI ? 90000 : 15000); // 90s in CI, 15s locally

        const nodeSign = DlcSign.fromJSON(testData.sign_message.message);
        const nodeJson = nodeSign.toJSON();

        // Test Rust validation
        const rustValidation = callRustCli(
          'validate -t sign',
          JSONBigInt.stringify(nodeJson),
        );

        expect(rustValidation.status).to.equal(
          'success',
          `Rust validation failed for ${filename}: ${rustValidation.message}`,
        );
      });
    });
  });

  describe('CLI Tool Integration', () => {
    it('should have working rust-dlc CLI tool', () => {
      const validation = callRustCli('validate -t offer', '{}');

      expect(validation.status).to.equal('error'); // Empty object should fail validation
      expect(validation.message).to.include('Invalid offer structure');
    });

    it('should validate complete rust-dlc test vectors', () => {
      const rustOfferPath = path.join(
        __dirname,
        '../../../../../rust-dlc/dlc-messages/src/test_inputs/offer_msg.json',
      );

      if (fs.existsSync(rustOfferPath)) {
        const rustOffer = fs.readFileSync(rustOfferPath, 'utf8');
        const validation = callRustCli('validate -t offer', rustOffer);

        expect(validation.status).to.equal(
          'success',
          'Should validate complete rust-dlc offer test vector',
        );
      }
    });
  });
});
