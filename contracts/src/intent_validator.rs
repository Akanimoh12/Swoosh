//! IntentValidator Contract
//! 
//! Validates user intents before execution, ensuring all parameters are valid
//! and that users have necessary approvals and balances.

#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
#![cfg_attr(feature = "contract-client-gen", allow(unused_imports))]

extern crate alloc;

use alloy_sol_types::sol;
use stylus_sdk::{
    alloy_primitives::{Address, U256},
    prelude::*,
    storage::{StorageAddress, StorageMap, StorageBool},
};

// ERC20 interface for checking allowances
sol_interface! {
    interface IERC20 {
        function allowance(address owner, address spender) external view returns (uint256);
        function balanceOf(address account) external view returns (uint256);
    }
}

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
    error InsufficientBalance();
    error InsufficientAllowance();
}

/// Error types for IntentValidator
#[derive(SolidityError)]
pub enum IntentValidatorError {
    Unauthorized(Unauthorized),
    InvalidAddress(InvalidAddress),
    InvalidAmount(InvalidAmount),
    UnsupportedChain(UnsupportedChain),
    UnsupportedToken(UnsupportedToken),
    InsufficientBalance(InsufficientBalance),
    InsufficientAllowance(InsufficientAllowance),
}

#[storage]
#[entrypoint]
pub struct IntentValidator {
    /// Contract owner address
    owner: StorageAddress,
    /// Mapping of supported chain IDs
    supported_chains: StorageMap<U256, StorageBool>,
    /// Mapping of supported token addresses
    supported_tokens: StorageMap<Address, StorageBool>,
}

#[public]
impl IntentValidator {
    /// Initialize the contract with owner
    pub fn init(&mut self) -> Result<(), IntentValidatorError> {
        let owner_addr = self.vm().msg_sender();
        self.owner.set(owner_addr);
        Ok(())
    }

    /// Validate a complete intent structure
    /// 
    /// Checks:
    /// - Amount is greater than zero
    /// - Destination chain is supported
    /// - Token is supported
    /// - User has sufficient balance
    /// - User has approved sufficient allowance
    pub fn validate_intent(
        &self,
        user: Address,
        token: Address,
        amount: U256,
        destination_chain: U256,
        spender: Address,
    ) -> Result<bool, IntentValidatorError> {
        // Validate amount is greater than zero
        if amount == U256::ZERO {
            return Err(IntentValidatorError::InvalidAmount(InvalidAmount {}));
        }

        // Validate addresses are non-zero
        if user == Address::ZERO || token == Address::ZERO || spender == Address::ZERO {
            return Err(IntentValidatorError::InvalidAddress(InvalidAddress {}));
        }

        // Check if chain is supported
        if !self.is_chain_supported(destination_chain) {
            return Err(IntentValidatorError::UnsupportedChain(UnsupportedChain {}));
        }

        // Check if token is supported
        if !self.is_token_supported(token) {
            return Err(IntentValidatorError::UnsupportedToken(UnsupportedToken {}));
        }

        // Check user balance
        let token_contract = IERC20::new(token);
        let balance = token_contract.balance_of(&self.vm(), Call::new(), user)?;
        if balance < amount {
            return Err(IntentValidatorError::InsufficientBalance(InsufficientBalance {}));
        }

        // Check allowance
        let allowance = token_contract.allowance(&self.vm(), Call::new(), user, spender)?;
        if allowance < amount {
            return Err(IntentValidatorError::InsufficientAllowance(InsufficientAllowance {}));
        }

        // Emit validation event
        self.vm().log(IntentValidated {
            user,
            token,
            amount,
            destinationChain: destination_chain,
        });

        Ok(true)
    }

    /// Check ERC20 token allowance
    pub fn check_allowance(
        &self,
        user: Address,
        token: Address,
        spender: Address,
    ) -> Result<U256, IntentValidatorError> {
        if user == Address::ZERO || token == Address::ZERO || spender == Address::ZERO {
            return Err(IntentValidatorError::InvalidAddress(InvalidAddress {}));
        }

        let token_contract = IERC20::new(token);
        let allowance = token_contract.allowance(&self.vm(), Call::new(), user, spender)?;
        
        Ok(allowance)
    }

    /// Add a supported destination chain (admin only)
    pub fn add_supported_chain(&mut self, chain_id: U256) -> Result<(), IntentValidatorError> {
        self.only_owner()?;
        
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

    /// Add a supported token (admin only)
    pub fn add_supported_token(&mut self, token: Address) -> Result<(), IntentValidatorError> {
        self.only_owner()?;
        
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

    /// Check if a chain is supported
    pub fn is_chain_supported(&self, chain_id: U256) -> bool {
        self.supported_chains.get(chain_id).into()
    }

    /// Check if a token is supported
    pub fn is_token_supported(&self, token: Address) -> bool {
        self.supported_tokens.get(token).into()
    }

    /// Get contract owner
    pub fn owner(&self) -> Address {
        self.owner.get()
    }

    /// Internal: Check if caller is owner
    fn only_owner(&self) -> Result<(), IntentValidatorError> {
        if self.vm().msg_sender() != self.owner.get() {
            return Err(IntentValidatorError::Unauthorized(Unauthorized {}));
        }
        Ok(())
    }
}
