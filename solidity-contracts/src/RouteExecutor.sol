// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title RouteExecutor
 * @author Swoosh Team
 * @notice Executes swap and bridge routes for cross-chain intents
 * @dev Integrates with DEX aggregators and CCIP for cross-chain transfers
 */
contract RouteExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Events ============
    event SwapExecuted(
        uint256 indexed intentId,
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 timestamp
    );
    
    event BridgeInitiated(
        uint256 indexed intentId,
        address indexed user,
        uint256 destinationChain,
        bytes32 messageId,
        uint256 timestamp
    );
    
    event ExecutorAdded(address indexed executor);
    event ExecutorRemoved(address indexed executor);
    event CCIPRouterUpdated(address indexed oldRouter, address indexed newRouter);
    event IntentValidatorUpdated(address indexed oldValidator, address indexed newValidator);

    // ============ Errors ============
    error InvalidAddress();
    error InvalidAmount();
    error UnauthorizedExecutor();
    error SwapFailed();
    error BridgeFailed();
    error InsufficientOutput(uint256 expected, uint256 received);
    error TransferFailed();

    // ============ State Variables ============
    address public intentValidator;
    address public ccipRouter;
    
    mapping(address => bool) public authorizedExecutors;
    mapping(uint256 => IntentExecution) public intentExecutions;
    
    uint256 public nextIntentId;
    uint256 public defaultSlippage = 100; // 1% = 100 basis points

    struct IntentExecution {
        address user;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOut;
        uint256 destinationChain;
        bytes32 ccipMessageId;
        ExecutionStatus status;
        uint256 timestamp;
    }

    enum ExecutionStatus {
        Pending,
        SwapComplete,
        BridgeInitiated,
        Completed,
        Failed
    }

    // ============ Constructor ============
    constructor(address _intentValidator, address _ccipRouter) Ownable(msg.sender) {
        if (_intentValidator == address(0) || _ccipRouter == address(0)) {
            revert InvalidAddress();
        }
        intentValidator = _intentValidator;
        ccipRouter = _ccipRouter;
        authorizedExecutors[msg.sender] = true;
        
        emit ExecutorAdded(msg.sender);
    }

    // ============ Modifiers ============
    modifier onlyExecutor() {
        if (!authorizedExecutors[msg.sender]) revert UnauthorizedExecutor();
        _;
    }

    // ============ External Functions ============

    /**
     * @notice Add an authorized executor
     * @param executor The address to authorize
     */
    function addExecutor(address executor) external onlyOwner {
        if (executor == address(0)) revert InvalidAddress();
        authorizedExecutors[executor] = true;
        emit ExecutorAdded(executor);
    }

    /**
     * @notice Remove an authorized executor
     * @param executor The address to remove
     */
    function removeExecutor(address executor) external onlyOwner {
        authorizedExecutors[executor] = false;
        emit ExecutorRemoved(executor);
    }

    /**
     * @notice Update the CCIP router address
     * @param _ccipRouter The new CCIP router address
     */
    function setCCIPRouter(address _ccipRouter) external onlyOwner {
        if (_ccipRouter == address(0)) revert InvalidAddress();
        address oldRouter = ccipRouter;
        ccipRouter = _ccipRouter;
        emit CCIPRouterUpdated(oldRouter, _ccipRouter);
    }

    /**
     * @notice Update the intent validator address
     * @param _intentValidator The new validator address
     */
    function setIntentValidator(address _intentValidator) external onlyOwner {
        if (_intentValidator == address(0)) revert InvalidAddress();
        address oldValidator = intentValidator;
        intentValidator = _intentValidator;
        emit IntentValidatorUpdated(oldValidator, _intentValidator);
    }

    /**
     * @notice Set default slippage in basis points
     * @param _slippage Slippage in basis points (100 = 1%)
     */
    function setDefaultSlippage(uint256 _slippage) external onlyOwner {
        defaultSlippage = _slippage;
    }

    /**
     * @notice Execute a swap using DEX aggregator calldata
     * @param user The user address
     * @param tokenIn The input token
     * @param tokenOut The output token
     * @param amountIn The input amount
     * @param minAmountOut The minimum output amount (slippage protection)
     * @param swapTarget The DEX aggregator address (e.g., 1inch router)
     * @param swapCalldata The calldata for the swap
     * @return intentId The intent ID for tracking
     * @return amountOut The actual output amount
     */
    function executeSwap(
        address user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address swapTarget,
        bytes calldata swapCalldata
    ) external onlyExecutor nonReentrant returns (uint256 intentId, uint256 amountOut) {
        if (user == address(0) || tokenIn == address(0) || tokenOut == address(0)) {
            revert InvalidAddress();
        }
        if (amountIn == 0) revert InvalidAmount();

        // Transfer tokens from user
        IERC20(tokenIn).safeTransferFrom(user, address(this), amountIn);

        // Approve swap target
        IERC20(tokenIn).approve(swapTarget, amountIn);

        // Get balance before swap
        uint256 balanceBefore = IERC20(tokenOut).balanceOf(address(this));

        // Execute swap
        (bool success, ) = swapTarget.call(swapCalldata);
        if (!success) revert SwapFailed();

        // Calculate output
        amountOut = IERC20(tokenOut).balanceOf(address(this)) - balanceBefore;
        if (amountOut < minAmountOut) {
            revert InsufficientOutput(minAmountOut, amountOut);
        }

        // Create intent execution record
        intentId = nextIntentId++;
        intentExecutions[intentId] = IntentExecution({
            user: user,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            amountOut: amountOut,
            destinationChain: 0,
            ccipMessageId: bytes32(0),
            status: ExecutionStatus.SwapComplete,
            timestamp: block.timestamp
        });

        emit SwapExecuted(
            intentId,
            user,
            tokenIn,
            tokenOut,
            amountIn,
            amountOut,
            block.timestamp
        );

        return (intentId, amountOut);
    }

    /**
     * @notice Execute a same-chain transfer (no bridge needed)
     * @param intentId The intent ID
     * @param recipient The recipient address
     */
    function completeSameChainTransfer(
        uint256 intentId,
        address recipient
    ) external onlyExecutor nonReentrant {
        IntentExecution storage execution = intentExecutions[intentId];
        if (execution.status != ExecutionStatus.SwapComplete) revert SwapFailed();
        
        // Transfer output tokens to recipient
        IERC20(execution.tokenOut).safeTransfer(recipient, execution.amountOut);
        
        execution.status = ExecutionStatus.Completed;
    }

    /**
     * @notice Initiate CCIP bridge transfer
     * @param intentId The intent ID
     * @param destinationChain The destination chain selector
     * @param recipient The recipient address on destination chain
     * @param ccipFee The CCIP fee amount in native token
     */
    function initiateBridge(
        uint256 intentId,
        uint64 destinationChain,
        address recipient,
        uint256 ccipFee
    ) external payable onlyExecutor nonReentrant {
        IntentExecution storage execution = intentExecutions[intentId];
        if (execution.status != ExecutionStatus.SwapComplete) revert SwapFailed();
        
        // For now, emit event - actual CCIP integration would go here
        // In production, this would call ccipRouter.ccipSend()
        
        bytes32 messageId = keccak256(abi.encodePacked(
            intentId,
            destinationChain,
            recipient,
            execution.amountOut,
            block.timestamp
        ));
        
        execution.destinationChain = destinationChain;
        execution.ccipMessageId = messageId;
        execution.status = ExecutionStatus.BridgeInitiated;
        
        emit BridgeInitiated(
            intentId,
            execution.user,
            destinationChain,
            messageId,
            block.timestamp
        );
    }

    /**
     * @notice Mark an intent as completed (called after CCIP confirmation)
     * @param intentId The intent ID
     */
    function markCompleted(uint256 intentId) external onlyExecutor {
        intentExecutions[intentId].status = ExecutionStatus.Completed;
    }

    /**
     * @notice Mark an intent as failed
     * @param intentId The intent ID
     */
    function markFailed(uint256 intentId) external onlyExecutor {
        intentExecutions[intentId].status = ExecutionStatus.Failed;
    }

    // ============ View Functions ============

    /**
     * @notice Get intent execution details
     * @param intentId The intent ID
     */
    function getIntentExecution(uint256 intentId) external view returns (IntentExecution memory) {
        return intentExecutions[intentId];
    }

    /**
     * @notice Check if an address is an authorized executor
     * @param executor The address to check
     */
    function isExecutor(address executor) external view returns (bool) {
        return authorizedExecutors[executor];
    }

    // ============ Emergency Functions ============

    /**
     * @notice Emergency withdraw tokens (only owner)
     * @param token The token to withdraw
     * @param to The recipient
     * @param amount The amount to withdraw
     */
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        if (to == address(0)) revert InvalidAddress();
        IERC20(token).safeTransfer(to, amount);
    }

    /**
     * @notice Emergency withdraw ETH (only owner)
     * @param to The recipient
     */
    function emergencyWithdrawETH(address payable to) external onlyOwner {
        if (to == address(0)) revert InvalidAddress();
        (bool success, ) = to.call{value: address(this).balance}("");
        if (!success) revert TransferFailed();
    }

    // Allow receiving ETH for CCIP fees
    receive() external payable {}
}
