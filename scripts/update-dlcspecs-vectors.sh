#!/bin/bash

# update-dlcspecs-vectors.sh - Update existing dlcspecs test vectors with DlcInput support
# This script takes existing test vectors and regenerates them using the updated rust-dlc CLI

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
DLCSPECS_DIR="$PROJECT_ROOT/packages/messaging/test_vectors/dlcspecs"
BACKUP_DIR="$PROJECT_ROOT/packages/messaging/test_vectors/dlcspecs_backup_$(date +%Y%m%d_%H%M%S)"

echo -e "${BLUE}🔄 DLC Test Vector Updater${NC}"
echo -e "Project root: $PROJECT_ROOT"
echo -e "Rust CLI dir: $RUST_CLI_DIR"
echo -e "DLCSpecs dir: $DLCSPECS_DIR"

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

# Check if rust CLI supports the commands we need
echo -e "\n${BLUE}🔍 Checking rust-dlc CLI capabilities...${NC}"
if ! "$RUST_CLI" --help | grep -q "serialize\|deserialize"; then
    print_error "Rust CLI doesn't support required commands (serialize/deserialize)"
    exit 1
fi

# Create backup
echo -e "\n${BLUE}💾 Creating backup of existing test vectors...${NC}"
if [ -d "$DLCSPECS_DIR" ]; then
    cp -r "$DLCSPECS_DIR" "$BACKUP_DIR"
    print_status "Backup created at: $BACKUP_DIR"
else
    print_error "DLCSpecs directory not found: $DLCSPECS_DIR"
    exit 1
fi

# Function to update a single test vector
update_test_vector() {
    local test_file="$1"
    local filename=$(basename "$test_file")
    
    echo -e "\n${BLUE}🔄 Updating $filename...${NC}"
    
    # Extract JSON components from the test vector
    local offer_json=$(jq -r '.offer_message.message' "$test_file" 2>/dev/null || echo "null")
    local accept_json=$(jq -r '.accept_message.message' "$test_file" 2>/dev/null || echo "null")
    local sign_json=$(jq -r '.sign_message.message' "$test_file" 2>/dev/null || echo "null")
    
    local temp_file=$(mktemp)
    local updated=false
    
    # Start with the original content
    cp "$test_file" "$temp_file"
    
    # Update offer message if it exists
    if [ "$offer_json" != "null" ]; then
        echo -e "  📝 Updating offer message..."
        # Serialize JSON to hex using rust-dlc (adds DlcInput fields if needed)
        local updated_offer_serialized=$(echo "$offer_json" | "$RUST_CLI" serialize -t offer 2>/dev/null || echo "")
        
        if [ -n "$updated_offer_serialized" ]; then
            # Deserialize hex back to JSON to get updated format  
            local hex_data=$(echo "$updated_offer_serialized" | jq -r '.data' 2>/dev/null || echo "")
            local updated_offer_json=$(if [ -n "$hex_data" ]; then "$RUST_CLI" deserialize --hex "$hex_data" 2>/dev/null | jq '.data' 2>/dev/null || echo "$offer_json"; else echo "$offer_json"; fi)
            
            # Update both message and serialized fields
            local serialized_hex=$(echo "$updated_offer_serialized" | jq -r '.data' 2>/dev/null || echo "$updated_offer_serialized")
            jq --argjson msg "$updated_offer_json" --arg ser "$serialized_hex" \
               '.offer_message.message = $msg | .offer_message.serialized = $ser' \
               "$temp_file" > "${temp_file}.tmp" && mv "${temp_file}.tmp" "$temp_file"
            updated=true
            echo -e "    ✅ Offer message updated"
        else
            echo -e "    ⚠️  Could not serialize offer message"
        fi
    fi
    
    # Update accept message if it exists
    if [ "$accept_json" != "null" ]; then
        echo -e "  📝 Updating accept message..."
        # Serialize JSON to hex using rust-dlc (adds DlcInput fields if needed)
        local updated_accept_serialized=$(echo "$accept_json" | "$RUST_CLI" serialize -t accept 2>/dev/null || echo "")
        
        if [ -n "$updated_accept_serialized" ]; then
            # Deserialize hex back to JSON to get updated format
            local hex_data=$(echo "$updated_accept_serialized" | jq -r '.data' 2>/dev/null || echo "")
            local updated_accept_json=$(if [ -n "$hex_data" ]; then "$RUST_CLI" deserialize --hex "$hex_data" 2>/dev/null | jq '.data' 2>/dev/null || echo "$accept_json"; else echo "$accept_json"; fi)
            
            # Update both message and serialized fields
            local serialized_hex=$(echo "$updated_accept_serialized" | jq -r '.data' 2>/dev/null || echo "$updated_accept_serialized")
            jq --argjson msg "$updated_accept_json" --arg ser "$serialized_hex" \
               '.accept_message.message = $msg | .accept_message.serialized = $ser' \
               "$temp_file" > "${temp_file}.tmp" && mv "${temp_file}.tmp" "$temp_file"
            updated=true
            echo -e "    ✅ Accept message updated"
        else
            echo -e "    ⚠️  Could not serialize accept message"
        fi
    fi
    
    # Update sign message if it exists
    if [ "$sign_json" != "null" ]; then
        echo -e "  📝 Updating sign message..."
        # Serialize JSON to hex using rust-dlc (adds DlcInput fields if needed)
        local updated_sign_serialized=$(echo "$sign_json" | "$RUST_CLI" serialize -t sign 2>/dev/null || echo "")
        
        if [ -n "$updated_sign_serialized" ]; then
            # Deserialize hex back to JSON to get updated format
            local hex_data=$(echo "$updated_sign_serialized" | jq -r '.data' 2>/dev/null || echo "")
            local updated_sign_json=$(if [ -n "$hex_data" ]; then "$RUST_CLI" deserialize --hex "$hex_data" 2>/dev/null | jq '.data' 2>/dev/null || echo "$sign_json"; else echo "$sign_json"; fi)
            
            # Update both message and serialized fields
            local serialized_hex=$(echo "$updated_sign_serialized" | jq -r '.data' 2>/dev/null || echo "$updated_sign_serialized")
            jq --argjson msg "$updated_sign_json" --arg ser "$serialized_hex" \
               '.sign_message.message = $msg | .sign_message.serialized = $ser' \
               "$temp_file" > "${temp_file}.tmp" && mv "${temp_file}.tmp" "$temp_file"
            updated=true
            echo -e "    ✅ Sign message updated"
        else
            echo -e "    ⚠️  Could not serialize sign message"
        fi
    fi
    
    # Replace original file if any updates were made
    if [ "$updated" = true ]; then
        mv "$temp_file" "$test_file"
        print_status "Updated $filename"
    else
        rm "$temp_file"
        print_warning "No updates made to $filename"
    fi
}

# Update all test vector files
echo -e "\n${BLUE}🔄 Updating test vectors...${NC}"
updated_count=0
total_count=0

for test_file in "$DLCSPECS_DIR"/*.json; do
    if [ -f "$test_file" ]; then
        total_count=$((total_count + 1))
        update_test_vector "$test_file"
        updated_count=$((updated_count + 1))
    fi
done

echo -e "\n${BLUE}🧪 Running compatibility tests...${NC}"
cd "$PROJECT_ROOT"

# Run the dlcspecs compatibility tests
if cd packages/messaging && npm test -- --grep "dlcspecs.*compatibility" 2>/dev/null; then
    print_status "DLCSpecs compatibility tests passed!"
else
    print_warning "Some compatibility tests failed - check the output above"
    echo -e "\n${YELLOW}💡 You can restore the backup if needed:${NC}"
    echo -e "  rm -rf '$DLCSPECS_DIR'"
    echo -e "  mv '$BACKUP_DIR' '$DLCSPECS_DIR'"
fi

echo -e "\n${GREEN}🎉 Test vector update complete!${NC}"
echo -e "📊 Updated: $updated_count/$total_count test vectors"
echo -e "💾 Backup: $BACKUP_DIR"
echo -e "\n${BLUE}💡 Next steps:${NC}"
echo -e "  • Run full tests: ${YELLOW}npm test${NC}"
echo -e "  • If issues, restore backup: ${YELLOW}mv '$BACKUP_DIR' '$DLCSPECS_DIR'${NC}"
echo -e "  • If all good, remove backup: ${YELLOW}rm -rf '$BACKUP_DIR'${NC}"
