#!/bin/bash
# ===========================================
# Update Environment Files with Deployed Addresses
# ===========================================
# Run this after deploy.sh to update all .env files

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
DEPLOYED_ADDRESSES_FILE="$SCRIPT_DIR/deployed_addresses.json"

# Check if deployed_addresses.json exists
if [ ! -f "$DEPLOYED_ADDRESSES_FILE" ]; then
    echo -e "${RED}Error: deployed_addresses.json not found. Run deploy.sh first.${NC}"
    exit 1
fi

# Extract addresses
INTENT_VALIDATOR=$(jq -r '.contracts.IntentValidator' "$DEPLOYED_ADDRESSES_FILE")
ROUTE_EXECUTOR=$(jq -r '.contracts.RouteExecutor' "$DEPLOYED_ADDRESSES_FILE")
SETTLEMENT_VERIFIER=$(jq -r '.contracts.SettlementVerifier' "$DEPLOYED_ADDRESSES_FILE")

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}     Update Environment Files            ${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""
echo "Deployed addresses:"
echo "  IntentValidator:    $INTENT_VALIDATOR"
echo "  RouteExecutor:      $ROUTE_EXECUTOR"
echo "  SettlementVerifier: $SETTLEMENT_VERIFIER"
echo ""

# Update root .env
update_env_file() {
    local file=$1
    local prefix=$2
    
    if [ -f "$file" ]; then
        echo -e "${YELLOW}Updating $file...${NC}"
        
        # Update or add IntentValidator address
        if grep -q "${prefix}INTENT_VALIDATOR_ADDRESS" "$file"; then
            sed -i "s|${prefix}INTENT_VALIDATOR_ADDRESS=.*|${prefix}INTENT_VALIDATOR_ADDRESS=$INTENT_VALIDATOR|" "$file"
        else
            echo "${prefix}INTENT_VALIDATOR_ADDRESS=$INTENT_VALIDATOR" >> "$file"
        fi
        
        # Update or add RouteExecutor address
        if grep -q "${prefix}ROUTE_EXECUTOR_ADDRESS" "$file"; then
            sed -i "s|${prefix}ROUTE_EXECUTOR_ADDRESS=.*|${prefix}ROUTE_EXECUTOR_ADDRESS=$ROUTE_EXECUTOR|" "$file"
        else
            echo "${prefix}ROUTE_EXECUTOR_ADDRESS=$ROUTE_EXECUTOR" >> "$file"
        fi
        
        # Update or add SettlementVerifier address
        if grep -q "${prefix}SETTLEMENT_VERIFIER_ADDRESS" "$file"; then
            sed -i "s|${prefix}SETTLEMENT_VERIFIER_ADDRESS=.*|${prefix}SETTLEMENT_VERIFIER_ADDRESS=$SETTLEMENT_VERIFIER|" "$file"
        else
            echo "${prefix}SETTLEMENT_VERIFIER_ADDRESS=$SETTLEMENT_VERIFIER" >> "$file"
        fi
        
        echo -e "${GREEN}✓ Updated $file${NC}"
    else
        echo -e "${YELLOW}Creating $file from example...${NC}"
        if [ -f "${file}.example" ]; then
            cp "${file}.example" "$file"
            update_env_file "$file" "$prefix"
        else
            echo -e "${RED}Warning: $file and ${file}.example not found${NC}"
        fi
    fi
}

# Update files
update_env_file "$PROJECT_ROOT/.env" ""
update_env_file "$PROJECT_ROOT/backend/.env" ""
update_env_file "$PROJECT_ROOT/frontend/.env" "VITE_"
update_env_file "$SCRIPT_DIR/.env" ""

echo ""
echo -e "${GREEN}✓ All environment files updated!${NC}"
echo ""
echo "Next steps:"
echo "  1. Verify the addresses in each .env file"
echo "  2. Restart your backend: cd backend && npm run dev"
echo "  3. Restart your frontend: cd frontend && npm run dev"
echo ""
echo "Contract Explorer Links:"
echo "  IntentValidator:    https://sepolia.arbiscan.io/address/$INTENT_VALIDATOR"
echo "  RouteExecutor:      https://sepolia.arbiscan.io/address/$ROUTE_EXECUTOR"
echo "  SettlementVerifier: https://sepolia.arbiscan.io/address/$SETTLEMENT_VERIFIER"
