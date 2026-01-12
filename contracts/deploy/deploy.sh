#!/bin/bash
# ===========================================
# Swoosh Contract Deployment Script
# ===========================================
# This script deploys all 3 Swoosh contracts to Arbitrum Sepolia
# in the correct order with proper dependencies.
#
# Prerequisites:
# 1. Install cargo-stylus: cargo install cargo-stylus
# 2. Fund your wallet with Arbitrum Sepolia ETH from faucet
# 3. Copy .env.example to .env and fill in your values
# 4. Export your private key: export PRIVATE_KEY=your_key

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
fi

# Configuration
RPC_URL="${ARBITRUM_SEPOLIA_RPC:-https://sepolia-rollup.arbitrum.io/rpc}"
CHAIN_ID="${ARBITRUM_SEPOLIA_CHAIN_ID:-421614}"
CCIP_ROUTER="${CCIP_ROUTER_ARBITRUM_SEPOLIA:-0x2a9c5afb0d0e4bab2bcdae109ec4b0c4be15a165}"

# Output file for deployed addresses
DEPLOYED_ADDRESSES_FILE="$SCRIPT_DIR/deployed_addresses.json"

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}     Swoosh Contract Deployment          ${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check cargo-stylus
    if ! command -v cargo-stylus &> /dev/null; then
        echo -e "${RED}Error: cargo-stylus not found. Install with: cargo install cargo-stylus${NC}"
        exit 1
    fi
    
    # Check private key
    if [ -z "$PRIVATE_KEY" ]; then
        echo -e "${RED}Error: PRIVATE_KEY environment variable not set${NC}"
        echo "Export it with: export PRIVATE_KEY=your_private_key"
        exit 1
    fi
    
    # Check RPC connection
    echo "Testing RPC connection to $RPC_URL..."
    if ! curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
        "$RPC_URL" | grep -q "result"; then
        echo -e "${RED}Error: Cannot connect to RPC endpoint${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ All prerequisites met${NC}"
    echo ""
}

# Build contracts
build_contracts() {
    echo -e "${YELLOW}Building contracts...${NC}"
    cd "$SCRIPT_DIR/.."
    
    cargo build --release
    
    echo -e "${GREEN}✓ Contracts built successfully${NC}"
    echo ""
}

# Deploy a single contract using cargo-stylus
deploy_contract() {
    local contract_name=$1
    local init_args=$2
    
    echo -e "${YELLOW}Deploying $contract_name...${NC}"
    
    cd "$SCRIPT_DIR/.."
    
    # Deploy using cargo-stylus
    # Note: cargo-stylus deploy command varies by version
    # This is the general format - adjust based on your cargo-stylus version
    local deploy_output
    deploy_output=$(cargo stylus deploy \
        --private-key "$PRIVATE_KEY" \
        --endpoint "$RPC_URL" \
        2>&1)
    
    # Extract contract address from output
    local contract_address
    contract_address=$(echo "$deploy_output" | grep -oE '0x[a-fA-F0-9]{40}' | head -1)
    
    if [ -z "$contract_address" ]; then
        echo -e "${RED}Failed to deploy $contract_name${NC}"
        echo "$deploy_output"
        exit 1
    fi
    
    echo -e "${GREEN}✓ $contract_name deployed at: $contract_address${NC}"
    echo "$contract_address"
}

# Initialize contract after deployment
initialize_contract() {
    local contract_address=$1
    local function_sig=$2
    local args=$3
    
    echo -e "${YELLOW}Initializing contract at $contract_address...${NC}"
    
    # Use cast to call init function
    cast send "$contract_address" \
        "$function_sig" \
        $args \
        --rpc-url "$RPC_URL" \
        --private-key "$PRIVATE_KEY" \
        2>&1
    
    echo -e "${GREEN}✓ Contract initialized${NC}"
}

# Main deployment flow
main() {
    echo -e "${BLUE}Starting deployment to Arbitrum Sepolia (Chain ID: $CHAIN_ID)${NC}"
    echo ""
    
    check_prerequisites
    build_contracts
    
    # Step 1: Deploy IntentValidator
    echo -e "${BLUE}Step 1/3: Deploying IntentValidator${NC}"
    INTENT_VALIDATOR_ADDRESS=$(deploy_contract "IntentValidator")
    
    # Initialize IntentValidator
    initialize_contract "$INTENT_VALIDATOR_ADDRESS" "init()"
    
    # Step 2: Deploy RouteExecutor with IntentValidator address
    echo ""
    echo -e "${BLUE}Step 2/3: Deploying RouteExecutor${NC}"
    ROUTE_EXECUTOR_ADDRESS=$(deploy_contract "RouteExecutor")
    
    # Initialize RouteExecutor with validator and CCIP router
    initialize_contract "$ROUTE_EXECUTOR_ADDRESS" \
        "init(address,address)" \
        "$INTENT_VALIDATOR_ADDRESS $CCIP_ROUTER"
    
    # Step 3: Deploy SettlementVerifier with RouteExecutor address
    echo ""
    echo -e "${BLUE}Step 3/3: Deploying SettlementVerifier${NC}"
    SETTLEMENT_VERIFIER_ADDRESS=$(deploy_contract "SettlementVerifier")
    
    # Initialize SettlementVerifier with RouteExecutor and CCIP router
    initialize_contract "$SETTLEMENT_VERIFIER_ADDRESS" \
        "init(address,address)" \
        "$ROUTE_EXECUTOR_ADDRESS $CCIP_ROUTER"
    
    # Save deployed addresses
    echo ""
    echo -e "${YELLOW}Saving deployed addresses...${NC}"
    cat > "$DEPLOYED_ADDRESSES_FILE" << EOF
{
  "network": "arbitrum-sepolia",
  "chainId": $CHAIN_ID,
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "contracts": {
    "IntentValidator": "$INTENT_VALIDATOR_ADDRESS",
    "RouteExecutor": "$ROUTE_EXECUTOR_ADDRESS",
    "SettlementVerifier": "$SETTLEMENT_VERIFIER_ADDRESS"
  },
  "dependencies": {
    "ccipRouter": "$CCIP_ROUTER"
  }
}
EOF
    
    echo -e "${GREEN}✓ Addresses saved to $DEPLOYED_ADDRESSES_FILE${NC}"
    
    # Print summary
    echo ""
    echo -e "${BLUE}==========================================${NC}"
    echo -e "${GREEN}     Deployment Complete!                ${NC}"
    echo -e "${BLUE}==========================================${NC}"
    echo ""
    echo "Deployed Contracts:"
    echo "  IntentValidator:    $INTENT_VALIDATOR_ADDRESS"
    echo "  RouteExecutor:      $ROUTE_EXECUTOR_ADDRESS"
    echo "  SettlementVerifier: $SETTLEMENT_VERIFIER_ADDRESS"
    echo ""
    echo "Next steps:"
    echo "  1. Verify contracts on Arbiscan: ./verify.sh"
    echo "  2. Add supported chains: ./setup-chains.sh"
    echo "  3. Add supported tokens: ./setup-tokens.sh"
    echo "  4. Test the flow: ./test-flow.sh"
    echo ""
    echo "Update your .env files with these addresses!"
}

# Run main function
main "$@"
