//! Swoosh Smart Contracts
//! 
//! Core contracts for AI-powered cross-chain intent solver on Arbitrum Stylus
//!
//! This file is configured to deploy IntentValidator.

#![cfg_attr(not(any(test, feature = "export-abi")), no_std, no_main)]

extern crate alloc;

// Include modules for testing and ABI export
#[cfg(any(test, feature = "export-abi"))]
pub mod intent_validator;
#[cfg(any(test, feature = "export-abi"))]
pub mod route_executor;
#[cfg(any(test, feature = "export-abi"))]
pub mod settlement_verifier;

// =====================================================
// ACTIVE CONTRACT FOR DEPLOYMENT: IntentValidator
// =====================================================
#[cfg(not(any(test, feature = "export-abi")))]
mod active_contract {
    extern crate alloc;
    
    use alloc::vec;
    use alloc::vec::Vec;
    use alloy_sol_types::sol;
    use stylus_sdk::{
        alloy_primitives::{Address, U256},
        prelude::*,
        storage::{StorageAddress, StorageMap, StorageBool},
    };

    // Events and errors
    sol! {
        event ChainAdded(uint256 indexed chainId, uint256 timestamp);
        event TokenAdded(address indexed token, uint256 timestamp);
        event IntentValidated(
            address indexed user,
            address indexed token,
            uint256 amount,
            uint256 destinationChain
        );
        
        error Unauthorized();
        error InvalidAddress();
        error InvalidAmount();
        error UnsupportedChain();
        error UnsupportedToken();
    }

    /// Error types for IntentValidator
    #[derive(SolidityError)]
    pub enum IntentValidatorError {
        Unauthorized(Unauthorized),
        InvalidAddress(InvalidAddress),
        InvalidAmount(InvalidAmount),
        UnsupportedChain(UnsupportedChain),
        UnsupportedToken(UnsupportedToken),
    }

    #[entrypoint]
    #[storage]
    pub struct IntentValidator {
        owner: StorageAddress,
        supported_chains: StorageMap<U256, StorageBool>,
        supported_tokens: StorageMap<Address, StorageBool>,
    }

    #[public]
    impl IntentValidator {
        pub fn init(&mut self) -> Result<(), IntentValidatorError> {
            let owner_addr = self.vm().msg_sender();
            self.owner.set(owner_addr);
            Ok(())
        }

        pub fn add_supported_chain(&mut self, chain_id: U256) -> Result<(), IntentValidatorError> {
            if self.vm().msg_sender() != self.owner.get() {
                return Err(IntentValidatorError::Unauthorized(Unauthorized {}));
            }
            
            if chain_id == U256::ZERO {
                return Err(IntentValidatorError::InvalidAmount(InvalidAmount {}));
            }

            self.supported_chains.setter(chain_id).set(true);
            
            self.vm().log(ChainAdded {
                chainId: chain_id,
                timestamp: U256::from(self.vm().block_timestamp()),
            });

            Ok(())
        }

        pub fn add_supported_token(&mut self, token: Address) -> Result<(), IntentValidatorError> {
            if self.vm().msg_sender() != self.owner.get() {
                return Err(IntentValidatorError::Unauthorized(Unauthorized {}));
            }
            
            if token == Address::ZERO {
                return Err(IntentValidatorError::InvalidAddress(InvalidAddress {}));
            }

            self.supported_tokens.setter(token).set(true);
            
            self.vm().log(TokenAdded {
                token,
                timestamp: U256::from(self.vm().block_timestamp()),
            });

            Ok(())
        }

        pub fn is_chain_supported(&self, chain_id: U256) -> bool {
            self.supported_chains.get(chain_id)
        }

        pub fn is_token_supported(&self, token: Address) -> bool {
            self.supported_tokens.get(token)
        }

        pub fn owner(&self) -> Address {
            self.owner.get()
        }

        pub fn validate_intent(
            &self,
            user: Address,
            token: Address,
            amount: U256,
            destination_chain: U256,
            _spender: Address,
        ) -> Result<bool, IntentValidatorError> {
            if amount == U256::ZERO {
                return Err(IntentValidatorError::InvalidAmount(InvalidAmount {}));
            }

            if user == Address::ZERO || token == Address::ZERO {
                return Err(IntentValidatorError::InvalidAddress(InvalidAddress {}));
            }

            if !self.supported_chains.get(destination_chain) {
                return Err(IntentValidatorError::UnsupportedChain(UnsupportedChain {}));
            }

            if !self.supported_tokens.get(token) {
                return Err(IntentValidatorError::UnsupportedToken(UnsupportedToken {}));
            }

            self.vm().log(IntentValidated {
                user,
                token,
                amount,
                destinationChain: destination_chain,
            });

            Ok(true)
        }
    }
}
