// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SettlementVerifier
 * @author Swoosh Team
 * @notice Verifies cross-chain settlements and handles refunds
 * @dev Integrates with CCIP to confirm message delivery
 */
contract SettlementVerifier is Ownable, ReentrancyGuard {
    // ============ Events ============
    event SettlementRegistered(
        uint256 indexed intentId,
        bytes32 indexed messageId,
        uint256 timestamp
    );
    
    event SettlementVerified(
        uint256 indexed intentId,
        bytes32 indexed messageId,
        uint256 timestamp
    );
    
    event SettlementFailed(
        uint256 indexed intentId,
        string reason,
        uint256 timestamp
    );
    
    event RefundIssued(
        uint256 indexed intentId,
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    
    event SettlementTimeoutUpdated(uint256 oldTimeout, uint256 newTimeout);
    event RouteExecutorUpdated(address indexed oldExecutor, address indexed newExecutor);
    event CCIPRouterUpdated(address indexed oldRouter, address indexed newRouter);

    // ============ Errors ============
    error InvalidAddress();
    error InvalidMessageId();
    error SettlementNotFound();
    error AlreadyVerified();
    error SettlementExpired();
    error NotExpiredYet();
    error Unauthorized();
    error RefundFailed();

    // ============ State Variables ============
    address public ccipRouter;
    address public routeExecutor;
    uint256 public settlementTimeout = 1 hours;

    mapping(uint256 => Settlement) public settlements;
    mapping(bytes32 => uint256) public messageIdToIntentId;

    struct Settlement {
        bytes32 messageId;
        address user;
        address token;
        uint256 amount;
        uint256 registeredAt;
        bool verified;
        bool refunded;
    }

    // ============ Constructor ============
    constructor(address _ccipRouter, address _routeExecutor) Ownable(msg.sender) {
        if (_ccipRouter == address(0) || _routeExecutor == address(0)) {
            revert InvalidAddress();
        }
        ccipRouter = _ccipRouter;
        routeExecutor = _routeExecutor;
    }

    // ============ Modifiers ============
    modifier onlyRouteExecutor() {
        if (msg.sender != routeExecutor && msg.sender != owner()) {
            revert Unauthorized();
        }
        _;
    }

    // ============ External Functions ============

    /**
     * @notice Register a pending settlement
     * @param intentId The intent ID
     * @param messageId The CCIP message ID
     * @param user The user address for potential refund
     * @param token The token address
     * @param amount The amount for potential refund
     */
    function registerSettlement(
        uint256 intentId,
        bytes32 messageId,
        address user,
        address token,
        uint256 amount
    ) external onlyRouteExecutor {
        if (messageId == bytes32(0)) revert InvalidMessageId();
        if (user == address(0)) revert InvalidAddress();

        settlements[intentId] = Settlement({
            messageId: messageId,
            user: user,
            token: token,
            amount: amount,
            registeredAt: block.timestamp,
            verified: false,
            refunded: false
        });

        messageIdToIntentId[messageId] = intentId;

        emit SettlementRegistered(intentId, messageId, block.timestamp);
    }

    /**
     * @notice Verify a settlement (called when CCIP confirms delivery)
     * @param intentId The intent ID
     * @param messageId The CCIP message ID
     */
    function verifySettlement(
        uint256 intentId,
        bytes32 messageId
    ) external nonReentrant {
        Settlement storage settlement = settlements[intentId];
        
        if (settlement.messageId == bytes32(0)) revert SettlementNotFound();
        if (settlement.messageId != messageId) revert InvalidMessageId();
        if (settlement.verified) revert AlreadyVerified();
        
        // Check if expired
        if (block.timestamp > settlement.registeredAt + settlementTimeout) {
            revert SettlementExpired();
        }

        settlement.verified = true;

        emit SettlementVerified(intentId, messageId, block.timestamp);
    }

    /**
     * @notice Mark settlement as failed
     * @param intentId The intent ID
     * @param reason The failure reason
     */
    function markFailed(uint256 intentId, string calldata reason) external onlyRouteExecutor {
        Settlement storage settlement = settlements[intentId];
        if (settlement.messageId == bytes32(0)) revert SettlementNotFound();
        
        emit SettlementFailed(intentId, reason, block.timestamp);
    }

    /**
     * @notice Claim refund for expired settlement
     * @param intentId The intent ID
     */
    function claimRefund(uint256 intentId) external nonReentrant {
        Settlement storage settlement = settlements[intentId];
        
        if (settlement.messageId == bytes32(0)) revert SettlementNotFound();
        if (settlement.verified) revert AlreadyVerified();
        if (settlement.refunded) revert RefundFailed();
        
        // Must be expired
        if (block.timestamp <= settlement.registeredAt + settlementTimeout) {
            revert NotExpiredYet();
        }
        
        // Only user can claim their refund
        if (msg.sender != settlement.user) revert Unauthorized();
        
        settlement.refunded = true;
        
        // Note: Actual refund logic would transfer tokens here
        // For now just emit event - tokens held by RouteExecutor
        
        emit RefundIssued(
            intentId,
            settlement.user,
            settlement.amount,
            block.timestamp
        );
    }

    // ============ Admin Functions ============

    /**
     * @notice Update settlement timeout
     * @param _timeout New timeout in seconds
     */
    function setSettlementTimeout(uint256 _timeout) external onlyOwner {
        uint256 oldTimeout = settlementTimeout;
        settlementTimeout = _timeout;
        emit SettlementTimeoutUpdated(oldTimeout, _timeout);
    }

    /**
     * @notice Update route executor address
     * @param _routeExecutor New route executor address
     */
    function setRouteExecutor(address _routeExecutor) external onlyOwner {
        if (_routeExecutor == address(0)) revert InvalidAddress();
        address oldExecutor = routeExecutor;
        routeExecutor = _routeExecutor;
        emit RouteExecutorUpdated(oldExecutor, _routeExecutor);
    }

    /**
     * @notice Update CCIP router address
     * @param _ccipRouter New CCIP router address
     */
    function setCCIPRouter(address _ccipRouter) external onlyOwner {
        if (_ccipRouter == address(0)) revert InvalidAddress();
        address oldRouter = ccipRouter;
        ccipRouter = _ccipRouter;
        emit CCIPRouterUpdated(oldRouter, _ccipRouter);
    }

    // ============ View Functions ============

    /**
     * @notice Get settlement details
     * @param intentId The intent ID
     */
    function getSettlement(uint256 intentId) external view returns (Settlement memory) {
        return settlements[intentId];
    }

    /**
     * @notice Check if settlement is verified
     * @param intentId The intent ID
     */
    function isVerified(uint256 intentId) external view returns (bool) {
        return settlements[intentId].verified;
    }

    /**
     * @notice Check if settlement is expired
     * @param intentId The intent ID
     */
    function isExpired(uint256 intentId) external view returns (bool) {
        Settlement memory settlement = settlements[intentId];
        if (settlement.registeredAt == 0) return false;
        return block.timestamp > settlement.registeredAt + settlementTimeout;
    }

    /**
     * @notice Get intent ID from CCIP message ID
     * @param messageId The CCIP message ID
     */
    function getIntentIdByMessageId(bytes32 messageId) external view returns (uint256) {
        return messageIdToIntentId[messageId];
    }

    /**
     * @notice Check if refund is claimable
     * @param intentId The intent ID
     */
    function isRefundClaimable(uint256 intentId) external view returns (bool) {
        Settlement memory settlement = settlements[intentId];
        if (settlement.registeredAt == 0) return false;
        if (settlement.verified) return false;
        if (settlement.refunded) return false;
        return block.timestamp > settlement.registeredAt + settlementTimeout;
    }
}
