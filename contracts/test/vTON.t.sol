// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test, console } from "forge-std/Test.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { vTON } from "../src/token/vTON.sol";

contract vTONTest is Test {
    vTON public token;

    address public owner;
    address public minter;
    address public user1;
    address public user2;

    event Minted(address indexed to, uint256 amount);
    event EmissionRatioUpdated(uint256 oldRatio, uint256 newRatio);
    event MinterUpdated(address indexed minter, bool allowed);

    function setUp() public {
        owner = makeAddr("owner");
        minter = makeAddr("minter");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        vm.prank(owner);
        token = new vTON(owner);
    }

    /*//////////////////////////////////////////////////////////////
                            DEPLOYMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Deployment() public view {
        assertEq(token.name(), "Tokamak Network Governance Token");
        assertEq(token.symbol(), "vTON");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), 0);
        assertEq(token.emissionRatio(), 1e18);
        assertEq(token.owner(), owner);
    }

    function test_DeploymentRevertsWithZeroAddress() public {
        // Ownable reverts first with OwnableInvalidOwner
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableInvalidOwner.selector, address(0)));
        new vTON(address(0));
    }

    /*//////////////////////////////////////////////////////////////
                             MINTER TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SetMinter() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit MinterUpdated(minter, true);
        token.setMinter(minter, true);

        assertTrue(token.isMinter(minter));
    }

    function test_SetMinterRevertsIfNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        token.setMinter(minter, true);
    }

    function test_SetMinterRevertsWithZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(vTON.ZeroAddress.selector);
        token.setMinter(address(0), true);
    }

    function test_RemoveMinter() public {
        vm.startPrank(owner);
        token.setMinter(minter, true);
        token.setMinter(minter, false);
        vm.stopPrank();

        assertFalse(token.isMinter(minter));
    }

    /*//////////////////////////////////////////////////////////////
                             MINTING TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Mint() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        uint256 amount = 1000 ether;

        vm.prank(minter);
        vm.expectEmit(true, false, false, true);
        emit Minted(user1, amount);
        token.mint(user1, amount);

        assertEq(token.balanceOf(user1), amount);
        assertEq(token.totalSupply(), amount);
    }

    function test_MintRevertsIfNotMinter() public {
        vm.prank(user1);
        vm.expectRevert(vTON.NotMinter.selector);
        token.mint(user2, 1000 ether);
    }

    function test_MintRevertsWithZeroAddress() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        vm.prank(minter);
        vm.expectRevert(vTON.ZeroAddress.selector);
        token.mint(address(0), 1000 ether);
    }

    function test_MintWithEmissionRatio() public {
        vm.startPrank(owner);
        token.setMinter(minter, true);
        token.setEmissionRatio(0.5e18); // 50%
        vm.stopPrank();

        uint256 amount = 1000 ether;

        vm.prank(minter);
        token.mint(user1, amount);

        // Should receive 50% of requested amount
        assertEq(token.balanceOf(user1), 500 ether);
    }

    function test_MintWithZeroEmissionRatio() public {
        vm.startPrank(owner);
        token.setMinter(minter, true);
        token.setEmissionRatio(0);
        vm.stopPrank();

        vm.prank(minter);
        token.mint(user1, 1000 ether);

        // Should receive nothing
        assertEq(token.balanceOf(user1), 0);
    }

    /*//////////////////////////////////////////////////////////////
                         EMISSION RATIO TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SetEmissionRatio() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit EmissionRatioUpdated(1e18, 0.75e18);
        token.setEmissionRatio(0.75e18);

        assertEq(token.emissionRatio(), 0.75e18);
    }

    function test_SetEmissionRatioRevertsIfExceedsMax() public {
        vm.prank(owner);
        vm.expectRevert(vTON.InvalidEmissionRatio.selector);
        token.setEmissionRatio(1.1e18);
    }

    function test_SetEmissionRatioRevertsIfNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        token.setEmissionRatio(0.5e18);
    }

    /*//////////////////////////////////////////////////////////////
                            TRANSFER TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Transfer() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        vm.prank(minter);
        token.mint(user1, 1000 ether);

        vm.prank(user1);
        token.transfer(user2, 400 ether);

        assertEq(token.balanceOf(user1), 600 ether);
        assertEq(token.balanceOf(user2), 400 ether);
    }

    function test_TransferFrom() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        vm.prank(minter);
        token.mint(user1, 1000 ether);

        vm.prank(user1);
        token.approve(user2, 500 ether);

        vm.prank(user2);
        token.transferFrom(user1, user2, 300 ether);

        assertEq(token.balanceOf(user1), 700 ether);
        assertEq(token.balanceOf(user2), 300 ether);
        assertEq(token.allowance(user1, user2), 200 ether);
    }

    /*//////////////////////////////////////////////////////////////
                          VOTING POWER TESTS
    //////////////////////////////////////////////////////////////*/

    function test_VotingPowerDelegation() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        vm.prank(minter);
        token.mint(user1, 1000 ether);

        // Initially no voting power (must self-delegate)
        assertEq(token.getVotes(user1), 0);

        // Self-delegate
        vm.prank(user1);
        token.delegate(user1);

        assertEq(token.getVotes(user1), 1000 ether);
    }

    function test_VotingPowerDelegationToOther() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        vm.prank(minter);
        token.mint(user1, 1000 ether);

        vm.prank(user1);
        token.delegate(user2);

        assertEq(token.getVotes(user1), 0);
        assertEq(token.getVotes(user2), 1000 ether);
    }

    function test_GetPastVotes() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        vm.prank(minter);
        token.mint(user1, 1000 ether);

        vm.prank(user1);
        token.delegate(user1);

        uint256 blockBefore = block.number;
        vm.roll(block.number + 10);

        assertEq(token.getPastVotes(user1, blockBefore), 1000 ether);
    }

    /*//////////////////////////////////////////////////////////////
                             FUZZ TESTS
    //////////////////////////////////////////////////////////////*/

    function testFuzz_Mint(uint256 amount) public {
        amount = bound(amount, 1, type(uint128).max);

        vm.prank(owner);
        token.setMinter(minter, true);

        vm.prank(minter);
        token.mint(user1, amount);

        assertEq(token.balanceOf(user1), amount);
    }

    function testFuzz_EmissionRatio(uint256 ratio) public {
        ratio = bound(ratio, 0, 1e18);

        vm.prank(owner);
        token.setEmissionRatio(ratio);

        assertEq(token.emissionRatio(), ratio);
    }
}
