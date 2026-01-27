// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { VTONFaucet } from "../src/test/VTONFaucet.sol";
import { vTON } from "../src/token/vTON.sol";

/// @title Deploy Script for VTONFaucet
/// @notice Deploys the VTONFaucet contract for testnet
/// @dev Run with: forge script script/DeployFaucet.s.sol:DeployFaucetScript --rpc-url $RPC_URL_SEPOLIA --broadcast -vvv
contract DeployFaucetScript is Script {
    // Existing vTON address on Sepolia
    address constant VTON_ADDRESS = 0x5FF09B812d78e07183F0880Ca5E07faB7bc6EDD1;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deployer:", deployer);
        console.log("vTON address:", VTON_ADDRESS);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy VTONFaucet
        VTONFaucet faucet = new VTONFaucet(VTON_ADDRESS, deployer);
        console.log("VTONFaucet deployed at:", address(faucet));

        vm.stopBroadcast();

        // Log important information
        console.log("\n=== Deployment Summary ===");
        console.log("VTONFaucet:", address(faucet));
        console.log("\n=== IMPORTANT: Post-deployment Action Required ===");
        console.log("The vTON owner must grant minter permission to the faucet.");
        console.log("Faucet address to add as minter:", address(faucet));
        console.log("\nRun: vTON.setMinter(<faucet_address>, true)");
    }
}

/// @title Deploy and Setup Faucet Script
/// @notice Deploys the faucet and sets up minter permission (requires vTON owner key)
/// @dev Run with: forge script script/DeployFaucet.s.sol:DeployAndSetupFaucetScript --rpc-url $RPC_URL_SEPOLIA --broadcast -vvv
contract DeployAndSetupFaucetScript is Script {
    // Existing vTON address on Sepolia
    address constant VTON_ADDRESS = 0x5FF09B812d78e07183F0880Ca5E07faB7bc6EDD1;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deployer:", deployer);
        console.log("vTON address:", VTON_ADDRESS);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy VTONFaucet
        VTONFaucet faucet = new VTONFaucet(VTON_ADDRESS, deployer);
        console.log("VTONFaucet deployed at:", address(faucet));

        // 2. Grant minter permission to faucet
        // Note: This requires the deployer to be the vTON owner
        vTON vton = vTON(VTON_ADDRESS);
        vton.setMinter(address(faucet), true);
        console.log("Faucet granted minter permission");

        vm.stopBroadcast();

        // Log summary
        console.log("\n=== Deployment Summary ===");
        console.log("VTONFaucet:", address(faucet));
        console.log("Minter permission: granted");
    }
}
