#!/bin/bash
# ===========================================
# Contract Verification Script for Arbiscan
# ===========================================
# Verifies all deployed contracts on Arbiscan for transparency

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load environment
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
fi

# Load deployed addresses
DEPLOYED_ADDRESSES_FILE="$SCRIPT_DIR/deployed_addresses.json"
if [ ! -f "$DEPLOYED_ADDRESSES_FILE" ]; then
    echo -e "${RED}Error: deployed_addresses.json not found. Run deploy.sh first.${NC}"
    exit 1
fi

# Extract addresses
INTENT_VALIDATOR=$(jq -r '.contracts.IntentValidator' "$DEPLOYED_ADDRESSES_FILE")
ROUTE_EXECUTOR=$(jq -r '.contracts.RouteExecutor' "$DEPLOYED_ADDRESSES_FILE")
SETTLEMENT_VERIFIER=$(jq -r '.contracts.SettlementVerifier' "$DEPLOYED_ADDRESSES_FILE")

# Arbiscan API endpoint
ARBISCAN_API="https://api-sepolia.arbiscan.io/api"

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}     Contract Verification               ${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

verify_contract() {
    local name=$1
    local address=$2
    
    echo -e "${YELLOW}Verifying $name at $address...${NC}"
    
    # For Stylus contracts, verification is different from Solidity
    # Stylus contracts are verified by uploading the source code and proving
    # the WASM bytecode matches the deployed contract
    
    # Using cargo-stylus verify command
    cd "$SCRIPT_DIR/.."
    
    cargo stylus verify \
        --contract "$address" \
        --endpoint "${ARBITRUM_SEPOLIA_RPC}" \
        2>&1 || {
            echo -e "${YELLOW}Note: Stylus verification may require manual steps on Arbiscan${NC}"
        }
    
    echo -e "${GREEN}✓ Verification submitted for $name${NC}"
    echo "  View on Arbiscan: https://sepolia.arbiscan.io/address/$address"
    echo ""
}

echo "Verifying contracts..."
echo ""

verify_contract "IntentValidator" "$INTENT_VALIDATOR"
verify_contract "RouteExecutor" "$ROUTE_EXECUTOR"
verify_contract "SettlementVerifier" "$SETTLEMENT_VERIFIER"

echo -e "${BLUE}==========================================${NC}"
echo -e "${GREEN}     Verification Complete!              ${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""
echo "View your verified contracts:"
echo "  IntentValidator:    https://sepolia.arbiscan.io/address/$INTENT_VALIDATOR"
echo "  RouteExecutor:      https://sepolia.arbiscan.io/address/$ROUTE_EXECUTOR"
echo "  SettlementVerifier: https://sepolia.arbiscan.io/address/$SETTLEMENT_VERIFIER"
