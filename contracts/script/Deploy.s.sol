// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { vTON } from "../src/token/vTON.sol";
import { DelegateRegistry } from "../src/governance/DelegateRegistry.sol";
import { DAOGovernor } from "../src/governance/DAOGovernor.sol";
import { SecurityCouncil } from "../src/governance/SecurityCouncil.sol";
import { Timelock } from "../src/governance/Timelock.sol";
import { VTONFaucet } from "../src/test/VTONFaucet.sol";
import { TONFaucet } from "../src/test/TONFaucet.sol";

/// @title Deploy Script for vTON DAO Governance
/// @notice Deploys all governance contracts
/// @dev Run with: forge script script/Deploy.s.sol --rpc-url <rpc> --broadcast
contract DeployScript is Script {
    // Deployment parameters
    address public tonToken; // Existing TON token address
    address public admin; // Initial admin (deployer)
    address public foundationMember; // Foundation member for Security Council
    address[] public externalMembers; // External members for Security Council

    // Deployed contracts
    vTON public vton;
    DelegateRegistry public delegateRegistry;
    Timelock public timelock;
    DAOGovernor public governor;
    SecurityCouncil public securityCouncil;

    function setUp() public {
        // These should be set based on deployment environment
        // For local testing, we'll use placeholder addresses
        admin = vm.envOr("ADMIN_ADDRESS", address(0));
        tonToken = vm.envOr("TON_TOKEN_ADDRESS", address(0));
        foundationMember = vm.envOr("FOUNDATION_MEMBER", address(0));

        // External members can be passed as comma-separated addresses
        string memory externalMembersStr = vm.envOr("EXTERNAL_MEMBERS", string(""));
        if (bytes(externalMembersStr).length > 0) {
            // Parse external members (simplified - in production use proper parsing)
        }
    }

    function run() public {
        // Get deployer
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deployer:", deployer);
        console.log("TON Token:", tonToken);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy vTON token
        vton = new vTON(deployer);
        console.log("vTON deployed at:", address(vton));

        // 2. Deploy DelegateRegistry
        delegateRegistry = new DelegateRegistry(address(vton), deployer);
        console.log("DelegateRegistry deployed at:", address(delegateRegistry));

        // 3. Deploy Timelock (7 days delay)
        timelock = new Timelock(deployer, 7 days);
        console.log("Timelock deployed at:", address(timelock));

        // 4. Deploy DAOGovernor
        governor = new DAOGovernor(
            tonToken, address(vton), address(delegateRegistry), address(timelock), deployer
        );
        console.log("DAOGovernor deployed at:", address(governor));

        // 5. Deploy SecurityCouncil
        address[] memory extMembers = new address[](2);
        extMembers[0] = externalMembers.length > 0 ? externalMembers[0] : _deriveAddr("external1");
        extMembers[1] = externalMembers.length > 1 ? externalMembers[1] : _deriveAddr("external2");

        address foundationAddr = foundationMember != address(0) ? foundationMember : deployer;

        securityCouncil = new SecurityCouncil(
            foundationAddr,
            extMembers,
            address(governor),
            address(timelock),
            address(vton) // Protocol target for pause
        );
        console.log("SecurityCouncil deployed at:", address(securityCouncil));

        // 6. Configure Timelock
        timelock.setGovernor(address(governor));
        timelock.setSecurityCouncil(address(securityCouncil));
        console.log("Timelock configured");

        // 7. Configure DelegateRegistry to allow governor to burn vTON
        delegateRegistry.setGovernor(address(governor));
        console.log("DelegateRegistry governor set");

        // 8. Set SecurityCouncil as proposal guardian (required for cancel functionality)
        governor.setProposalGuardian(address(securityCouncil));
        console.log("SecurityCouncil set as proposalGuardian");

        // 8. Transfer ownership to DAO (after setup)
        // Note: In production, you might want to keep admin control initially
        // and transfer ownership through a governance proposal later

        vm.stopBroadcast();

        // Log summary
        console.log("\n=== Deployment Summary ===");
        console.log("vTON:", address(vton));
        console.log("DelegateRegistry:", address(delegateRegistry));
        console.log("Timelock:", address(timelock));
        console.log("DAOGovernor:", address(governor));
        console.log("SecurityCouncil:", address(securityCouncil));
    }

    function _deriveAddr(string memory name) internal pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(name)))));
    }
}

/// @title Deploy Script for Local Testing
/// @notice Deploys all contracts with mock TON for local testing
contract DeployLocalScript is Script {
    // Test accounts for local development
    address constant TEST_ACCOUNT_1 = 0x488f3660FCD32099F2A250633822a6fbF6Eb771B;
    address constant TEST_ACCOUNT_2 = 0x31b4873B1730D924124A8118bbA84eE5672BE446;

    function run() public {
        vm.startBroadcast();

        address deployer = msg.sender;

        // Deploy mock TON
        MockTON ton = new MockTON();
        console.log("MockTON deployed at:", address(ton));

        // Deploy vTON
        vTON vton = new vTON(deployer);
        console.log("vTON deployed at:", address(vton));

        // Deploy DelegateRegistry
        DelegateRegistry delegateRegistry = new DelegateRegistry(address(vton), deployer);
        console.log("DelegateRegistry deployed at:", address(delegateRegistry));

        // Deploy Timelock (1 hour delay for local testing)
        Timelock timelock = new Timelock(deployer, 1 hours);
        console.log("Timelock deployed at:", address(timelock));

        // Deploy DAOGovernor
        DAOGovernor governor = new DAOGovernor(
            address(ton), address(vton), address(delegateRegistry), address(timelock), deployer
        );
        console.log("DAOGovernor deployed at:", address(governor));

        // Deploy SecurityCouncil
        address[] memory extMembers = new address[](1);
        extMembers[0] = TEST_ACCOUNT_2;

        SecurityCouncil securityCouncil = new SecurityCouncil(
            TEST_ACCOUNT_1, extMembers, address(governor), address(timelock), address(vton)
        );
        console.log("SecurityCouncil deployed at:", address(securityCouncil));

        // Configure
        timelock.setGovernor(address(governor));
        timelock.setSecurityCouncil(address(securityCouncil));

        // Configure DelegateRegistry to allow governor to burn vTON
        delegateRegistry.setGovernor(address(governor));
        console.log("DelegateRegistry governor set");

        // Set SecurityCouncil as proposal guardian (required for cancel functionality)
        governor.setProposalGuardian(address(securityCouncil));

        // Set voting delay & period to 1 hour (~300 blocks at 12s/block) for local testing
        governor.setVotingDelay(300);
        governor.setVotingPeriod(300);

        // Set timelock delay to 1 hour for local testing
        governor.setTimelockDelay(1 hours);

        // Setup vTON minter
        vton.setMinter(deployer, true);

        // Deploy VTONFaucet
        VTONFaucet faucet = new VTONFaucet(address(vton), deployer);
        console.log("VTONFaucet deployed at:", address(faucet));

        // Deploy TONFaucet
        TONFaucet tonFaucet = new TONFaucet(address(ton), deployer);
        console.log("TONFaucet deployed at:", address(tonFaucet));

        // Grant minter permission to faucet
        vton.setMinter(address(faucet), true);

        // Mint tokens to test accounts
        uint256 testAmount = 10_000 ether;
        vton.mint(TEST_ACCOUNT_1, testAmount);
        vton.mint(TEST_ACCOUNT_2, testAmount);
        ton.mint(TEST_ACCOUNT_1, testAmount);
        ton.mint(TEST_ACCOUNT_2, testAmount);
        console.log("Minted", testAmount / 1 ether, "vTON and TON to test accounts");

        vm.stopBroadcast();

        // Log summary
        console.log("\n=== Local Deployment Summary ===");
        console.log("MockTON:", address(ton));
        console.log("vTON:", address(vton));
        console.log("DelegateRegistry:", address(delegateRegistry));
        console.log("Timelock:", address(timelock));
        console.log("DAOGovernor:", address(governor));
        console.log("SecurityCouncil:", address(securityCouncil));
        console.log("VTONFaucet:", address(faucet));
        console.log("TONFaucet:", address(tonFaucet));
    }
}

/// @notice Mock TON token for local testing
contract MockTON {
    string public name = "Tokamak Network Token";
    string public symbol = "TON";
    uint8 public decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor() {
        _mint(msg.sender, 1_000_000 ether);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @title Deploy Script for Sepolia Testnet
/// @notice Deploys all contracts including MockTON for testing
/// @dev Run with: forge script script/Deploy.s.sol:DeploySepoliaScript --rpc-url $RPC_URL_SEPOLIA --broadcast -vvv
contract DeploySepoliaScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy MockTON
        MockTON ton = new MockTON();
        console.log("MockTON deployed at:", address(ton));

        // 2. Deploy vTON
        vTON vton = new vTON(deployer);
        console.log("vTON deployed at:", address(vton));

        // 3. Deploy DelegateRegistry
        DelegateRegistry delegateRegistry = new DelegateRegistry(address(vton), deployer);
        console.log("DelegateRegistry deployed at:", address(delegateRegistry));

        // 4. Deploy Timelock (7 days)
        Timelock timelock = new Timelock(deployer, 7 days);
        console.log("Timelock deployed at:", address(timelock));

        // 5. Deploy DAOGovernor
        DAOGovernor governor = new DAOGovernor(
            address(ton), address(vton), address(delegateRegistry), address(timelock), deployer
        );
        console.log("DAOGovernor deployed at:", address(governor));

        // 6. Deploy SecurityCouncil with real members
        // Foundation member: deployer
        // External members: deployer + 0x488f3660FCD32099F2A250633822a6fbF6Eb771B
        address[] memory extMembers = new address[](2);
        extMembers[0] = deployer;
        extMembers[1] = 0x488f3660FCD32099F2A250633822a6fbF6Eb771B;

        SecurityCouncil securityCouncil = new SecurityCouncil(
            deployer, extMembers, address(governor), address(timelock), address(vton)
        );
        console.log("SecurityCouncil deployed at:", address(securityCouncil));

        // 7. Configure Timelock
        timelock.setGovernor(address(governor));
        timelock.setSecurityCouncil(address(securityCouncil));

        // 8. Configure DelegateRegistry to allow governor to burn vTON
        delegateRegistry.setGovernor(address(governor));
        console.log("DelegateRegistry governor set");

        // 9. Set SecurityCouncil as proposal guardian (required for cancel functionality)
        governor.setProposalGuardian(address(securityCouncil));
        console.log("SecurityCouncil set as proposalGuardian");

        // 10. Deploy VTONFaucet
        VTONFaucet faucet = new VTONFaucet(address(vton), deployer);
        console.log("VTONFaucet deployed at:", address(faucet));

        // 11. Deploy TONFaucet
        TONFaucet tonFaucet = new TONFaucet(address(ton), deployer);
        console.log("TONFaucet deployed at:", address(tonFaucet));

        // 12. Setup vTON minters
        vton.setMinter(deployer, true);
        vton.setMinter(address(faucet), true);

        vm.stopBroadcast();

        // Log summary
        console.log("\n=== Sepolia Deployment Summary ===");
        console.log("MockTON:", address(ton));
        console.log("vTON:", address(vton));
        console.log("DelegateRegistry:", address(delegateRegistry));
        console.log("Timelock:", address(timelock));
        console.log("DAOGovernor:", address(governor));
        console.log("SecurityCouncil:", address(securityCouncil));
        console.log("VTONFaucet:", address(faucet));
        console.log("TONFaucet:", address(tonFaucet));
    }
}
