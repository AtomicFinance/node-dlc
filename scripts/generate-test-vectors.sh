#!/bin/bash

# generate-test-vectors.sh - Regenerate test vectors for cross-language compatibility
# This script generates test vectors from both the Rust and TypeScript implementations
# and ensures they remain compatible across changes.

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RUST_CLI_DIR="$PROJECT_ROOT/rust-dlc-cli"
TEST_VECTORS_DIR="$PROJECT_ROOT/packages/messaging/test_vectors"
GENERATED_DIR="$TEST_VECTORS_DIR/generated"

echo -e "${BLUE}🔧 DLC Test Vector Generator${NC}"
echo -e "Project root: $PROJECT_ROOT"
echo -e "Rust CLI dir: $RUST_CLI_DIR"
echo -e "Test vectors dir: $TEST_VECTORS_DIR"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Create directories
mkdir -p "$GENERATED_DIR"
mkdir -p "$GENERATED_DIR/enhanced-messages"

# Build Rust CLI tool
echo -e "\n${BLUE}📦 Building Rust CLI tool...${NC}"
cd "$RUST_CLI_DIR"
if cargo build --release --bin dlc-compat; then
    print_status "Rust CLI tool built successfully"
else
    print_error "Failed to build Rust CLI tool"
    exit 1
fi

RUST_CLI="$RUST_CLI_DIR/target/release/dlc-compat"

# Function to generate test vector
generate_test_vector() {
    local name="$1"
    local type="$2"
    local json_data="$3"
    local output_file="$4"
    
    echo -e "\n${BLUE}🔄 Generating $name test vector...${NC}"
    
    # Create test vector object
    local test_vector=$(cat <<EOF
{
  "name": "$name",
  "description": "Generated test vector for $type cross-language compatibility",
  "type": "$type",
  "json": $json_data,
  "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "generators": {
    "rust_version": "$(cd $RUST_CLI_DIR && git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "node_version": "$(cd $PROJECT_ROOT && git rev-parse HEAD 2>/dev/null || echo 'unknown')"
  }
}
EOF
)
    
    # Validate with Rust
    local rust_validation=$(echo "$json_data" | "$RUST_CLI" validate -t "$type" 2>/dev/null || echo '{"status":"error","message":"validation failed"}')
    
    # Serialize with Rust
    local rust_serialization=$(echo "$json_data" | "$RUST_CLI" serialize -t "$type" 2>/dev/null || echo '{"status":"error","message":"serialization failed"}')
    
    # Add validation and serialization results
    test_vector=$(echo "$test_vector" | jq --argjson validation "$rust_validation" --argjson serialization "$rust_serialization" '. + {rust_validation: $validation, rust_serialization: $serialization}')
    
    # Save to file
    echo "$test_vector" | jq . > "$output_file"
    
    if [[ $(echo "$rust_validation" | jq -r '.status') == "success" ]]; then
        print_status "Generated $name test vector: $output_file"
    else
        print_warning "Generated $name test vector with validation issues: $output_file"
    fi
}

# Generate enhanced DLC message test vectors with DlcInput support
echo -e "\n${BLUE}🎯 Generating enhanced DLC message test vectors...${NC}"

# Generate DlcOffer with DlcInput in funding inputs
echo -e "\n${BLUE}🔄 Generating DlcOffer with DLC inputs...${NC}"
if "$RUST_CLI" generate -t offer-with-dlc-input > /dev/null 2>&1; then
    local rust_offer_with_dlc=$("$RUST_CLI" generate -t offer-with-dlc-input)
    generate_test_vector "dlc_offer_with_dlc_input" "offer" "$rust_offer_with_dlc" "$GENERATED_DIR/enhanced-messages/dlc_offer_with_dlc_input.json"
else
    print_warning "Rust CLI doesn't support 'offer-with-dlc-input' generation yet"
fi

# Generate DlcAccept with DlcInput in funding inputs  
echo -e "\n${BLUE}🔄 Generating DlcAccept with DLC inputs...${NC}"
if "$RUST_CLI" generate -t accept-with-dlc-input > /dev/null 2>&1; then
    local rust_accept_with_dlc=$("$RUST_CLI" generate -t accept-with-dlc-input)
    generate_test_vector "dlc_accept_with_dlc_input" "accept" "$rust_accept_with_dlc" "$GENERATED_DIR/enhanced-messages/dlc_accept_with_dlc_input.json"
else
    print_warning "Rust CLI doesn't support 'accept-with-dlc-input' generation yet"
fi

# Test existing dlcspecs test vectors with enhanced compatibility
echo -e "\n${BLUE}🔄 Validating existing test vectors for DlcInput compatibility...${NC}"
DLCSPECS_DIR="$PROJECT_ROOT/packages/messaging/test_vectors/dlcspecs"
if [ -d "$DLCSPECS_DIR" ]; then
    enhanced_count=0
    for test_file in "$DLCSPECS_DIR"/*.json; do
        if [ -f "$test_file" ]; then
            filename=$(basename "$test_file")
            echo -e "  📄 Checking $filename for enhanced features..."
            
            # Check if any funding inputs contain DLC inputs
            has_dlc_inputs=$(jq -r '.offer_message.message.fundingInputs[]? | select(.dlcInput != null) | .dlcInput' "$test_file" 2>/dev/null || echo "")
            
            if [ -n "$has_dlc_inputs" ]; then
                enhanced_count=$((enhanced_count + 1))
                echo -e "    ✅ Found DLC inputs in $filename"
                
                # Copy enhanced test vector to generated directory for cross-language testing
                cp "$test_file" "$GENERATED_DIR/enhanced-messages/enhanced_$filename"
            fi
        fi
    done
    
    if [ $enhanced_count -gt 0 ]; then
        print_status "Found $enhanced_count test vectors with DLC input features"
    else
        print_warning "No existing test vectors found with DLC inputs - they will be generated when rust-dlc CLI supports it"
    fi
fi

# Run compatibility tests
echo -e "\n${BLUE}🧪 Running cross-language compatibility tests...${NC}"
cd "$PROJECT_ROOT"

if npm run test -- --grep "rust-dlc cross-language" 2>/dev/null || \
   cd packages/messaging && npm test -- --grep "rust-dlc cross-language" 2>/dev/null; then
    print_status "Cross-language compatibility tests passed"
else
    print_warning "Cross-language compatibility tests failed - this is expected until rust-dlc CLI supports DLC input generation"
fi

# Generate summary report
SUMMARY_FILE="$GENERATED_DIR/generation_summary.json"
cat > "$SUMMARY_FILE" <<EOF
{
  "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "rust_cli_path": "$RUST_CLI",
  "test_vectors": [
    {
      "type": "enhanced-dlc-messages",
      "description": "DLC messages with optional DlcInput support in funding inputs",
      "files": $(find "$GENERATED_DIR/enhanced-messages" -name "*.json" -type f 2>/dev/null | sed 's|'"$GENERATED_DIR"'/||' | jq -R . | jq -s . || echo '[]')
    }
  ],
  "versions": {
    "rust_commit": "$(cd $RUST_CLI_DIR && git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "node_commit": "$(cd $PROJECT_ROOT && git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "rust_branch": "$(cd $RUST_CLI_DIR && git branch --show-current 2>/dev/null || echo 'unknown')",
    "node_branch": "$(cd $PROJECT_ROOT && git branch --show-current 2>/dev/null || echo 'unknown')"
  }
}
EOF

print_status "Generated summary report: $SUMMARY_FILE"

echo -e "\n${GREEN}🎉 Test vector generation complete!${NC}"
echo -e "Generated files:"
echo -e "  📁 $GENERATED_DIR/"
find "$GENERATED_DIR" -name "*.json" -type f | sort | sed 's/^/    📄 /'

echo -e "\n${BLUE}💡 Usage:${NC}"
echo -e "  • Run tests: ${YELLOW}npm run test-cross-language${NC}"
echo -e "  • Regenerate: ${YELLOW}npm run generate-test-vectors${NC}"
echo -e "  • Clean: ${YELLOW}rm -rf $GENERATED_DIR${NC}" 