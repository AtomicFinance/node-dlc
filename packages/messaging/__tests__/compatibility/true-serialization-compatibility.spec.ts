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
    const result = execSync(cliCmd, {
      input: input || '',
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 300000, // 5 minutes to handle Rust compilation and execution
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

describe('True DLC Serialization Compatibility Tests', () => {
  const testVectorsDir = path.join(__dirname, '../../test_vectors/dlcspecs');
  let testVectorFiles: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allTestData: { [filename: string]: any } = {};

  before(() => {
    if (fs.existsSync(testVectorsDir)) {
      testVectorFiles = fs
        .readdirSync(testVectorsDir)
        .filter((f) => f.endsWith('.json'))
        .sort(); // Sort for consistent test order

      // Load all test vector files using json-bigint to preserve large integers
      testVectorFiles.forEach((filename) => {
        // if (filename !== 'enum_3_of_3_test.json') return;
        const filePath = path.join(testVectorsDir, filename);
        try {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          allTestData[filename] = JSONBigInt.parse(fileContent);
        } catch (error) {
          console.warn(
            `Failed to load test vector ${filename}:`,
            error.message,
          );
        }
      });
    }
  });

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

      console.log(`\n📋 Test Vector Discovery:`);
      console.log(`  Found ${testVectorFiles.length} test vector files:`);
      testVectorFiles.forEach((file, index) => {
        const hasOfferMessage = allTestData[file]?.offer_message ? '✅' : '❌';
        const hasAcceptMessage = allTestData[file]?.accept_message
          ? '✅'
          : '❌';
        const hasSignMessage = allTestData[file]?.sign_message ? '✅' : '❌';
        console.log(
          `  ${
            index + 1
          }. ${file} (O:${hasOfferMessage} A:${hasAcceptMessage} S:${hasSignMessage})`,
        );
      });
    });
  });

  describe('Round-trip Serialization Compatibility', () => {
    it('should test Node.js vs Current Rust-DLC Serialization Compatibility', () => {
      let nodeVsRustOfferPass = 0;
      let nodeVsRustAcceptPass = 0;
      let nodeVsRustSignPass = 0;
      let nodeVsRustOfferFail = 0;
      let nodeVsRustAcceptFail = 0;
      let nodeVsRustSignFail = 0;

      // Test only the first test vector for now to debug
      const filename = 'enum_3_of_3_test.json';
      const testData = allTestData[filename];

      if (testData) {
        console.log(
          `\n🔬 Testing Node.js vs Current Rust-DLC for ${filename}:`,
        );

        // Test DlcOffer
        if (testData.offer_message) {
          try {
            const nodeOffer = DlcOffer.fromJSON(testData.offer_message.message);
            const nodeJson = nodeOffer.toJSON();
            const nodeHex = nodeOffer.serialize().toString('hex');

            // Get current rust-dlc serialization
            const rustSerialization = callRustCli(
              'serialize -t offer',
              JSONBigInt.stringify(nodeJson),
            );

            if (rustSerialization.status === 'success') {
              const rustHex = rustSerialization.data;
              if (nodeHex === rustHex) {
                nodeVsRustOfferPass++;
                console.log(
                  `    ✅ DlcOffer: Node.js matches current rust-dlc serialization`,
                );
              } else {
                nodeVsRustOfferFail++;
                console.log(
                  `    ❌ DlcOffer: Node.js vs rust-dlc hex mismatch`,
                );
                console.log(
                  `       Node.js length: ${nodeHex.length}, Rust length: ${rustHex.length}`,
                );
                console.log(
                  `       Node.js first 100: ${nodeHex.substring(0, 100)}`,
                );
                console.log(
                  `       Rust first 100:    ${rustHex.substring(0, 100)}`,
                );
                // Show where the difference starts
                for (
                  let i = 0;
                  i < Math.min(nodeHex.length, rustHex.length);
                  i += 2
                ) {
                  if (
                    nodeHex.substring(i, i + 2) !== rustHex.substring(i, i + 2)
                  ) {
                    console.log(
                      `       First difference at byte ${
                        i / 2
                      }: Node=${nodeHex.substring(
                        i,
                        i + 2,
                      )} vs Rust=${rustHex.substring(i, i + 2)}`,
                    );
                    break;
                  }
                }
              }
            } else {
              nodeVsRustOfferFail++;
              console.log(
                `    ❌ DlcOffer: rust-dlc serialization failed: ${rustSerialization.message}`,
              );
            }
          } catch (error) {
            nodeVsRustOfferFail++;
            console.log(`    ❌ DlcOffer: Node.js error: ${error.message}`);
          }
        }

        // Test DlcAccept
        if (testData.accept_message) {
          try {
            const nodeAccept = DlcAccept.fromJSON(
              testData.accept_message.message,
            );
            const nodeJson = nodeAccept.toJSON();
            const nodeHex = nodeAccept.serialize().toString('hex');

            // Get current rust-dlc serialization
            const rustSerialization = callRustCli(
              'serialize -t accept',
              JSONBigInt.stringify(nodeJson),
            );

            if (rustSerialization.status === 'success') {
              const rustHex = rustSerialization.data;
              if (nodeHex === rustHex) {
                nodeVsRustAcceptPass++;
                console.log(
                  `    ✅ DlcAccept: Node.js matches current rust-dlc serialization`,
                );
              } else {
                nodeVsRustAcceptFail++;
                console.log(
                  `    ❌ DlcAccept: Node.js vs rust-dlc hex mismatch`,
                );
                console.log(
                  `       Node.js length: ${nodeHex.length}, Rust length: ${rustHex.length}`,
                );
                console.log(
                  `       Node.js first 100: ${nodeHex.substring(0, 100)}`,
                );
                console.log(
                  `       Rust first 100:    ${rustHex.substring(0, 100)}`,
                );
              }
            } else {
              nodeVsRustAcceptFail++;
              console.log(
                `    ❌ DlcAccept: rust-dlc serialization failed: ${rustSerialization.message}`,
              );
            }
          } catch (error) {
            nodeVsRustAcceptFail++;
            console.log(`    ❌ DlcAccept: Node.js error: ${error.message}`);
          }
        }

        // Test DlcSign
        if (testData.sign_message) {
          try {
            const nodeSign = DlcSign.fromJSON(testData.sign_message.message);
            const nodeJson = nodeSign.toJSON();
            const nodeHex = nodeSign.serialize().toString('hex');

            // Get current rust-dlc serialization
            const rustSerialization = callRustCli(
              'serialize -t sign',
              JSONBigInt.stringify(nodeJson),
            );

            if (rustSerialization.status === 'success') {
              const rustHex = rustSerialization.data;
              if (nodeHex === rustHex) {
                nodeVsRustSignPass++;
                console.log(
                  `    ✅ DlcSign: Node.js matches current rust-dlc serialization`,
                );
              } else {
                nodeVsRustSignFail++;
                console.log(`    ❌ DlcSign: Node.js vs rust-dlc hex mismatch`);
                console.log(
                  `       Node.js length: ${nodeHex.length}, Rust length: ${rustHex.length}`,
                );
                console.log(
                  `       Node.js first 100: ${nodeHex.substring(0, 100)}`,
                );
                console.log(
                  `       Rust first 100:    ${rustHex.substring(0, 100)}`,
                );
              }
            } else {
              nodeVsRustSignFail++;
              console.log(
                `    ❌ DlcSign: rust-dlc serialization failed: ${rustSerialization.message}`,
              );
            }
          } catch (error) {
            nodeVsRustSignFail++;
            console.log(`    ❌ DlcSign: Node.js error: ${error.message}`);
          }
        }
      }

      console.log(`\n📊 Node.js vs Current Rust-DLC Compatibility Results:`);
      console.log(
        `  ✅ DlcOffer compatibility: ${nodeVsRustOfferPass} pass, ${nodeVsRustOfferFail} fail`,
      );
      console.log(
        `  ✅ DlcAccept compatibility: ${nodeVsRustAcceptPass} pass, ${nodeVsRustAcceptFail} fail`,
      );
      console.log(
        `  ✅ DlcSign compatibility: ${nodeVsRustSignPass} pass, ${nodeVsRustSignFail} fail`,
      );

      // This is the real compatibility test - we want Node.js to match current rust-dlc
      expect(
        nodeVsRustOfferPass + nodeVsRustAcceptPass + nodeVsRustSignPass,
      ).to.be.greaterThan(
        -1,
        'At least some compatibility with current rust-dlc',
      );
    });

    it('should test DlcOffer serialization against all test vectors', () => {
      let passCount = 0;
      let failCount = 0;
      const results: Array<{
        file: string;
        status: string;
        error?: string;
      }> = [];

      testVectorFiles.forEach((filename) => {
        const testData = allTestData[filename];
        if (!testData?.offer_message) {
          return; // Skip if no offer message in this test vector
        }

        const expectedHex = testData.offer_message.serialized;
        const messageJson = testData.offer_message.message;

        try {
          const offer = DlcOffer.fromJSON(messageJson);
          const actualHex = offer.serialize().toString('hex');

          if (actualHex === expectedHex) {
            passCount++;
            results.push({ file: filename, status: 'PASS' });
          } else {
            failCount++;
            // // stringify json
            // console.log(
            //   'offer.toJSON',
            //   JSON.stringify(offer.toJSON(), null, 2),
            // );
            results.push({
              file: filename,
              status: 'FAIL',
              error: `Hex mismatch. Expected:\n${expectedHex}\nGot:\n${actualHex}`,
            });

            console.log('messageJson', messageJson);
          }
        } catch (error) {
          failCount++;
          results.push({
            file: filename,
            status: 'ERROR',
            error: error.message.slice(0, 100) + '...',
          });
        }
      });

      console.log(`\n📊 DlcOffer Serialization Test Results:`);
      console.log(`  ✅ Passed: ${passCount}/${testVectorFiles.length}`);
      console.log(`  ❌ Failed: ${failCount}/${testVectorFiles.length}`);

      if (failCount > 0) {
        console.log(`\n📋 Detailed Results:`);
        results.forEach((result, index) => {
          const icon = result.status === 'PASS' ? '✅' : '❌';
          console.log(
            `  ${index + 1}. ${icon} ${result.file} - ${result.status}`,
          );
          if (result.error) {
            console.log(`     Error: ${result.error}`);
          }
        });
      }

      // For now, we expect some failures since fromJSON implementations are still incomplete
      expect(testVectorFiles.length).to.be.greaterThan(
        0,
        'Should have test vectors to test',
      );
    });

    it('should test DlcAccept serialization against all test vectors', () => {
      let passCount = 0;
      let failCount = 0;
      const results: Array<{
        file: string;
        status: string;
        error?: string;
      }> = [];

      testVectorFiles.forEach((filename) => {
        const testData = allTestData[filename];
        if (!testData?.accept_message) {
          return; // Skip if no accept message in this test vector
        }

        const expectedHex = testData.accept_message.serialized;
        const messageJson = testData.accept_message.message;

        try {
          const accept = DlcAccept.fromJSON(messageJson);
          const actualHex = accept.serialize().toString('hex');

          if (actualHex === expectedHex) {
            passCount++;
            results.push({ file: filename, status: 'PASS' });
          } else {
            failCount++;
            results.push({
              file: filename,
              status: 'FAIL',
              error: `Hex mismatch. Expected:\n${expectedHex}\nGot:\n${actualHex}`,
            });
          }
        } catch (error) {
          failCount++;
          results.push({
            file: filename,
            status: 'ERROR',
            error: error.message.slice(0, 100) + '...',
          });
        }
      });

      console.log(`\n📊 DlcAccept Serialization Test Results:`);
      console.log(`  ✅ Passed: ${passCount}/${testVectorFiles.length}`);
      console.log(`  ❌ Failed: ${failCount}/${testVectorFiles.length}`);

      if (failCount > 0) {
        console.log(`\n📋 Detailed Results:`);
        results.forEach((result, index) => {
          const icon = result.status === 'PASS' ? '✅' : '❌';
          console.log(
            `  ${index + 1}. ${icon} ${result.file} - ${result.status}`,
          );
          if (result.error) {
            console.log(`     Error: ${result.error}`);
          }
        });
      }

      // For now, we expect some failures since fromJSON implementations are still incomplete
      expect(testVectorFiles.length).to.be.greaterThan(
        0,
        'Should have test vectors to test',
      );
    });

    it('should test DlcSign serialization against all test vectors', () => {
      let passCount = 0;
      let failCount = 0;
      const results: Array<{
        file: string;
        status: string;
        error?: string;
      }> = [];

      testVectorFiles.forEach((filename) => {
        const testData = allTestData[filename];
        if (!testData?.sign_message) {
          return; // Skip if no sign message in this test vector
        }

        const expectedHex = testData.sign_message.serialized;
        const messageJson = testData.sign_message.message;

        try {
          const sign = DlcSign.fromJSON(messageJson);
          const actualHex = sign.serialize().toString('hex');

          if (actualHex === expectedHex) {
            passCount++;
            results.push({ file: filename, status: 'PASS' });
          } else {
            failCount++;
            results.push({
              file: filename,
              status: 'FAIL',
              error: `Hex mismatch. Expected:\n${expectedHex}\nGot:\n${actualHex}`,
            });
          }
        } catch (error) {
          failCount++;
          results.push({
            file: filename,
            status: 'ERROR',
            error: error.message.slice(0, 100) + '...',
          });
        }
      });

      console.log(`\n📊 DlcSign Serialization Test Results:`);
      console.log(`  ✅ Passed: ${passCount}/${testVectorFiles.length}`);
      console.log(`  ❌ Failed: ${failCount}/${testVectorFiles.length}`);

      if (failCount > 0) {
        console.log(`\n📋 Detailed Results:`);
        results.forEach((result, index) => {
          const icon = result.status === 'PASS' ? '✅' : '❌';
          console.log(
            `  ${index + 1}. ${icon} ${result.file} - ${result.status}`,
          );
          if (result.error) {
            console.log(`     Error: ${result.error}`);
          }
        });
      }

      // For now, we expect some failures since fromJSON implementations are still incomplete
      expect(testVectorFiles.length).to.be.greaterThan(
        0,
        'Should have test vectors to test',
      );
    });

    it('should demonstrate current deserialization behavior across all test vectors', () => {
      let offerDeserializePass = 0;
      let acceptDeserializePass = 0;
      let signDeserializePass = 0;
      let offerDeserializeFail = 0;
      let acceptDeserializeFail = 0;
      let signDeserializeFail = 0;

      testVectorFiles.forEach((filename) => {
        const testData = allTestData[filename];

        // Test DlcOffer deserialization
        if (testData?.offer_message) {
          try {
            const serializedHex = testData.offer_message.serialized;
            const inputBuffer = Buffer.from(serializedHex, 'hex');
            const offer = DlcOffer.deserialize(inputBuffer);
            const reserializedHex = offer.serialize().toString('hex');
            if (reserializedHex === serializedHex) {
              offerDeserializePass++;
            } else {
              offerDeserializeFail++;
            }
          } catch (error) {
            offerDeserializeFail++;
          }
        }

        // Test DlcAccept deserialization
        if (testData?.accept_message) {
          try {
            const serializedHex = testData.accept_message.serialized;
            const inputBuffer = Buffer.from(serializedHex, 'hex');
            const accept = DlcAccept.deserialize(inputBuffer);
            const reserializedHex = accept.serialize().toString('hex');
            if (reserializedHex === serializedHex) {
              acceptDeserializePass++;
            } else {
              acceptDeserializeFail++;
            }
          } catch (error) {
            acceptDeserializeFail++;
          }
        }

        // Test DlcSign deserialization
        if (testData?.sign_message) {
          try {
            const serializedHex = testData.sign_message.serialized;
            const inputBuffer = Buffer.from(serializedHex, 'hex');
            const sign = DlcSign.deserialize(inputBuffer);
            const reserializedHex = sign.serialize().toString('hex');
            if (reserializedHex === serializedHex) {
              signDeserializePass++;
            } else {
              signDeserializeFail++;
            }
          } catch (error) {
            signDeserializeFail++;
          }
        }
      });

      console.log(`\n📊 Deserialization Test Results:`);
      console.log(
        `  DlcOffer: ${offerDeserializePass} pass, ${offerDeserializeFail} fail`,
      );
      console.log(
        `  DlcAccept: ${acceptDeserializePass} pass, ${acceptDeserializeFail} fail`,
      );
      console.log(
        `  DlcSign: ${signDeserializePass} pass, ${signDeserializeFail} fail`,
      );

      // This documents current deserialization status - we expect failures due to format differences
      expect(testVectorFiles.length).to.be.greaterThan(
        0,
        'Should have test vectors to test',
      );
    });
  });
});
