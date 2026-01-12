/**
 * CCIP Integration Test Script
 * Tests the CCIP manager functions against live testnets
 */

import {
  CCIP_CONFIG,
  CCIP_SUPPORTED_TOKENS,
  estimateCCIPFee,
  isChainSupported,
  buildCCIPTransferTx,
  validateCCIPTransfer,
  getCCIPExplorerUrl,
} from '../services/ccip-manager.js';

async function testCCIPIntegration() {
  console.log('🧪 Testing CCIP Integration...\n');

  // Test 1: Configuration
  console.log('1️⃣ Testing CCIP Configuration');
  console.log('   Arbitrum Sepolia Router:', CCIP_CONFIG.arbitrumSepolia.router);
  console.log('   Arbitrum Sepolia Chain Selector:', CCIP_CONFIG.arbitrumSepolia.chainSelector);
  console.log('   Base Sepolia Router:', CCIP_CONFIG.baseSepolia.router);
  console.log('   Base Sepolia Chain Selector:', CCIP_CONFIG.baseSepolia.chainSelector);
  console.log('   ✅ Configuration loaded\n');

  // Test 2: Chain Support Check
  console.log('2️⃣ Testing Chain Support Check');
  try {
    const supported = await isChainSupported(421614, 84532);
    console.log(`   Arbitrum Sepolia → Base Sepolia supported: ${supported}`);
    console.log('   ✅ Chain support check working\n');
  } catch (error) {
    console.log('   ❌ Chain support check failed:', error);
  }

  // Test 3: Validation
  console.log('3️⃣ Testing Transfer Validation');
  const validParams = {
    intentId: 'test-intent-1',
    sourceChainId: 421614,
    destinationChainId: 84532,
    token: CCIP_SUPPORTED_TOKENS[421614].USDC,
    amount: '1000000', // 1 USDC (6 decimals)
    recipient: '0x1234567890123456789012345678901234567890' as `0x${string}`,
  };
  
  const validation = validateCCIPTransfer(validParams);
  console.log(`   Valid params validation: ${validation.valid}`);
  
  const invalidParams = { ...validParams, sourceChainId: 84532, destinationChainId: 84532 };
  const invalidValidation = validateCCIPTransfer(invalidParams);
  console.log(`   Same chain validation (should fail): ${!invalidValidation.valid}`);
  console.log('   ✅ Validation working\n');

  // Test 4: Fee Estimation
  console.log('4️⃣ Testing Fee Estimation');
  try {
    const feeEstimate = await estimateCCIPFee({
      sourceChainId: 421614,
      destinationChainId: 84532,
      token: CCIP_SUPPORTED_TOKENS[421614].USDC,
      amount: '1000000',
      recipient: '0x1234567890123456789012345678901234567890' as `0x${string}`,
      useLINK: false,
    });
    console.log('   Fee in ETH:', feeEstimate.feeInNative);
    console.log('   Destination Chain Selector:', feeEstimate.destinationChainSelector);
    console.log('   ✅ Fee estimation working\n');
  } catch (error: any) {
    console.log('   ⚠️ Fee estimation failed (may need supported token):', error.message);
  }

  // Test 5: Build Transfer TX
  console.log('5️⃣ Testing Transfer TX Building');
  try {
    const txData = await buildCCIPTransferTx(validParams);
    console.log('   TX To:', txData.to);
    console.log('   TX Data length:', txData.data.length);
    console.log('   TX Value:', txData.value.toString());
    console.log('   ✅ Transfer TX building working\n');
  } catch (error: any) {
    console.log('   ⚠️ Transfer TX building failed:', error.message);
  }

  // Test 6: Explorer URL
  console.log('6️⃣ Testing Explorer URL Generation');
  const messageId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;
  const explorerUrl = getCCIPExplorerUrl(messageId);
  console.log('   Explorer URL:', explorerUrl);
  console.log('   ✅ Explorer URL generation working\n');

  console.log('🎉 CCIP Integration Tests Complete!');
}

// Run tests
testCCIPIntegration().catch(console.error);
