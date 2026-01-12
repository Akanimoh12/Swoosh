#!/bin/bash
# ===========================================
# Setup Supported Chains Script
# ===========================================
# Adds supported destination chains to IntentValidator contract

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

INTENT_VALIDATOR=$(jq -r '.contracts.IntentValidator' "$DEPLOYED_ADDRESSES_FILE")
RPC_URL="${ARBITRUM_SEPOLIA_RPC:-https://sepolia-rollup.arbitrum.io/rpc}"

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}     Setup Supported Chains              ${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Chain IDs to add
declare -A CHAINS=(
    ["Arbitrum Sepolia"]="421614"
    ["Base Sepolia"]="84532"
    ["Optimism Sepolia"]="11155420"
    ["Ethereum Sepolia"]="11155111"
)

add_chain() {
    local name=$1
    local chain_id=$2
    
    echo -e "${YELLOW}Adding $name (Chain ID: $chain_id)...${NC}"
    
    cast send "$INTENT_VALIDATOR" \
        "add_supported_chain(uint256)" \
        "$chain_id" \
        --rpc-url "$RPC_URL" \
        --private-key "$PRIVATE_KEY" \
        2>&1
    
    echo -e "${GREEN}✓ $name added successfully${NC}"
}

echo "Adding supported chains to IntentValidator at $INTENT_VALIDATOR"
echo ""

for chain_name in "${!CHAINS[@]}"; do
    add_chain "$chain_name" "${CHAINS[$chain_name]}"
done

echo ""
echo -e "${GREEN}✓ All chains added successfully!${NC}"
echo ""
echo "Supported chains:"
for chain_name in "${!CHAINS[@]}"; do
    echo "  - $chain_name (${CHAINS[$chain_name]})"
done
