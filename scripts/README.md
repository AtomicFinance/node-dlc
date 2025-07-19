# DLC Test Vector Generation Scripts

This directory contains scripts for generating and validating test vectors for cross-language compatibility between the Node.js and Rust DLC implementations.

## generate-test-vectors.sh

Automatically generates test vectors for enhanced DLC messages (with optional DlcInput support) and validates cross-language compatibility.

### Features

- 🔧 **Automatic Rust CLI Build**: Builds the rust-dlc-cli tool from the updated dependencies
- 🎯 **Enhanced Message Testing**: Focuses on DLC messages (offers, accepts, signs) that contain funding inputs with optional DLC inputs
- ✅ **Cross-Language Validation**: Tests that Node.js and Rust implementations can serialize/deserialize the same data
- 📊 **Comprehensive Reporting**: Generates detailed reports with validation results and compatibility status
- 🔄 **Existing Vector Analysis**: Scans existing test vectors for enhanced features

### Usage

```bash
# Generate test vectors and run compatibility tests
./scripts/generate-test-vectors.sh

# Or use npm script
npm run generate-test-vectors

# Run only cross-language compatibility tests
npm run test-cross-language
```

### Prerequisites

1. **Rust toolchain** installed
2. **jq** command-line JSON processor
3. **Updated Cargo.toml** pointing to bennyhodl's rust-dlc fork with DLC input support

### Output Structure

```
packages/messaging/test_vectors/generated/
├── enhanced-messages/
│   ├── dlc_offer_with_dlc_input.json      # Generated DLC offers with DLC inputs
│   ├── dlc_accept_with_dlc_input.json     # Generated DLC accepts with DLC inputs
│   └── enhanced_*.json                    # Existing vectors with DLC inputs
└── generation_summary.json               # Summary report
```

### Test Vector Format

Each generated test vector includes:

```json
{
  "name": "test_name",
  "description": "Description of the test",
  "type": "message_type",
  "json": {
    /* DLC message JSON */
  },
  "generated_at": "2024-01-01T00:00:00Z",
  "generators": {
    "rust_version": "commit_hash",
    "node_version": "commit_hash"
  },
  "rust_validation": {
    /* Rust validation result */
  },
  "rust_serialization": {
    /* Rust serialization result */
  }
}
```

### What Gets Tested

#### ✅ Automatic Testing via Enhanced DLC Messages

- **DlcInput** - Tested as optional fields in FundingInput within DlcOffer/DlcAccept
- **FundingInput** - Tested with and without optional DlcInput fields
- **Optional Field Format** - Validates proper 0x00/0x01 byte prefixes used by rust-dlc
- **Serialization Compatibility** - Ensures binary format matches between implementations

#### ✅ Cross-Language Verification

1. **Node.js → Rust**: Node.js creates DLC message → Rust validates and serializes
2. **Binary Format**: Tests binary serialization compatibility
3. **JSON Format**: Tests JSON structure compatibility
4. **Round-trip**: Tests deserialization → serialization → deserialization

### Script Workflow

1. 🏗️ **Build Rust CLI** - Compiles the dlc-compat tool with latest rust-dlc code
2. 🎯 **Generate Enhanced Messages** - Creates DLC messages with DLC input features
3. 📋 **Scan Existing Vectors** - Identifies existing test vectors with enhanced features
4. ✅ **Cross-Language Testing** - Validates compatibility between implementations
5. 📊 **Generate Report** - Creates summary with results and version information

### Debugging

If cross-language tests fail:

1. Check Rust CLI build output for compilation errors
2. Verify Cargo.toml points to correct rust-dlc branch (`spliced-contract`)
3. Check generated test vectors for validation errors
4. Look at binary hex output differences for serialization issues

### Development Workflow

When making changes to DLC message structures:

1. Update both Node.js and Rust implementations
2. Run `npm run generate-test-vectors` to validate compatibility
3. Fix any compatibility issues found
4. Commit both implementations together

This ensures that the Node.js and Rust DLC implementations stay compatible across development changes.
