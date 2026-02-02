#!/bin/bash
# Deploy contracts to local Anvil and update webapp addresses
# Usage: ./scripts/deploy-local.sh
#
# Prerequisites:
#   - Run 'npm run anvil' in another terminal first

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$CONTRACTS_DIR")"
CONTRACTS_TS="$PROJECT_ROOT/src/constants/contracts.ts"

source "$SCRIPT_DIR/local-config.sh"

echo -e "${YELLOW}=== Tokamak DAO v2 - Local Deployment ===${NC}"
echo -e "RPC URL: ${CYAN}$LOCAL_RPC_URL${NC}"

# Check if anvil is running
echo -e "${YELLOW}Checking anvil connection...${NC}"
if ! cast chain-id --rpc-url "$LOCAL_RPC_URL" &>/dev/null; then
    echo -e "${RED}Error: Cannot connect to anvil at $LOCAL_RPC_URL${NC}"
    echo -e "Please start anvil first:"
    echo -e "  ${CYAN}npm run anvil${NC}"
    exit 1
fi

CHAIN_ID=$(cast chain-id --rpc-url "$LOCAL_RPC_URL")
echo -e "Connected to chain ID: ${GREEN}$CHAIN_ID${NC}"

if [ "$CHAIN_ID" != "$LOCAL_CHAIN_ID" ]; then
    echo -e "${RED}Warning: Chain ID is not $LOCAL_CHAIN_ID (local). Got: $CHAIN_ID${NC}"
    echo "Are you sure this is a local network? (Ctrl+C to cancel, Enter to continue)"
    read -r
fi

# Build contracts
echo -e "${YELLOW}Building contracts...${NC}"
cd "$CONTRACTS_DIR"
forge build --quiet

# Deploy to local
echo -e "${YELLOW}Deploying contracts...${NC}"
OUTPUT=$(forge script script/Deploy.s.sol:DeployLocalScript \
    --rpc-url "$LOCAL_RPC_URL" \
    --private-key "$DEPLOYER_KEY" \
    --broadcast \
    -vvv 2>&1)

echo "$OUTPUT"

# Parse addresses from output
parse_address() {
    echo "$OUTPUT" | grep "$1" | grep -o "0x[a-fA-F0-9]\{40\}" | head -1
}

TON=$(parse_address "MockTON deployed at")
VTON=$(parse_address "vTON deployed at")
DELEGATE_REGISTRY=$(parse_address "DelegateRegistry deployed at")
TIMELOCK=$(parse_address "Timelock deployed at")
DAO_GOVERNOR=$(parse_address "DAOGovernor deployed at")
SECURITY_COUNCIL=$(parse_address "SecurityCouncil deployed at")
FAUCET=$(parse_address "VTONFaucet deployed at")
# Use grep -v to exclude VTONFaucet line when matching TONFaucet
TON_FAUCET=$(echo "$OUTPUT" | grep -v "VTONFaucet" | grep "TONFaucet deployed at" | grep -o "0x[a-fA-F0-9]\{40\}" | head -1)

# Verify we got all addresses
if [ -z "$VTON" ] || [ -z "$DELEGATE_REGISTRY" ] || [ -z "$DAO_GOVERNOR" ]; then
    echo -e "${RED}Error: Failed to parse contract addresses from deployment output${NC}"
    exit 1
fi

echo -e "\n${GREEN}=== Deployed Addresses ===${NC}"
echo "MockTON:          $TON"
echo "vTON:             $VTON"
echo "DelegateRegistry: $DELEGATE_REGISTRY"
echo "Timelock:         $TIMELOCK"
echo "DAOGovernor:      $DAO_GOVERNOR"
echo "SecurityCouncil:  $SECURITY_COUNCIL"
echo "VTONFaucet:       $FAUCET"
echo "TONFaucet:        $TON_FAUCET"

# Update contracts.ts
echo -e "\n${YELLOW}Updating webapp contract addresses...${NC}"

if [ ! -f "$CONTRACTS_TS" ]; then
    echo -e "${RED}Error: $CONTRACTS_TS not found${NC}"
    exit 1
fi

TMP_FILE=$(mktemp)

awk -v ton="$TON" \
    -v vton="$VTON" \
    -v registry="$DELEGATE_REGISTRY" \
    -v governor="$DAO_GOVERNOR" \
    -v council="$SECURITY_COUNCIL" \
    -v timelock="$TIMELOCK" \
    -v faucet="$FAUCET" \
    -v tonFaucet="$TON_FAUCET" '
BEGIN { in_localhost = 0 }
/\/\/ Localhost/ { in_localhost = 1 }
/1337:/ && in_localhost { in_block = 1 }
in_block && /ton:/ && !/vton:/ { gsub(/ZERO_ADDRESS|"0x[a-fA-F0-9]+"/, "\"" ton "\"") }
in_block && /vton:/ { gsub(/ZERO_ADDRESS|"0x[a-fA-F0-9]+"/, "\"" vton "\"") }
in_block && /delegateRegistry:/ { gsub(/ZERO_ADDRESS|"0x[a-fA-F0-9]+"/, "\"" registry "\"") }
in_block && /daoGovernor:/ { gsub(/ZERO_ADDRESS|"0x[a-fA-F0-9]+"/, "\"" governor "\"") }
in_block && /securityCouncil:/ { gsub(/ZERO_ADDRESS|"0x[a-fA-F0-9]+"/, "\"" council "\"") }
in_block && /timelock:/ { gsub(/ZERO_ADDRESS|"0x[a-fA-F0-9]+"/, "\"" timelock "\"") }
in_block && /faucet:/ && !/tonFaucet:/ { gsub(/ZERO_ADDRESS|"0x[a-fA-F0-9]+"/, "\"" faucet "\"") }
in_block && /tonFaucet:/ { gsub(/ZERO_ADDRESS|"0x[a-fA-F0-9]+"/, "\"" tonFaucet "\"") }
in_block && /},/ { in_block = 0; in_localhost = 0 }
{ print }
' "$CONTRACTS_TS" > "$TMP_FILE"

mv "$TMP_FILE" "$CONTRACTS_TS"

echo -e "\n${GREEN}=== Deployment Complete ===${NC}"
echo -e "Webapp addresses updated in: ${YELLOW}src/constants/contracts.ts${NC}"
echo ""
echo -e "${CYAN}=== Next Steps ===${NC}"
echo "Run the webapp:"
echo -e "  ${CYAN}npm run dev${NC}"
echo ""
echo -e "${CYAN}=== Useful Commands ===${NC}"
echo "Skip 7 days (for Timelock/voting tests):"
echo -e "  ${CYAN}cast rpc anvil_increaseTime 604800 --rpc-url $LOCAL_RPC_URL${NC}"
echo -e "  ${CYAN}cast rpc anvil_mine 1 --rpc-url $LOCAL_RPC_URL${NC}"
