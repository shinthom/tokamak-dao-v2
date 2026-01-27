// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test, console } from "forge-std/Test.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { VTONFaucet } from "../src/test/VTONFaucet.sol";
import { vTON } from "../src/token/vTON.sol";

contract VTONFaucetTest is Test {
    VTONFaucet public faucet;
    vTON public token;

    address public owner;
    address public user1;
    address public user2;

    uint256 constant DEFAULT_CLAIM_AMOUNT = 1000 ether;

    event Claimed(address indexed user, uint256 amount, uint256 timestamp);
    event ClaimAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event PauseStatusUpdated(bool paused);

    function setUp() public {
        owner = makeAddr("owner");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        // Deploy vTON
        vm.prank(owner);
        token = new vTON(owner);

        // Deploy faucet
        vm.prank(owner);
        faucet = new VTONFaucet(address(token), owner);

        // Grant minter permission to faucet
        vm.prank(owner);
        token.setMinter(address(faucet), true);
    }

    /*//////////////////////////////////////////////////////////////
                            DEPLOYMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Deployment() public view {
        assertEq(address(faucet.vton()), address(token));
        assertEq(faucet.claimAmount(), DEFAULT_CLAIM_AMOUNT);
        assertEq(faucet.totalClaimed(), 0);
        assertFalse(faucet.paused());
        assertEq(faucet.owner(), owner);
    }

    function test_DeploymentRevertsWithZeroVTON() public {
        vm.expectRevert("Invalid vTON address");
        new VTONFaucet(address(0), owner);
    }

    /*//////////////////////////////////////////////////////////////
                             CLAIM TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Claim() public {
        vm.prank(user1);
        vm.expectEmit(true, false, false, true);
        emit Claimed(user1, DEFAULT_CLAIM_AMOUNT, block.timestamp);
        faucet.claim();

        assertEq(token.balanceOf(user1), DEFAULT_CLAIM_AMOUNT);
        assertEq(faucet.totalClaimed(), DEFAULT_CLAIM_AMOUNT);
    }

    function test_ClaimMultipleTimes() public {
        vm.prank(user1);
        faucet.claim();

        vm.prank(user1);
        faucet.claim();

        vm.prank(user1);
        faucet.claim();

        assertEq(token.balanceOf(user1), DEFAULT_CLAIM_AMOUNT * 3);
        assertEq(faucet.totalClaimed(), DEFAULT_CLAIM_AMOUNT * 3);
    }

    function test_ClaimMultipleUsers() public {
        vm.prank(user1);
        faucet.claim();

        vm.prank(user2);
        faucet.claim();

        assertEq(token.balanceOf(user1), DEFAULT_CLAIM_AMOUNT);
        assertEq(token.balanceOf(user2), DEFAULT_CLAIM_AMOUNT);
        assertEq(faucet.totalClaimed(), DEFAULT_CLAIM_AMOUNT * 2);
    }

    function test_ClaimRevertsIfPaused() public {
        vm.prank(owner);
        faucet.setPaused(true);

        vm.prank(user1);
        vm.expectRevert(VTONFaucet.FaucetPaused.selector);
        faucet.claim();
    }

    /*//////////////////////////////////////////////////////////////
                           CAN CLAIM TESTS
    //////////////////////////////////////////////////////////////*/

    function test_CanClaim() public view {
        bool canClaimNow = faucet.canClaim();
        assertTrue(canClaimNow);
    }

    function test_CanClaim_WhenPaused() public {
        vm.prank(owner);
        faucet.setPaused(true);

        bool canClaimNow = faucet.canClaim();
        assertFalse(canClaimNow);
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SetClaimAmount() public {
        uint256 newAmount = 500 ether;

        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit ClaimAmountUpdated(DEFAULT_CLAIM_AMOUNT, newAmount);
        faucet.setClaimAmount(newAmount);

        assertEq(faucet.claimAmount(), newAmount);
    }

    function test_SetClaimAmountRevertsIfNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        faucet.setClaimAmount(500 ether);
    }

    function test_SetClaimAmountRevertsIfZero() public {
        vm.prank(owner);
        vm.expectRevert(VTONFaucet.InvalidClaimAmount.selector);
        faucet.setClaimAmount(0);
    }

    function test_SetPaused() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit PauseStatusUpdated(true);
        faucet.setPaused(true);

        assertTrue(faucet.paused());

        vm.prank(owner);
        faucet.setPaused(false);

        assertFalse(faucet.paused());
    }

    function test_SetPausedRevertsIfNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        faucet.setPaused(true);
    }

    /*//////////////////////////////////////////////////////////////
                             FUZZ TESTS
    //////////////////////////////////////////////////////////////*/

    function testFuzz_Claim(address user) public {
        vm.assume(user != address(0));

        vm.prank(user);
        faucet.claim();

        assertEq(token.balanceOf(user), DEFAULT_CLAIM_AMOUNT);
    }

    function testFuzz_ClaimMultipleTimes(address user, uint8 times) public {
        vm.assume(user != address(0));
        vm.assume(times > 0 && times <= 10);

        for (uint8 i = 0; i < times; i++) {
            vm.prank(user);
            faucet.claim();
        }

        assertEq(token.balanceOf(user), DEFAULT_CLAIM_AMOUNT * times);
        assertEq(faucet.totalClaimed(), DEFAULT_CLAIM_AMOUNT * times);
    }

    function testFuzz_SetClaimAmount(uint256 amount) public {
        amount = bound(amount, 1, type(uint128).max);

        vm.prank(owner);
        faucet.setClaimAmount(amount);

        assertEq(faucet.claimAmount(), amount);
    }
}
