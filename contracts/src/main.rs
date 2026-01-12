//! Binary for exporting ABI
//! 
//! This is required by cargo-stylus for constructor detection.

#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]

#[cfg(not(any(test, feature = "export-abi")))]
#[no_mangle]
pub extern "C" fn main() {}

#[cfg(feature = "export-abi")]
fn main() {
    // Export ABI using stylus-sdk's built-in mechanism
    use stylus_sdk::prelude::*;
    println!("ABI export for Swoosh contracts");
}
