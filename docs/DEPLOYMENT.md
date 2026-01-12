# Swoosh Smart Contract Deployment

## Overview

This document contains the deployment details for Swoosh's cross-chain intent solver smart contracts on Arbitrum Sepolia testnet.

## Deployment Summary

**Network:** Arbitrum Sepolia Testnet  
**Chain ID:** 421614  
**Deployment Date:** $(date)  
**Compiler:** Solidity 0.8.20  
**Optimizer:** Enabled (200 runs)  
**Framework:** Foundry/Forge v1.14.0

---

## Deployed Contracts

### 1. IntentValidator

**Address:** `0x6C28363C60Ff3bcc509eeA37Cce473B919947b9C`

**Arbiscan:** [View on Arbiscan](https://sepolia.arbiscan.io/address/0x6c28363c60ff3bcc509eea37cce473b919947b9c)

**Purpose:** Validates user intents before execution, manages supported chains and tokens.

**Key Functions:**
- `addSupportedChain(uint256 chainId)` - Add a new supported destination chain
- `addSupportedToken(address token)` - Add a new supported token
- `validateIntent(user, token, amount, sourceChain, destChain)` - Validate an intent
- `isChainSupported(uint256 chainId)` - Check if a chain is supported
- `isTokenSupported(address token)` - Check if a token is supported

**Initial Configuration:**
- Supported Chains: `421614` (Arbitrum Sepolia), `84532` (Base Sepolia)
- Supported Tokens: USDC, LINK

---

### 2. RouteExecutor

**Address:** `0x7c13D90950F542B297179e09f3A36EaA917A40C1`

**Arbiscan:** [View on Arbiscan](https://sepolia.arbiscan.io/address/0x7c13d90950f542b297179e09f3a36eaa917a40c1)

**Purpose:** Executes swap and bridge routes for cross-chain intents.

**Key Functions:**
- `executeSwap(token, amount, swapTarget, swapData)` - Execute a token swap
- `initiateBridge(bridgeRouter, token, amount, bridgeData)` - Initiate cross-chain bridge
- `completeSameChainTransfer(token, to, amount)` - Complete same-chain transfer
- `addExecutor(address)` / `removeExecutor(address)` - Manage authorized executors
- `emergencyWithdraw(token, amount)` - Emergency token recovery (owner only)

**Security Features:**
- ReentrancyGuard protection
- SafeERC20 for token transfers
- Authorized executor whitelist
- Emergency withdrawal capability

---

### 3. SettlementVerifier

**Address:** `0x20E8307cFe2C5CF7E434b5Cb2C92494fa4BAF01C`

**Arbiscan:** [View on Arbiscan](https://sepolia.arbiscan.io/address/0x20e8307cfe2c5cf7e434b5cb2c92494fa4baf01c)

**Purpose:** Verifies cross-chain settlements and handles refunds.

**Key Functions:**
- `registerSettlement(intentId, user, token, amount, destChain, timeout)` - Register pending settlement
- `verifySettlement(intentId)` - Mark settlement as verified
- `claimRefund(intentId)` - Claim refund for expired settlement
- `getSettlement(intentId)` - Get settlement details

**Settlement States:**
1. `Pending` (0) - Settlement registered, waiting for verification
2. `Verified` (1) - Settlement completed successfully
3. `Refunded` (2) - Settlement failed, tokens refunded

---

## Supported Tokens

| Token | Address | Arbiscan |
|-------|---------|----------|
| USDC | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` | [View](https://sepolia.arbiscan.io/address/0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d) |
| LINK | `0xb1D4538B4571d411F07960EF2838Ce337FE1E80E` | [View](https://sepolia.arbiscan.io/address/0xb1D4538B4571d411F07960EF2838Ce337FE1E80E) |

---

## Supported Chains

| Chain | Chain ID | Status |
|-------|----------|--------|
| Arbitrum Sepolia | 421614 | ✅ Supported |
| Base Sepolia | 84532 | ✅ Supported |

---

## CCIP Configuration

**Router Address:** `0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165`

---

## Contract Verification

All contracts are verified on Arbiscan:
- ✅ IntentValidator - Verified
- ✅ RouteExecutor - Verified
- ✅ SettlementVerifier - Verified

---

## Environment Variables

### Backend (.env)
```bash
# Network Configuration
ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
ARBITRUM_SEPOLIA_CHAIN_ID=421614
BASE_SEPOLIA_CHAIN_ID=84532

# Deployed Contract Addresses (Arbitrum Sepolia)
INTENT_VALIDATOR_ADDRESS=0x6C28363C60Ff3bcc509eeA37Cce473B919947b9C
ROUTE_EXECUTOR_ADDRESS=0x7c13D90950F542B297179e09f3A36EaA917A40C1
SETTLEMENT_VERIFIER_ADDRESS=0x20E8307cFe2C5CF7E434b5Cb2C92494fa4BAF01C

# Supported Tokens (Arbitrum Sepolia)
USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
LINK_ADDRESS=0xb1D4538B4571d411F07960EF2838Ce337FE1E80E

# CCIP Configuration
CCIP_ROUTER_ADDRESS=0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165
```

### Frontend (.env)
```bash
# Network Configuration
VITE_ARBITRUM_SEPOLIA_CHAIN_ID=421614
VITE_BASE_SEPOLIA_CHAIN_ID=84532

# Deployed Contract Addresses (Arbitrum Sepolia)
VITE_INTENT_VALIDATOR_ADDRESS=0x6C28363C60Ff3bcc509eeA37Cce473B919947b9C
VITE_ROUTE_EXECUTOR_ADDRESS=0x7c13D90950F542B297179e09f3A36EaA917A40C1
VITE_SETTLEMENT_VERIFIER_ADDRESS=0x20E8307cFe2C5CF7E434b5Cb2C92494fa4BAF01C

# Supported Tokens (Arbitrum Sepolia)
VITE_USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
VITE_LINK_ADDRESS=0xb1D4538B4571d411F07960EF2838Ce337FE1E80E
```

---

## Testing Contracts

### Read Functions (Cast Commands)

```bash
# Check chain support
cast call 0x6C28363C60Ff3bcc509eeA37Cce473B919947b9C "isChainSupported(uint256)" 421614 --rpc-url https://sepolia-rollup.arbitrum.io/rpc

# Check token support  
cast call 0x6C28363C60Ff3bcc509eeA37Cce473B919947b9C "isTokenSupported(address)" 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d --rpc-url https://sepolia-rollup.arbitrum.io/rpc

# Get contract owner
cast call 0x6C28363C60Ff3bcc509eeA37Cce473B919947b9C "owner()" --rpc-url https://sepolia-rollup.arbitrum.io/rpc
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│                    (React + Vite + Wagmi)                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                          Backend                             │
│                    (Node.js + Express)                       │
│              - AI Intent Parsing (OpenAI)                    │
│              - Route Optimization                            │
│              - Transaction Management                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Smart Contracts                           │
│                  (Arbitrum Sepolia)                          │
├─────────────────────────────────────────────────────────────┤
│  IntentValidator    │  RouteExecutor  │  SettlementVerifier │
│  - Validate intent  │  - Execute swaps │  - Verify settlement│
│  - Check chains     │  - Bridge tokens │  - Handle refunds   │
│  - Check tokens     │  - Auth executors│  - Track status     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                       CCIP Router                            │
│              Cross-Chain Interoperability                    │
│                  (Base Sepolia, etc.)                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Migration Notes

The project was migrated from Stylus (Rust) smart contracts to standard Solidity contracts due to compatibility issues with the Stylus SDK on Arbitrum Sepolia. The Solidity implementation uses battle-tested OpenZeppelin contracts for security:

- **Ownable** - Access control for administrative functions
- **ReentrancyGuard** - Protection against reentrancy attacks
- **SafeERC20** - Safe token transfer operations
- **IERC20** - Standard ERC20 interface

---

## Next Steps

1. **Backend Integration** - Connect backend routes to deployed contracts
2. **Frontend Integration** - Add contract ABIs and connect wallet interactions
3. **CCIP Integration** - Implement actual cross-chain messaging
4. **Testing** - End-to-end testing with testnet tokens
5. **Monitoring** - Set up transaction monitoring and alerts
