//! SettlementVerifier Contract
//! 
//! Verifies cross-chain message delivery and handles settlement confirmation or failures.

#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
#![cfg_attr(feature = "contract-client-gen", allow(unused_imports))]

extern crate alloc;

use alloy_sol_types::sol;
use stylus_sdk::{
    alloy_primitives::{Address, U256, FixedBytes},
    prelude::*,
    storage::{StorageAddress, StorageMap, StorageU256},
};

// Events
sol! {
    event SettlementConfirmed(
        uint256 indexed intentId,
        bytes32 indexed messageId,
        uint256 timestamp
    );
    
    event SettlementFailed(
        uint256 indexed intentId,
        bytes32 indexed messageId,
        string reason
    );
    
    event RefundInitiated(
        uint256 indexed intentId,
        address indexed user,
        address token,
        uint256 amount
    );
    
    error Unauthorized();
    error InvalidMessageId();
    error InvalidIntentId();
    error SettlementTimeout();
    error AlreadyProcessed();
    error RefundFailed();
}

/// Settlement status enumeration
#[derive(Clone, Copy, PartialEq)]
pub enum SettlementStatus {
    Pending = 0,
    Confirmed = 1,
    Failed = 2,
    Refunded = 3,
}

/// Error types for SettlementVerifier
#[derive(SolidityError)]
pub enum SettlementVerifierError {
    Unauthorized(Unauthorized),
    InvalidMessageId(InvalidMessageId),
    InvalidIntentId(InvalidIntentId),
    SettlementTimeout(SettlementTimeout),
    AlreadyProcessed(AlreadyProcessed),
    RefundFailed(RefundFailed),
}

#[storage]
#[entrypoint]
pub struct SettlementVerifier {
    /// Contract owner
    owner: StorageAddress,
    /// RouteExecutor contract address
    route_executor: StorageAddress,
    /// CCIP router address (authorized to call verify functions)
    ccip_router: StorageAddress,
    /// Mapping of intent IDs to settlement status
    settlements: StorageMap<U256, StorageU256>,
    /// Mapping of intent IDs to timestamp for timeout tracking
    settlement_timestamps: StorageMap<U256, StorageU256>,
    /// Settlement timeout period (30 minutes = 1800 seconds)
    timeout_period: StorageU256,
}

#[public]
impl SettlementVerifier {
    /// Initialize the contract
    pub fn init(
        &mut self,
        route_executor_address: Address,
        ccip_router_address: Address,
    ) -> Result<(), SettlementVerifierError> {
        if route_executor_address == Address::ZERO || ccip_router_address == Address::ZERO {
            return Err(SettlementVerifierError::Unauthorized(Unauthorized {}));
        }

        self.owner.set(self.vm().msg_sender());
        self.route_executor.set(route_executor_address);
        self.ccip_router.set(ccip_router_address);
        // Set timeout to 30 minutes (1800 seconds)
        self.timeout_period.set(U256::from(1800));

        Ok(())
    }

    /// Verify CCIP message delivery
    /// 
    /// Called by CCIP router on destination chain to confirm message delivery.
    /// Can only be called by authorized CCIP router.
    pub fn verify_ccip_message(
        &mut self,
        message_id: FixedBytes<32>,
        intent_id: U256,
    ) -> Result<bool, SettlementVerifierError> {
        // Only CCIP router can call this
        self.only_ccip_router()?;

        // Validate intent ID
        if intent_id == U256::ZERO {
            return Err(SettlementVerifierError::InvalidIntentId(InvalidIntentId {}));
        }

        // Check if already processed
        let current_status = self.get_settlement_status(intent_id);
        if current_status != U256::from(SettlementStatus::Pending as u8) {
            return Err(SettlementVerifierError::AlreadyProcessed(AlreadyProcessed {}));
        }

        // Record timestamp
        self.settlement_timestamps.setter(intent_id).set(
            StorageU256::from(self.vm().block_timestamp())
        );

        // Confirm settlement
        self.confirm_settlement(intent_id)?;

        self.vm().log(SettlementConfirmed {
            intentId: intent_id,
            messageId: message_id,
            timestamp: U256::from(self.vm().block_timestamp()),
        });

        Ok(true)
    }

    /// Confirm successful settlement
    /// 
    /// Updates settlement status to confirmed.
    pub fn confirm_settlement(&mut self, intent_id: U256) -> Result<(), SettlementVerifierError> {
        if intent_id == U256::ZERO {
            return Err(SettlementVerifierError::InvalidIntentId(InvalidIntentId {}));
        }

        // Update status to Confirmed
        self.settlements.setter(intent_id).set(
            StorageU256::from(SettlementStatus::Confirmed as u8)
        );

        Ok(())
    }

    /// Handle failed transfer and initiate refund
    /// 
    /// Called when a cross-chain transfer fails or times out.
    /// Initiates refund process back to the user.
    pub fn handle_failure(
        &mut self,
        intent_id: U256,
        user: Address,
        token: Address,
        amount: U256,
        reason: alloc::string::String,
    ) -> Result<(), SettlementVerifierError> {
        // Only owner or route executor can call this
        self.only_authorized()?;

        if intent_id == U256::ZERO {
            return Err(SettlementVerifierError::InvalidIntentId(InvalidIntentId {}));
        }

        // Check for timeout
        let settlement_time = self.settlement_timestamps.get(intent_id);
        let current_time = U256::from(self.vm().block_timestamp());
        let timeout = self.timeout_period.get();

        if settlement_time != U256::ZERO && current_time > settlement_time + timeout {
            // Timeout occurred
            self.settlements.setter(intent_id).set(
                StorageU256::from(SettlementStatus::Failed as u8)
            );

            self.vm().log(SettlementFailed {
                intentId: intent_id,
                messageId: FixedBytes::<32>::ZERO,
                reason: reason.clone(),
            });

            // Initiate refund
            self.initiate_refund(intent_id, user, token, amount)?;
        }

        Ok(())
    }

    /// Get settlement status for an intent
    pub fn get_settlement_status(&self, intent_id: U256) -> U256 {
        self.settlements.get(intent_id)
    }

    /// Get settlement timestamp
    pub fn get_settlement_timestamp(&self, intent_id: U256) -> U256 {
        self.settlement_timestamps.get(intent_id)
    }

    /// Check if settlement has timed out
    pub fn has_settlement_timed_out(&self, intent_id: U256) -> bool {
        let settlement_time = self.settlement_timestamps.get(intent_id);
        if settlement_time == U256::ZERO {
            return false;
        }

        let current_time = U256::from(self.vm().block_timestamp());
        let timeout = self.timeout_period.get();

        current_time > settlement_time + timeout
    }

    /// Update timeout period (admin only)
    pub fn set_timeout_period(&mut self, new_timeout: U256) -> Result<(), SettlementVerifierError> {
        self.only_owner()?;
        self.timeout_period.set(new_timeout);
        Ok(())
    }

    /// Get contract owner
    pub fn owner(&self) -> Address {
        self.owner.get()
    }

    /// Internal: Initiate refund process
    fn initiate_refund(
        &mut self,
        intent_id: U256,
        user: Address,
        token: Address,
        amount: U256,
    ) -> Result<(), SettlementVerifierError> {
        // Update status to Refunded
        self.settlements.setter(intent_id).set(
            StorageU256::from(SettlementStatus::Refunded as u8)
        );

        self.vm().log(RefundInitiated {
            intentId: intent_id,
            user,
            token,
            amount,
        });

        // In production, this would trigger actual token refund
        // through the RouteExecutor contract

        Ok(())
    }

    /// Internal: Check if caller is owner
    fn only_owner(&self) -> Result<(), SettlementVerifierError> {
        if self.vm().msg_sender() != self.owner.get() {
            return Err(SettlementVerifierError::Unauthorized(Unauthorized {}));
        }
        Ok(())
    }

    /// Internal: Check if caller is CCIP router
    fn only_ccip_router(&self) -> Result<(), SettlementVerifierError> {
        if self.vm().msg_sender() != self.ccip_router.get() {
            return Err(SettlementVerifierError::Unauthorized(Unauthorized {}));
        }
        Ok(())
    }

    /// Internal: Check if caller is authorized (owner or route executor)
    fn only_authorized(&self) -> Result<(), SettlementVerifierError> {
        let sender = self.vm().msg_sender();
        if sender != self.owner.get() && sender != self.route_executor.get() {
            return Err(SettlementVerifierError::Unauthorized(Unauthorized {}));
        }
        Ok(())
    }
}
