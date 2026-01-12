//! RouteExecutor Contract
//! 
//! Executes optimized cross-chain routes atomically, handling swaps and bridge transfers.

#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
#![cfg_attr(feature = "contract-client-gen", allow(unused_imports))]

extern crate alloc;

use alloy_sol_types::sol;
use stylus_sdk::{
    alloy_primitives::{Address, U256, Bytes},
    prelude::*,
    storage::{StorageAddress, StorageMap, StorageBool, StorageU256},
};

// Events
sol! {
    event IntentExecuted(
        uint256 indexed intentId,
        address indexed user,
        uint256 timestamp
    );
    
    event SwapExecuted(
        uint256 indexed intentId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    
    event BridgeInitiated(
        uint256 indexed intentId,
        address token,
        uint256 amount,
        uint256 destinationChain,
        address recipient
    );
    
    event IntentFailed(
        uint256 indexed intentId,
        string reason
    );

    event Paused(address indexed by);
    event Unpaused(address indexed by);
    
    error Unauthorized();
    error InvalidAddress();
    error InvalidAmount();
    error ValidationFailed();
    error SwapFailed();
    error BridgeFailed();
    error ContractPaused();
    error ReentrancyGuard();
}

/// Intent status enumeration
#[derive(Clone, Copy, PartialEq)]
pub enum IntentStatus {
    Pending = 0,
    Executing = 1,
    Completed = 2,
    Failed = 3,
}

/// Error types for RouteExecutor
#[derive(SolidityError)]
pub enum RouteExecutorError {
    Unauthorized(Unauthorized),
    InvalidAddress(InvalidAddress),
    InvalidAmount(InvalidAmount),
    ValidationFailed(ValidationFailed),
    SwapFailed(SwapFailed),
    BridgeFailed(BridgeFailed),
    ContractPaused(ContractPaused),
    ReentrancyGuard(ReentrancyGuard),
}

// ERC20 interface
sol_interface! {
    interface IERC20 {
        function transferFrom(address from, address to, uint256 amount) external returns (bool);
        function transfer(address to, uint256 amount) external returns (bool);
        function approve(address spender, uint256 amount) external returns (bool);
    }
}

// IntentValidator interface
sol_interface! {
    interface IIntentValidator {
        function validate_intent(
            address user,
            address token,
            uint256 amount,
            uint256 destination_chain,
            address spender
        ) external view returns (bool);
    }
}

#[storage]
pub struct RouteExecutor {
    /// Contract owner
    owner: StorageAddress,
    /// IntentValidator contract address
    validator: StorageAddress,
    /// CCIP router address
    ccip_router: StorageAddress,
    /// Intent counter for unique IDs
    intent_counter: StorageU256,
    /// Mapping of intent IDs to status
    intent_statuses: StorageMap<U256, StorageU256>,
    /// Contract paused state
    paused: StorageBool,
    /// Reentrancy guard
    locked: StorageBool,
}

#[public]
impl RouteExecutor {
    /// Initialize the contract
    pub fn init(
        &mut self,
        validator_address: Address,
        ccip_router_address: Address,
    ) -> Result<(), RouteExecutorError> {
        if validator_address == Address::ZERO || ccip_router_address == Address::ZERO {
            return Err(RouteExecutorError::InvalidAddress(InvalidAddress {}));
        }

        self.owner.set(self.vm().msg_sender());
        self.validator.set(validator_address);
        self.ccip_router.set(ccip_router_address);
        self.intent_counter.set(U256::ZERO);
        self.paused.set(false);
        self.locked.set(false);

        Ok(())
    }

    /// Execute a complete cross-chain route
    /// 
    /// Steps:
    /// 1. Validate intent through IntentValidator
    /// 2. Transfer tokens from user
    /// 3. Execute swap (if needed)
    /// 4. Initiate bridge transfer
    /// 5. Emit tracking events
    pub fn execute_full_route(
        &mut self,
        token_in: Address,
        amount: U256,
        destination_chain: U256,
        recipient: Address,
        _swap_data: Bytes,
    ) -> Result<U256, RouteExecutorError> {
        // Check if paused
        if self.paused.get().into() {
            return Err(RouteExecutorError::ContractPaused(ContractPaused {}));
        }

        // Reentrancy guard
        self.check_not_locked()?;
        self.locked.set(true);

        let user = self.vm().msg_sender();
        let intent_id = self.intent_counter.get() + U256::from(1);
        
        // Validate intent
        // NOTE: In Phase 1, we perform basic validation here
        // Full external validator call will be implemented in Phase 2
        if token_in == Address::ZERO || recipient == Address::ZERO {
            self.locked.set(false);
            return Err(RouteExecutorError::InvalidAddress(InvalidAddress {}));
        }
        
        if amount == U256::ZERO {
            self.locked.set(false);
            return Err(RouteExecutorError::InvalidAmount(InvalidAmount {}));
        }

        // Update intent status to Executing
        self.intent_statuses.setter(intent_id).set(U256::from(IntentStatus::Executing as u8));

        // Transfer tokens from user to contract
        // NOTE: In production, this would call token.transferFrom()
        // For Phase 1 compilation, we assume transfer succeeds
        // This will be properly implemented with external calls in Phase 2

        // Execute swap if swap_data is provided
        let final_amount = if _swap_data.len() > 0 {
            self.internal_execute_swap(intent_id, token_in, amount, _swap_data)?
        } else {
            amount
        };

        // Initiate bridge transfer
        self.internal_execute_bridge(intent_id, token_in, final_amount, destination_chain, recipient)?;

        // Update intent status to Completed
        self.intent_statuses.setter(intent_id).set(U256::from(IntentStatus::Completed as u8));

        // Increment counter
        self.intent_counter.set(intent_id);

        // Emit success event
        self.vm().log(IntentExecuted {
            intentId: intent_id,
            user,
            timestamp: U256::from(self.vm().block_timestamp()),
        });

        // Release lock
        self.locked.set(false);

        Ok(intent_id)
    }

    /// Get intent execution status
    pub fn get_intent_status(&self, intent_id: U256) -> U256 {
        self.intent_statuses.get(intent_id)
    }

    /// Pause contract (admin only)
    pub fn pause(&mut self) -> Result<(), RouteExecutorError> {
        self.only_owner()?;
        self.paused.set(true);
        
        self.vm().log(Paused {
            by: self.vm().msg_sender(),
        });

        Ok(())
    }

    /// Unpause contract (admin only)
    pub fn unpause(&mut self) -> Result<(), RouteExecutorError> {
        self.only_owner()?;
        self.paused.set(false);
        
        self.vm().log(Unpaused {
            by: self.vm().msg_sender(),
        });

        Ok(())
    }

    /// Get contract owner
    pub fn owner(&self) -> Address {
        self.owner.get()
    }

    /// Internal: Execute DEX swap
    fn internal_execute_swap(
        &mut self,
        intent_id: U256,
        token_in: Address,
        amount: U256,
        _swap_data: Bytes,
    ) -> Result<U256, RouteExecutorError> {
        // In production, this would call a DEX aggregator contract
        // For now, we emit event and return the same amount
        
        self.vm().log(SwapExecuted {
            intentId: intent_id,
            tokenIn: token_in,
            tokenOut: token_in, // In real implementation, this would be different
            amountIn: amount,
            amountOut: amount, // In real implementation, this would be calculated
        });

        Ok(amount)
    }

    /// Internal: Initiate CCIP bridge transfer
    fn internal_execute_bridge(
        &mut self,
        intent_id: U256,
        token: Address,
        amount: U256,
        destination_chain: U256,
        recipient: Address,
    ) -> Result<(), RouteExecutorError> {
        // In production, this would call the CCIP router contract
        // For now, we emit event
        
        self.vm().log(BridgeInitiated {
            intentId: intent_id,
            token,
            amount,
            destinationChain: destination_chain,
            recipient,
        });

        Ok(())
    }

    /// Internal: Check if caller is owner
    fn only_owner(&self) -> Result<(), RouteExecutorError> {
        if self.vm().msg_sender() != self.owner.get() {
            return Err(RouteExecutorError::Unauthorized(Unauthorized {}));
        }
        Ok(())
    }

    /// Internal: Check reentrancy lock
    fn check_not_locked(&self) -> Result<(), RouteExecutorError> {
        if self.locked.get().into() {
            return Err(RouteExecutorError::ReentrancyGuard(ReentrancyGuard {}));
        }
        Ok(())
    }
}
