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
    address public delegator1;
    address public delegator2;
    address public user1;
    address public user2;

    uint256 public constant INITIAL_BALANCE = 10_000 ether;

    function setUp() public {
        owner = makeAddr("owner");
        delegator1 = makeAddr("delegator1");
        delegator2 = makeAddr("delegator2");
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
                        DELEGATOR REGISTRATION
    //////////////////////////////////////////////////////////////*/

    function test_RegisterDelegator() public {
        vm.prank(delegator1);
        registry.registerDelegator("Alice", "Long-term value", "No conflicts");

        IDelegateRegistry.DelegatorInfo memory info = registry.getDelegatorInfo(delegator1);
        assertEq(info.profile, "Alice");
        assertEq(info.votingPhilosophy, "Long-term value");
        assertEq(info.interests, "No conflicts");
        assertTrue(info.isActive);
        assertGt(info.registeredAt, 0);
    }

    function test_RegisterDelegatorRevertsIfAlreadyRegistered() public {
        vm.prank(delegator1);
        registry.registerDelegator("Alice", "Philosophy", "Interests");

        vm.prank(delegator1);
        vm.expectRevert(DelegateRegistry.AlreadyRegisteredDelegator.selector);
        registry.registerDelegator("Alice2", "Philosophy2", "Interests2");
    }

    function test_RegisterDelegatorRevertsWithEmptyProfile() public {
        vm.prank(delegator1);
        vm.expectRevert(DelegateRegistry.EmptyProfile.selector);
        registry.registerDelegator("", "Philosophy", "Interests");
    }

    function test_UpdateDelegator() public {
        vm.prank(delegator1);
        registry.registerDelegator("Alice", "Philosophy1", "Interests1");

        vm.prank(delegator1);
        registry.updateDelegator("Alice Updated", "Philosophy2", "Interests2");

        IDelegateRegistry.DelegatorInfo memory info = registry.getDelegatorInfo(delegator1);
        assertEq(info.profile, "Alice Updated");
        assertEq(info.votingPhilosophy, "Philosophy2");
    }

    function test_DeactivateDelegator() public {
        vm.prank(delegator1);
        registry.registerDelegator("Alice", "Philosophy", "Interests");

        vm.prank(delegator1);
        registry.deactivateDelegator();

        assertFalse(registry.isRegisteredDelegator(delegator1));
    }

    /*//////////////////////////////////////////////////////////////
                              DELEGATION
    //////////////////////////////////////////////////////////////*/

    function test_Delegate() public {
        // Register delegator first
        vm.prank(delegator1);
        registry.registerDelegator("Alice", "Philosophy", "Interests");

        uint256 amount = 1000 ether;

        vm.prank(user1);
        registry.delegate(delegator1, amount);

        assertEq(registry.getTotalDelegated(delegator1), amount);
        assertEq(token.balanceOf(address(registry)), amount);
        assertEq(token.balanceOf(user1), INITIAL_BALANCE - amount);

        IDelegateRegistry.DelegationInfo memory delegation =
            registry.getDelegation(user1, delegator1);
        assertEq(delegation.delegator, delegator1);
        assertEq(delegation.amount, amount);
    }

    function test_DelegateRevertsIfNotRegistered() public {
        vm.prank(user1);
        vm.expectRevert(DelegateRegistry.DelegatorNotActive.selector);
        registry.delegate(delegator1, 1000 ether);
    }

    function test_DelegateRevertsIfDelegatorInactive() public {
        vm.prank(delegator1);
        registry.registerDelegator("Alice", "Philosophy", "Interests");

        vm.prank(delegator1);
        registry.deactivateDelegator();

        vm.prank(user1);
        vm.expectRevert(DelegateRegistry.DelegatorNotActive.selector);
        registry.delegate(delegator1, 1000 ether);
    }

    function test_SelfDelegationAllowed() public {
        vm.prank(user1);
        registry.registerDelegator("User1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(user1, 1000 ether);

        assertEq(registry.getTotalDelegated(user1), 1000 ether);
    }

    function test_DelegateFullBalance() public {
        vm.prank(delegator1);
        registry.registerDelegator("Alice", "Philosophy", "Interests");

        // Delegate user1's full balance (10_000) - should succeed without cap
        vm.prank(user1);
        registry.delegate(delegator1, INITIAL_BALANCE);

        assertEq(registry.getTotalDelegated(delegator1), INITIAL_BALANCE);
        assertEq(token.balanceOf(user1), 0);
    }

    /*//////////////////////////////////////////////////////////////
                            UNDELEGATION
    //////////////////////////////////////////////////////////////*/

    function test_Undelegate() public {
        vm.prank(delegator1);
        registry.registerDelegator("Alice", "Philosophy", "Interests");

        uint256 delegateAmount = 1000 ether;
        uint256 undelegateAmount = 400 ether;

        vm.prank(user1);
        registry.delegate(delegator1, delegateAmount);

        vm.prank(user1);
        registry.undelegate(delegator1, undelegateAmount);

        assertEq(registry.getTotalDelegated(delegator1), delegateAmount - undelegateAmount);
        assertEq(token.balanceOf(user1), INITIAL_BALANCE - delegateAmount + undelegateAmount);
    }

    function test_UndelegateAll() public {
        vm.prank(delegator1);
        registry.registerDelegator("Alice", "Philosophy", "Interests");

        uint256 amount = 1000 ether;

        vm.prank(user1);
        registry.delegate(delegator1, amount);

        vm.prank(user1);
        registry.undelegate(delegator1, amount);

        assertEq(registry.getTotalDelegated(delegator1), 0);
        assertEq(token.balanceOf(user1), INITIAL_BALANCE);
    }

    function test_UndelegateRevertsIfInsufficientDelegation() public {
        vm.prank(delegator1);
        registry.registerDelegator("Alice", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegator1, 1000 ether);

        vm.prank(user1);
        vm.expectRevert(DelegateRegistry.InsufficientDelegation.selector);
        registry.undelegate(delegator1, 1001 ether);
    }

    /*//////////////////////////////////////////////////////////////
                            REDELEGATION
    //////////////////////////////////////////////////////////////*/

    function test_Redelegate() public {
        vm.prank(delegator1);
        registry.registerDelegator("Alice", "Philosophy1", "Interests1");

        vm.prank(delegator2);
        registry.registerDelegator("Bob", "Philosophy2", "Interests2");

        uint256 amount = 1000 ether;

        vm.prank(user1);
        registry.delegate(delegator1, amount);

        vm.prank(user1);
        registry.redelegate(delegator1, delegator2, amount);

        assertEq(registry.getTotalDelegated(delegator1), 0);
        assertEq(registry.getTotalDelegated(delegator2), amount);
    }

    function test_RedelegatePartial() public {
        vm.prank(delegator1);
        registry.registerDelegator("Alice", "Philosophy1", "Interests1");

        vm.prank(delegator2);
        registry.registerDelegator("Bob", "Philosophy2", "Interests2");

        uint256 amount = 1000 ether;
        uint256 redelegateAmount = 400 ether;

        vm.prank(user1);
        registry.delegate(delegator1, amount);

        vm.prank(user1);
        registry.redelegate(delegator1, delegator2, redelegateAmount);

        assertEq(registry.getTotalDelegated(delegator1), amount - redelegateAmount);
        assertEq(registry.getTotalDelegated(delegator2), redelegateAmount);
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
        vm.prank(delegator1);
        registry.registerDelegator("Alice", "Philosophy", "Interests");

        // Can delegate any amount up to user's balance
        amount = bound(amount, 1, INITIAL_BALANCE);

        vm.prank(user1);
        registry.delegate(delegator1, amount);

        assertEq(registry.getTotalDelegated(delegator1), amount);
    }
}
