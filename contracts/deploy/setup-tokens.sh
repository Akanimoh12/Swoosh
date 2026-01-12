#!/bin/bash
# ===========================================
# Setup Supported Tokens Script
# ===========================================
# Adds supported tokens to IntentValidator contract

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
echo -e "${BLUE}     Setup Supported Tokens              ${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Token addresses on Arbitrum Sepolia
# Note: These are testnet addresses - verify they exist before deployment
declare -A TOKENS=(
    # Native ETH represented as zero address
    ["ETH"]="0x0000000000000000000000000000000000000000"
    # Wrapped ETH on Arbitrum Sepolia
    ["WETH"]="0x980B62Da83eFf3D4576C647993b0c1D7faf17c73"
    # USDC on Arbitrum Sepolia (Chainlink CCIP supported)
    ["USDC"]="0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
    # LINK token for CCIP fees
    ["LINK"]="0xb1D4538B4571d411F07960EF2838Ce337FE1E80E"
)

add_token() {
    local name=$1
    local address=$2
    
    echo -e "${YELLOW}Adding $name ($address)...${NC}"
    
    cast send "$INTENT_VALIDATOR" \
        "add_supported_token(address)" \
        "$address" \
        --rpc-url "$RPC_URL" \
        --private-key "$PRIVATE_KEY" \
        2>&1
    
    echo -e "${GREEN}✓ $name added successfully${NC}"
}

echo "Adding supported tokens to IntentValidator at $INTENT_VALIDATOR"
echo ""

for token_name in "${!TOKENS[@]}"; do
    add_token "$token_name" "${TOKENS[$token_name]}"
done

echo ""
echo -e "${GREEN}✓ All tokens added successfully!${NC}"
echo ""
echo "Supported tokens:"
for token_name in "${!TOKENS[@]}"; do
    echo "  - $token_name: ${TOKENS[$token_name]}"
done
echo ""
echo "Note: To add more tokens, use:"
echo "  cast send $INTENT_VALIDATOR 'add_supported_token(address)' <TOKEN_ADDRESS> --rpc-url $RPC_URL --private-key \$PRIVATE_KEY"
