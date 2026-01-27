# Verify Contracts on Etherscan

Verify deployed contracts on Etherscan.

## Steps

1. Read current Sepolia contract addresses from `src/constants/contracts.ts`
2. Verify ETHERSCAN_API_KEY in `contracts/.env`
3. Run forge verify-contract for each contract:

```bash
cd contracts
source .env

# vTON
forge verify-contract <vton_address> src/token/vTON.sol:vTON --chain sepolia --etherscan-api-key $ETHERSCAN_API_KEY

# DelegateRegistry
forge verify-contract <registry_address> src/governance/DelegateRegistry.sol:DelegateRegistry --chain sepolia --etherscan-api-key $ETHERSCAN_API_KEY

# Same for remaining contracts...
```

4. Verify and output each verification result

## Requirements

- ETHERSCAN_API_KEY must be set in contracts/.env
- Contracts with constructor arguments require --constructor-args option
