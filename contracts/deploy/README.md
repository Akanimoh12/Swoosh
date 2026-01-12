# Swoosh Contract Deployment Guide

This directory contains all scripts and configuration needed to deploy Swoosh smart contracts to Arbitrum Sepolia testnet.

## Prerequisites

### 1. Install Required Tools

```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add wasm32 target
rustup target add wasm32-unknown-unknown

# Install cargo-stylus
cargo install cargo-stylus

# Install Foundry (for cast command)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install jq (for JSON parsing)
sudo apt-get install jq  # Ubuntu/Debian
# or
brew install jq  # macOS
```

### 2. Get Testnet ETH

You need Arbitrum Sepolia ETH to pay for gas. Get it from:

- [Arbitrum Sepolia Faucet](https://faucet.quicknode.com/arbitrum/sepolia)
- [Alchemy Arbitrum Faucet](https://www.alchemy.com/faucets/arbitrum-sepolia)
- [Chainlink Faucet](https://faucets.chain.link/arbitrum-sepolia)

### 3. Get Testnet Tokens

For testing, you'll need testnet USDC:

- [Circle Testnet Faucet](https://faucet.circle.com/)
- Bridge from Sepolia using Chainlink CCIP

## Configuration

### 1. Create Environment File

```bash
cd contracts/deploy
cp .env.example .env
```

### 2. Edit `.env` with Your Values

```bash
# Your deployer private key (WITHOUT 0x prefix)
PRIVATE_KEY=abc123...

# Get Arbiscan API key from https://arbiscan.io/myapikey
ARBISCAN_API_KEY=your_key_here
```

### 3. Export Private Key

```bash
export PRIVATE_KEY=your_private_key_here
```

## Deployment Steps

### Step 1: Verify Contracts Build Locally

```bash
cd contracts
cargo build --release
cargo test
```

Expected: All 39 tests pass, no errors.

### Step 2: Deploy Contracts

```bash
cd contracts/deploy
chmod +x *.sh  # Make scripts executable
./deploy.sh
```

This will:
1. Deploy `IntentValidator` contract
2. Deploy `RouteExecutor` with IntentValidator address
3. Deploy `SettlementVerifier` with RouteExecutor address
4. Save addresses to `deployed_addresses.json`

### Step 3: Verify on Arbiscan

```bash
./verify.sh
```

### Step 4: Setup Supported Chains

```bash
./setup-chains.sh
```

This adds:
- Arbitrum Sepolia (421614)
- Base Sepolia (84532)
- Optimism Sepolia (11155420)
- Ethereum Sepolia (11155111)

### Step 5: Setup Supported Tokens

```bash
./setup-tokens.sh
```

This adds:
- ETH (native)
- WETH
- USDC
- LINK

### Step 6: Test the Flow

```bash
./test-flow.sh
```

## Deployed Addresses

After deployment, addresses are saved to `deployed_addresses.json`:

```json
{
  "network": "arbitrum-sepolia",
  "chainId": 421614,
  "contracts": {
    "IntentValidator": "0x...",
    "RouteExecutor": "0x...",
    "SettlementVerifier": "0x..."
  }
}
```

Update these addresses in:
- `backend/.env`
- `frontend/.env`
- Root `.env`

## Manual Deployment (Alternative)

If the scripts don't work, deploy manually using cargo-stylus:

```bash
# Build contracts
cd contracts
cargo build --release

# Deploy IntentValidator
cargo stylus deploy \
    --private-key $PRIVATE_KEY \
    --endpoint https://sepolia-rollup.arbitrum.io/rpc

# Note the deployed address, then initialize
cast send <INTENT_VALIDATOR_ADDRESS> "init()" \
    --rpc-url https://sepolia-rollup.arbitrum.io/rpc \
    --private-key $PRIVATE_KEY

# Repeat for RouteExecutor and SettlementVerifier
```

## Contract Addresses (Reference)

### CCIP Routers
| Network | CCIP Router Address |
|---------|---------------------|
| Arbitrum Sepolia | `0x2a9c5afb0d0e4bab2bcdae109ec4b0c4be15a165` |
| Base Sepolia | `0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93` |

### Testnet Tokens (Arbitrum Sepolia)
| Token | Address |
|-------|---------|
| USDC | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| WETH | `0x980B62Da83eFf3D4576C647993b0c1D7faf17c73` |
| LINK | `0xb1D4538B4571d411F07960EF2838Ce337FE1E80E` |

## Troubleshooting

### "cargo-stylus not found"
```bash
cargo install cargo-stylus
```

### "RPC connection failed"
- Check your internet connection
- Try alternative RPC: `https://arbitrum-sepolia.blockpi.network/v1/rpc/public`

### "Insufficient funds"
- Get more testnet ETH from faucets
- Check balance: `cast balance $YOUR_ADDRESS --rpc-url https://sepolia-rollup.arbitrum.io/rpc`

### "Contract already deployed"
- Stylus contracts are deployed to deterministic addresses based on bytecode
- If redeploying with same code, you'll get the same address

### "Verification failed"
- Stylus verification is different from Solidity
- May need to verify manually on Arbiscan with source code upload

## Next Steps

After successful deployment:

1. **Update Backend Config**
   ```bash
   # Edit backend/.env
   INTENT_VALIDATOR_ADDRESS=0x...
   ROUTE_EXECUTOR_ADDRESS=0x...
   SETTLEMENT_VERIFIER_ADDRESS=0x...
   ```

2. **Update Frontend Config**
   ```bash
   # Edit frontend/.env
   VITE_INTENT_VALIDATOR_ADDRESS=0x...
   VITE_ROUTE_EXECUTOR_ADDRESS=0x...
   VITE_SETTLEMENT_VERIFIER_ADDRESS=0x...
   ```

3. **Test End-to-End Flow**
   - Connect wallet in frontend
   - Submit a test intent
   - Verify transaction on Arbiscan

4. **Integrate CCIP**
   - Implement ccip-manager.ts in backend
   - Test cross-chain transfers to Base Sepolia

## Security Reminders

⚠️ **NEVER** commit your private key to git
⚠️ **NEVER** share your private key
⚠️ Use a dedicated testnet wallet for development
⚠️ Double-check addresses before transactions
