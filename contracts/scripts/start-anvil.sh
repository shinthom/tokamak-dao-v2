#!/bin/bash
# Start anvil with funded test accounts
# Usage: ./scripts/start-anvil.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/local-config.sh"

echo -e "${YELLOW}=== Starting Anvil ===${NC}"

# Start anvil in background
anvil --chain-id "$LOCAL_CHAIN_ID" &
ANVIL_PID=$!

# Wait for anvil to start
sleep 2

# Check if anvil is running
if ! cast chain-id --rpc-url "$LOCAL_RPC_URL" &>/dev/null; then
    echo "Failed to start anvil"
    exit 1
fi

echo -e "${GREEN}Anvil started (PID: $ANVIL_PID)${NC}"

# Fund test accounts
echo -e "${YELLOW}Funding test accounts...${NC}"
cast send "$TEST_ACCOUNT_1" --value 1000ether --private-key "$DEPLOYER_KEY" --rpc-url "$LOCAL_RPC_URL" > /dev/null 2>&1
cast send "$TEST_ACCOUNT_2" --value 1000ether --private-key "$DEPLOYER_KEY" --rpc-url "$LOCAL_RPC_URL" > /dev/null 2>&1

echo -e "${GREEN}Funded test accounts with 1000 ETH each${NC}"
echo -e "  - $TEST_ACCOUNT_1"
echo -e "  - $TEST_ACCOUNT_2"
echo ""
echo -e "${CYAN}Anvil is running. Press Ctrl+C to stop.${NC}"

# Bring anvil to foreground
wait $ANVIL_PID
