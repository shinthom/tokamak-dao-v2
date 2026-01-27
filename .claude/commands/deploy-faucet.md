# Deploy Faucet Only

Deploy only a new Faucet to the existing vTON contract.

## Steps

1. Verify environment variables in `contracts/.env`
2. Confirm VTON_ADDRESS in `contracts/script/DeployFaucet.s.sol` matches the currently deployed vTON address
3. Run `source contracts/.env && cd contracts && forge script script/DeployFaucet.s.sol:DeployAndSetupFaucetScript --rpc-url $RPC_URL_SEPOLIA --broadcast -vvv`
4. Parse deployed VTONFaucet address
5. Update only the Sepolia faucet address in `src/constants/contracts.ts`
6. Output deployment result

## Requirements

- Deployment account must be the vTON owner to grant minter permissions
- Existing vTON address must be correctly set in DeployFaucet.s.sol
