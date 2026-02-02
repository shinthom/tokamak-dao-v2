#!/bin/bash
# Shared configuration for local development scripts

# Network
export LOCAL_RPC_URL="http://127.0.0.1:8545"
export LOCAL_CHAIN_ID="1337"

# Anvil's default deployer account
export DEPLOYER_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

# Test accounts for local development
export TEST_ACCOUNT_1="0x488f3660FCD32099F2A250633822a6fbF6Eb771B"
export TEST_ACCOUNT_2="0x31b4873B1730D924124A8118bbA84eE5672BE446"

# Colors for output
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export CYAN='\033[0;36m'
export NC='\033[0m'
