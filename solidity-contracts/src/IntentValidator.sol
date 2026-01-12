// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IntentValidator
 * @author Swoosh Team
 * @notice Validates user intents before execution
 * @dev Ensures all parameters are valid and users have necessary approvals/balances
 */
contract IntentValidator is Ownable, ReentrancyGuard {
    // ============ Events ============
    event ChainAdded(uint256 indexed chainId, uint256 timestamp);
    event ChainRemoved(uint256 indexed chainId, uint256 timestamp);
    event TokenAdded(address indexed token, uint256 timestamp);
    event TokenRemoved(address indexed token, uint256 timestamp);
    event IntentValidated(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 destinationChain,
        uint256 timestamp
    );

    // ============ Errors ============
    error InvalidAddress();
    error InvalidAmount();
    error UnsupportedChain(uint256 chainId);
    error UnsupportedToken(address token);
    error InsufficientBalance(uint256 required, uint256 available);
    error InsufficientAllowance(uint256 required, uint256 available);
    error ChainAlreadySupported(uint256 chainId);
    error TokenAlreadySupported(address token);

    // ============ State Variables ============
    mapping(uint256 => bool) public supportedChains;
    mapping(address => bool) public supportedTokens;
    
    uint256[] private _supportedChainsList;
    address[] private _supportedTokensList;

    // ============ Constructor ============
    constructor() Ownable(msg.sender) {}

    // ============ External Functions ============

    /**
     * @notice Add a supported destination chain
     * @param chainId The chain ID to support
     */
    function addSupportedChain(uint256 chainId) external onlyOwner {
        if (chainId == 0) revert InvalidAmount();
        if (supportedChains[chainId]) revert ChainAlreadySupported(chainId);
        
        supportedChains[chainId] = true;
        _supportedChainsList.push(chainId);
        
        emit ChainAdded(chainId, block.timestamp);
    }

    /**
     * @notice Remove a supported chain
     * @param chainId The chain ID to remove
     */
    function removeSupportedChain(uint256 chainId) external onlyOwner {
        if (!supportedChains[chainId]) revert UnsupportedChain(chainId);
        
        supportedChains[chainId] = false;
        
        // Remove from list
        for (uint256 i = 0; i < _supportedChainsList.length; i++) {
            if (_supportedChainsList[i] == chainId) {
                _supportedChainsList[i] = _supportedChainsList[_supportedChainsList.length - 1];
                _supportedChainsList.pop();
                break;
            }
        }
        
        emit ChainRemoved(chainId, block.timestamp);
    }

    /**
     * @notice Add a supported token
     * @param token The token address to support
     */
    function addSupportedToken(address token) external onlyOwner {
        if (token == address(0)) revert InvalidAddress();
        if (supportedTokens[token]) revert TokenAlreadySupported(token);
        
        supportedTokens[token] = true;
        _supportedTokensList.push(token);
        
        emit TokenAdded(token, block.timestamp);
    }

    /**
     * @notice Remove a supported token
     * @param token The token address to remove
     */
    function removeSupportedToken(address token) external onlyOwner {
        if (!supportedTokens[token]) revert UnsupportedToken(token);
        
        supportedTokens[token] = false;
        
        // Remove from list
        for (uint256 i = 0; i < _supportedTokensList.length; i++) {
            if (_supportedTokensList[i] == token) {
                _supportedTokensList[i] = _supportedTokensList[_supportedTokensList.length - 1];
                _supportedTokensList.pop();
                break;
            }
        }
        
        emit TokenRemoved(token, block.timestamp);
    }

    /**
     * @notice Validate a complete intent structure
     * @param user The user address initiating the intent
     * @param token The source token address
     * @param amount The amount to transfer
     * @param destinationChain The destination chain ID
     * @param spender The address that will spend tokens (RouteExecutor)
     * @return valid True if intent is valid
     */
    function validateIntent(
        address user,
        address token,
        uint256 amount,
        uint256 destinationChain,
        address spender
    ) external nonReentrant returns (bool valid) {
        // Validate amount
        if (amount == 0) revert InvalidAmount();
        
        // Validate addresses
        if (user == address(0) || token == address(0) || spender == address(0)) {
            revert InvalidAddress();
        }
        
        // Check chain support
        if (!supportedChains[destinationChain]) {
            revert UnsupportedChain(destinationChain);
        }
        
        // Check token support
        if (!supportedTokens[token]) {
            revert UnsupportedToken(token);
        }
        
        // Check user balance
        uint256 balance = IERC20(token).balanceOf(user);
        if (balance < amount) {
            revert InsufficientBalance(amount, balance);
        }
        
        // Check allowance
        uint256 allowance = IERC20(token).allowance(user, spender);
        if (allowance < amount) {
            revert InsufficientAllowance(amount, allowance);
        }
        
        emit IntentValidated(user, token, amount, destinationChain, block.timestamp);
        
        return true;
    }

    // ============ View Functions ============

    /**
     * @notice Check if a chain is supported
     * @param chainId The chain ID to check
     * @return True if supported
     */
    function isChainSupported(uint256 chainId) external view returns (bool) {
        return supportedChains[chainId];
    }

    /**
     * @notice Check if a token is supported
     * @param token The token address to check
     * @return True if supported
     */
    function isTokenSupported(address token) external view returns (bool) {
        return supportedTokens[token];
    }

    /**
     * @notice Get all supported chains
     * @return Array of supported chain IDs
     */
    function getSupportedChains() external view returns (uint256[] memory) {
        return _supportedChainsList;
    }

    /**
     * @notice Get all supported tokens
     * @return Array of supported token addresses
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return _supportedTokensList;
    }

    /**
     * @notice Check token balance for a user
     * @param token The token address
     * @param user The user address
     * @return The balance
     */
    function checkBalance(address token, address user) external view returns (uint256) {
        return IERC20(token).balanceOf(user);
    }

    /**
     * @notice Check token allowance for a user
     * @param token The token address
     * @param user The user address
     * @param spender The spender address
     * @return The allowance
     */
    function checkAllowance(
        address token,
        address user,
        address spender
    ) external view returns (uint256) {
        return IERC20(token).allowance(user, spender);
    }
}
