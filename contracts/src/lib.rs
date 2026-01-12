//! Swoosh Smart Contracts
//! 
//! Core contracts for AI-powered cross-chain intent solver on Arbitrum Stylus
//! 
//! Each contract is designed as a standalone module that can be compiled independently.
//! To compile a specific contract, use the binary target in Cargo.toml.

// Remove the entrypoint declarations from module declarations
// Each contract will have its own binary entrypoint

#[cfg(not(target_arch = "wasm32"))]
pub mod intent_validator;

#[cfg(not(target_arch = "wasm32"))]
pub mod route_executor;

#[cfg(not(target_arch = "wasm32"))]
pub mod settlement_verifier;
