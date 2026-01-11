// Simple Hello World contract to verify Stylus setup
#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

use stylus_sdk::{alloy_primitives::U256, prelude::*, storage::StorageU256};

#[storage]
#[entrypoint]
pub struct Counter {
    count: StorageU256,
}

#[external]
impl Counter {
    pub fn increment(&mut self) {
        let count = self.count.get() + U256::from(1);
        self.count.set(count);
    }

    pub fn get(&self) -> U256 {
        self.count.get()
    }
}
