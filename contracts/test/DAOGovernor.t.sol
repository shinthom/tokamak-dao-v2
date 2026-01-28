// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test, console } from "forge-std/Test.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { vTON } from "../src/token/vTON.sol";
import { DelegateRegistry } from "../src/governance/DelegateRegistry.sol";
import { DAOGovernor } from "../src/governance/DAOGovernor.sol";
import { Timelock } from "../src/governance/Timelock.sol";
import { IDAOGovernor } from "../src/interfaces/IDAOGovernor.sol";

/// @notice Mock TON token for testing
contract MockTON is ERC20 {
    constructor() ERC20("Tokamak Network Token", "TON") {
        _mint(msg.sender, 1_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract DAOGovernorTest is Test {
    MockTON public ton;
    vTON public vton;
    DelegateRegistry public registry;
    Timelock public timelock;
    DAOGovernor public governor;

    address public owner;
    address public delegate1;
    address public user1;
    address public user2;

    uint256 public constant INITIAL_BALANCE = 100_000 ether;
    uint256 public constant PROPOSAL_COST = 100 ether;

    function setUp() public {
        owner = makeAddr("owner");
        delegate1 = makeAddr("delegate1");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        // Deploy contracts
        vm.startPrank(owner);

        ton = new MockTON();
        vton = new vTON(owner);
        registry = new DelegateRegistry(address(vton), owner);
        timelock = new Timelock(owner, 7 days);

        governor = new DAOGovernor(
            address(ton), address(vton), address(registry), address(timelock), owner
        );

        // Setup
        vton.setMinter(owner, true);
        vton.mint(user1, INITIAL_BALANCE);
        vton.mint(user2, INITIAL_BALANCE);

        timelock.setGovernor(address(governor));

        vm.stopPrank();

        // Setup approvals
        vm.prank(user1);
        ton.approve(address(governor), type(uint256).max);

        vm.prank(user1);
        vton.approve(address(registry), type(uint256).max);

        vm.prank(user2);
        vton.approve(address(registry), type(uint256).max);

        // Give user1 some TON for proposal creation
        vm.prank(owner);
        ton.transfer(user1, 1000 ether);
    }

    /*//////////////////////////////////////////////////////////////
                            DEPLOYMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Deployment() public view {
        assertEq(address(governor.ton()), address(ton));
        assertEq(address(governor.vTON()), address(vton));
        assertEq(address(governor.delegateRegistry()), address(registry));
        assertEq(governor.timelock(), address(timelock));
        assertEq(governor.proposalCreationCost(), PROPOSAL_COST);
        assertEq(governor.quorum(), 400); // 4%
    }

    /*//////////////////////////////////////////////////////////////
                           PROPOSAL CREATION
    //////////////////////////////////////////////////////////////*/

    function test_CreateProposal() public {
        // Register as delegate (required to interact with governance)
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        address[] memory targets = new address[](1);
        targets[0] = address(governor);

        uint256[] memory values = new uint256[](1);
        values[0] = 0;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        string memory description = "Update quorum to 5%";

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, description);

        assertGt(proposalId, 0);
        assertEq(governor.proposalCount(), 1);

        IDAOGovernor.Proposal memory proposal = governor.getProposal(proposalId);
        assertEq(proposal.proposer, user1);
        assertEq(proposal.targets[0], address(governor));
    }

    function test_CreateProposalBurnsTON() public {
        uint256 balanceBefore = ton.balanceOf(user1);

        address[] memory targets = new address[](1);
        targets[0] = address(governor);

        uint256[] memory values = new uint256[](1);
        values[0] = 0;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        governor.propose(targets, values, calldatas, "Test");

        // TON should be burned (sent to 0xdead)
        assertEq(ton.balanceOf(user1), balanceBefore - PROPOSAL_COST);
        assertEq(ton.balanceOf(address(0xdead)), PROPOSAL_COST);
    }

    /*//////////////////////////////////////////////////////////////
                               VOTING
    //////////////////////////////////////////////////////////////*/

    function test_CastVote() public {
        // Setup: Register delegate and delegate vTON
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);

        // Wait for delegation period
        vm.warp(block.timestamp + 8 days);

        // Create proposal
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test");

        // Move to voting period
        vm.roll(block.number + governor.votingDelay() + 1);

        // Cast vote as delegate
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);

        assertTrue(governor.hasVoted(proposalId, delegate1));

        IDAOGovernor.Proposal memory proposal = governor.getProposal(proposalId);
        assertGt(proposal.forVotes, 0);
    }

    function test_CastVoteRevertsIfNotDelegate() public {
        // Create proposal
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test");

        // Move to voting period
        vm.roll(block.number + governor.votingDelay() + 1);

        // Try to vote as non-delegate
        vm.prank(user1);
        vm.expectRevert(DAOGovernor.NotDelegate.selector);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);
    }

    function test_CastVoteWithReason() public {
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);

        vm.warp(block.timestamp + 8 days);

        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test");

        vm.roll(block.number + governor.votingDelay() + 1);

        vm.prank(delegate1);
        governor.castVoteWithReason(proposalId, IDAOGovernor.VoteType.For, "I support this");

        assertTrue(governor.hasVoted(proposalId, delegate1));
    }

    /*//////////////////////////////////////////////////////////////
                           PROPOSAL STATES
    //////////////////////////////////////////////////////////////*/

    function test_ProposalStatePending() public {
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test");

        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Pending));
    }

    function test_ProposalStateActive() public {
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test");

        vm.roll(block.number + governor.votingDelay() + 1);

        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Active));
    }

    function test_CancelProposal() public {
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test");

        vm.prank(user1);
        governor.cancel(proposalId);

        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Canceled));
    }

    function test_CancelProposalRevertsIfNotProposer() public {
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test");

        vm.prank(user2);
        vm.expectRevert(DAOGovernor.NotProposer.selector);
        governor.cancel(proposalId);
    }

    /*//////////////////////////////////////////////////////////////
                           ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function test_SetQuorum() public {
        vm.prank(owner);
        governor.setQuorum(500);

        assertEq(governor.quorum(), 500);
    }

    function test_SetProposalCreationCost() public {
        vm.prank(owner);
        governor.setProposalCreationCost(200 ether);

        assertEq(governor.proposalCreationCost(), 200 ether);
    }

    function test_SetVotingDelay() public {
        vm.prank(owner);
        governor.setVotingDelay(14_400);

        assertEq(governor.votingDelay(), 14_400);
    }

    function test_SetVotingPeriod() public {
        vm.prank(owner);
        governor.setVotingPeriod(100_800);

        assertEq(governor.votingPeriod(), 100_800);
    }

    /*//////////////////////////////////////////////////////////////
                           HASH PROPOSAL
    //////////////////////////////////////////////////////////////*/

    function test_HashProposal() public view {
        address[] memory targets = new address[](1);
        targets[0] = address(governor);

        uint256[] memory values = new uint256[](1);
        values[0] = 0;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        bytes32 descHash = keccak256(bytes("Test"));

        uint256 hash1 = governor.hashProposal(targets, values, calldatas, descHash);
        uint256 hash2 = governor.hashProposal(targets, values, calldatas, descHash);

        assertEq(hash1, hash2);
    }
}
