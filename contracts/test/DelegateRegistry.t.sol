// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test, console } from "forge-std/Test.sol";
import { vTON } from "../src/token/vTON.sol";
import { DelegateRegistry } from "../src/governance/DelegateRegistry.sol";
import { IDelegateRegistry } from "../src/interfaces/IDelegateRegistry.sol";

contract DelegateRegistryTest is Test {
    vTON public token;
    DelegateRegistry public registry;

    address public owner;
    address public delegate1;
    address public delegate2;
    address public user1;
    address public user2;

    uint256 public constant INITIAL_BALANCE = 10_000 ether;

    function setUp() public {
        owner = makeAddr("owner");
        delegate1 = makeAddr("delegate1");
        delegate2 = makeAddr("delegate2");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        // Deploy vTON
        vm.prank(owner);
        token = new vTON(owner);

        // Deploy DelegateRegistry
        vm.prank(owner);
        registry = new DelegateRegistry(address(token), owner);

        // Setup minter and mint tokens
        vm.startPrank(owner);
        token.setMinter(owner, true);
        token.mint(user1, INITIAL_BALANCE);
        token.mint(user2, INITIAL_BALANCE);
        vm.stopPrank();

        // Approve registry for users
        vm.prank(user1);
        token.approve(address(registry), type(uint256).max);

        vm.prank(user2);
        token.approve(address(registry), type(uint256).max);
    }

    /*//////////////////////////////////////////////////////////////
                        DELEGATE REGISTRATION
    //////////////////////////////////////////////////////////////*/

    function test_RegisterDelegate() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Long-term value", "No conflicts");

        IDelegateRegistry.DelegateInfo memory info = registry.getDelegateInfo(delegate1);
        assertEq(info.profile, "Alice");
        assertEq(info.votingPhilosophy, "Long-term value");
        assertEq(info.interests, "No conflicts");
        assertTrue(info.isActive);
        assertGt(info.registeredAt, 0);
    }

    function test_RegisterDelegateRevertsIfAlreadyRegistered() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        vm.prank(delegate1);
        vm.expectRevert(DelegateRegistry.AlreadyRegisteredDelegate.selector);
        registry.registerDelegate("Alice2", "Philosophy2", "Interests2");
    }

    function test_RegisterDelegateRevertsWithEmptyProfile() public {
        vm.prank(delegate1);
        vm.expectRevert(DelegateRegistry.EmptyProfile.selector);
        registry.registerDelegate("", "Philosophy", "Interests");
    }

    function test_UpdateDelegate() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy1", "Interests1");

        vm.prank(delegate1);
        registry.updateDelegate("Alice Updated", "Philosophy2", "Interests2");

        IDelegateRegistry.DelegateInfo memory info = registry.getDelegateInfo(delegate1);
        assertEq(info.profile, "Alice Updated");
        assertEq(info.votingPhilosophy, "Philosophy2");
    }

    function test_DeactivateDelegate() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        vm.prank(delegate1);
        registry.deactivateDelegate();

        assertFalse(registry.isRegisteredDelegate(delegate1));
    }

    /*//////////////////////////////////////////////////////////////
                              DELEGATION
    //////////////////////////////////////////////////////////////*/

    function test_Delegate() public {
        // Register delegate first
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        uint256 amount = 1000 ether;

        vm.prank(user1);
        registry.delegate(delegate1, amount);

        assertEq(registry.getTotalDelegated(delegate1), amount);
        assertEq(token.balanceOf(address(registry)), amount);
        assertEq(token.balanceOf(user1), INITIAL_BALANCE - amount);

        IDelegateRegistry.DelegationInfo memory delegation =
            registry.getDelegation(user1, delegate1);
        assertEq(delegation.delegate, delegate1);
        assertEq(delegation.amount, amount);
    }

    function test_DelegateRevertsIfNotRegistered() public {
        vm.prank(user1);
        vm.expectRevert(DelegateRegistry.DelegateNotActive.selector);
        registry.delegate(delegate1, 1000 ether);
    }

    function test_DelegateRevertsIfDelegateInactive() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        vm.prank(delegate1);
        registry.deactivateDelegate();

        vm.prank(user1);
        vm.expectRevert(DelegateRegistry.DelegateNotActive.selector);
        registry.delegate(delegate1, 1000 ether);
    }

    function test_SelfDelegationAllowed() public {
        vm.prank(user1);
        registry.registerDelegate("User1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(user1, 1000 ether);

        assertEq(registry.getTotalDelegated(user1), 1000 ether);
    }

    function test_DelegateFullBalance() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        // Delegate user1's full balance (10_000) - should succeed without cap
        vm.prank(user1);
        registry.delegate(delegate1, INITIAL_BALANCE);

        assertEq(registry.getTotalDelegated(delegate1), INITIAL_BALANCE);
        assertEq(token.balanceOf(user1), 0);
    }

    /*//////////////////////////////////////////////////////////////
                            UNDELEGATION
    //////////////////////////////////////////////////////////////*/

    function test_Undelegate() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        uint256 delegateAmount = 1000 ether;
        uint256 undelegateAmount = 400 ether;

        vm.prank(user1);
        registry.delegate(delegate1, delegateAmount);

        vm.prank(user1);
        registry.undelegate(delegate1, undelegateAmount);

        assertEq(registry.getTotalDelegated(delegate1), delegateAmount - undelegateAmount);
        assertEq(token.balanceOf(user1), INITIAL_BALANCE - delegateAmount + undelegateAmount);
    }

    function test_UndelegateAll() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        uint256 amount = 1000 ether;

        vm.prank(user1);
        registry.delegate(delegate1, amount);

        vm.prank(user1);
        registry.undelegate(delegate1, amount);

        assertEq(registry.getTotalDelegated(delegate1), 0);
        assertEq(token.balanceOf(user1), INITIAL_BALANCE);
    }

    function test_UndelegateRevertsIfInsufficientDelegation() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);

        vm.prank(user1);
        vm.expectRevert(DelegateRegistry.InsufficientDelegation.selector);
        registry.undelegate(delegate1, 1001 ether);
    }

    /*//////////////////////////////////////////////////////////////
                            REDELEGATION
    //////////////////////////////////////////////////////////////*/

    function test_Redelegate() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy1", "Interests1");

        vm.prank(delegate2);
        registry.registerDelegate("Bob", "Philosophy2", "Interests2");

        uint256 amount = 1000 ether;

        vm.prank(user1);
        registry.delegate(delegate1, amount);

        vm.prank(user1);
        registry.redelegate(delegate1, delegate2, amount);

        assertEq(registry.getTotalDelegated(delegate1), 0);
        assertEq(registry.getTotalDelegated(delegate2), amount);
    }

    function test_RedelegatePartial() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy1", "Interests1");

        vm.prank(delegate2);
        registry.registerDelegate("Bob", "Philosophy2", "Interests2");

        uint256 amount = 1000 ether;
        uint256 redelegateAmount = 400 ether;

        vm.prank(user1);
        registry.delegate(delegate1, amount);

        vm.prank(user1);
        registry.redelegate(delegate1, delegate2, redelegateAmount);

        assertEq(registry.getTotalDelegated(delegate1), amount - redelegateAmount);
        assertEq(registry.getTotalDelegated(delegate2), redelegateAmount);
    }

    /*//////////////////////////////////////////////////////////////
                           ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function test_SetDelegationPeriodRequirement() public {
        vm.prank(owner);
        registry.setDelegationPeriodRequirement(14 days);

        assertEq(registry.delegationPeriodRequirement(), 14 days);
    }

    function test_SetAutoExpiryPeriod() public {
        vm.prank(owner);
        registry.setAutoExpiryPeriod(30 days);

        assertEq(registry.autoExpiryPeriod(), 30 days);
    }

    /*//////////////////////////////////////////////////////////////
                             FUZZ TESTS
    //////////////////////////////////////////////////////////////*/

    function testFuzz_DelegateAnyAmount(uint256 amount) public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        // Can delegate any amount up to user's balance
        amount = bound(amount, 1, INITIAL_BALANCE);

        vm.prank(user1);
        registry.delegate(delegate1, amount);

        assertEq(registry.getTotalDelegated(delegate1), amount);
    }
}
