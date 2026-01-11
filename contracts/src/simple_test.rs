//! Simple test contract to verify Stylus setup

#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
#![cfg_attr(feature = "contract-client-gen", allow(unused_imports))]

extern crate alloc;

use stylus_sdk::{
    alloy_primitives::{Address, U256},
    prelude::*,
    storage::{StorageAddress, StorageU256},
};

#[storage]
#[entrypoint]
pub struct SimpleTest {
    owner: StorageAddress,
    counter: StorageU256,
}

#[public]
impl SimpleTest {
    pub fn init(&mut self) {
        self.owner.set(self.vm().msg_sender());
        self.counter.set(U256::from(0));
    }

    pub fn increment(&mut self) {
        let current = self.counter.get();
        self.counter.set(current + U256::from(1));
    }

    pub fn get_counter(&self) -> U256 {
        self.counter.get()
    }

    pub fn get_owner(&self) -> Address {
        self.owner.get()
    }
}
