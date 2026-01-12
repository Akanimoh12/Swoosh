// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {IntentValidator} from "../src/IntentValidator.sol";
import {RouteExecutor} from "../src/RouteExecutor.sol";
import {SettlementVerifier} from "../src/SettlementVerifier.sol";

contract DeployAll is Script {
    // Configuration
    address constant CCIP_ROUTER_ARB_SEPOLIA = 0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165;
    
    // Supported tokens on Arbitrum Sepolia
    address constant USDC_ARB_SEPOLIA = 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d;
    address constant LINK_ARB_SEPOLIA = 0xb1D4538B4571d411F07960EF2838Ce337FE1E80E;
    
    // Supported chains
    uint256 constant ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
    uint256 constant BASE_SEPOLIA_CHAIN_ID = 84532;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy IntentValidator
        console2.log("Deploying IntentValidator...");
        IntentValidator intentValidator = new IntentValidator();
        console2.log("IntentValidator deployed at:", address(intentValidator));

        // 2. Deploy RouteExecutor
        console2.log("Deploying RouteExecutor...");
        RouteExecutor routeExecutor = new RouteExecutor(
            address(intentValidator),
            CCIP_ROUTER_ARB_SEPOLIA
        );
        console2.log("RouteExecutor deployed at:", address(routeExecutor));

        // 3. Deploy SettlementVerifier
        console2.log("Deploying SettlementVerifier...");
        SettlementVerifier settlementVerifier = new SettlementVerifier(
            CCIP_ROUTER_ARB_SEPOLIA,
            address(routeExecutor)
        );
        console2.log("SettlementVerifier deployed at:", address(settlementVerifier));

        // 4. Configure IntentValidator - Add supported chains
        console2.log("Adding supported chains...");
        intentValidator.addSupportedChain(ARBITRUM_SEPOLIA_CHAIN_ID);
        intentValidator.addSupportedChain(BASE_SEPOLIA_CHAIN_ID);
        console2.log("Chains added: Arbitrum Sepolia (421614), Base Sepolia (84532)");

        // 5. Configure IntentValidator - Add supported tokens
        console2.log("Adding supported tokens...");
        intentValidator.addSupportedToken(USDC_ARB_SEPOLIA);
        intentValidator.addSupportedToken(LINK_ARB_SEPOLIA);
        console2.log("Tokens added: USDC, LINK");

        vm.stopBroadcast();

        // Print summary
        console2.log("\n========== DEPLOYMENT SUMMARY ==========");
        console2.log("IntentValidator:    ", address(intentValidator));
        console2.log("RouteExecutor:      ", address(routeExecutor));
        console2.log("SettlementVerifier: ", address(settlementVerifier));
        console2.log("========================================\n");
    }
}
