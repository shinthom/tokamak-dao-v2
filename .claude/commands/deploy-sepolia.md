# Deploy to Sepolia

Deploy all contracts to Sepolia testnet and update web app addresses.

## Steps

1. Read `contracts/.env` file to verify PRIVATE_KEY and RPC_URL_SEPOLIA
2. Build contracts with `cd contracts && forge build`
3. Run `source contracts/.env && forge script script/Deploy.s.sol:DeploySepoliaScript --rpc-url $RPC_URL_SEPOLIA --broadcast -vvv`
4. Parse contract addresses from deployment logs:
   - vTON deployed at: 0x...
   - DelegateRegistry deployed at: 0x...
   - Timelock deployed at: 0x...
   - DAOGovernor deployed at: 0x...
   - SecurityCouncil deployed at: 0x...
   - VTONFaucet deployed at: 0x...
5. Update Sepolia (chainId: 11155111) addresses in `src/constants/contracts.ts`
6. Update VTON_ADDRESS constant in `contracts/script/DeployFaucet.s.sol` with new vTON address
7. Output deployment summary

## Requirements

- PRIVATE_KEY and RPC_URL_SEPOLIA must be set in contracts/.env
- Deployment account must have sufficient Sepolia ETH (approximately 0.05 ETH recommended)
