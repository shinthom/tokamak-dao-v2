// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test, console } from "forge-std/Test.sol";
import { SecurityCouncil } from "../src/governance/SecurityCouncil.sol";
import { ISecurityCouncil } from "../src/interfaces/ISecurityCouncil.sol";

/// @notice Mock target contract for testing
contract MockTarget {
    bool public paused;
    uint256 public value;

    function pause() external {
        paused = true;
    }

    function unpause() external {
        paused = false;
    }

    function setValue(uint256 _value) external {
        value = _value;
    }
}

contract SecurityCouncilTest is Test {
    SecurityCouncil public council;
    MockTarget public target;

    address public daoGovernor;
    address public timelock;
    address public foundationMember;
    address public external1;
    address public external2;

    function setUp() public {
        daoGovernor = makeAddr("daoGovernor");
        timelock = makeAddr("timelock");
        foundationMember = makeAddr("foundationMember");
        external1 = makeAddr("external1");
        external2 = makeAddr("external2");

        target = new MockTarget();

        address[] memory externalMembers = new address[](2);
        externalMembers[0] = external1;
        externalMembers[1] = external2;

        council = new SecurityCouncil(
            foundationMember, externalMembers, daoGovernor, timelock, address(target)
        );
    }

    /*//////////////////////////////////////////////////////////////
                            DEPLOYMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Deployment() public view {
        assertEq(council.memberCount(), 3);
        assertEq(council.foundationMemberCount(), 1);
        assertEq(council.externalMemberCount(), 2);
        assertEq(council.threshold(), 2); // 2/3
        assertTrue(council.isMember(foundationMember));
        assertTrue(council.isMember(external1));
        assertTrue(council.isMember(external2));
    }

    function test_GetMembers() public view {
        ISecurityCouncil.Member[] memory members = council.getMembers();
        assertEq(members.length, 3);

        // Foundation member should be first
        assertEq(members[0].account, foundationMember);
        assertTrue(members[0].isFoundation);

        // External members
        assertEq(members[1].account, external1);
        assertFalse(members[1].isFoundation);
    }

    /*//////////////////////////////////////////////////////////////
                         EMERGENCY ACTIONS
    //////////////////////////////////////////////////////////////*/

    function test_ProposeEmergencyAction() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Set value to 42"
        );

        ISecurityCouncil.EmergencyAction memory action = council.getEmergencyAction(actionId);
        assertEq(action.id, actionId);
        assertEq(uint256(action.actionType), uint256(ISecurityCouncil.ActionType.Custom));
        assertEq(action.target, address(target));
        assertEq(action.reason, "Set value to 42");
        assertFalse(action.executed);
        assertEq(action.approvers.length, 1);
    }

    function test_ProposeEmergencyActionRevertsIfNotMember() public {
        address nonMember = makeAddr("nonMember");
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(nonMember);
        vm.expectRevert(SecurityCouncil.NotMember.selector);
        council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test"
        );
    }

    function test_ApproveEmergencyAction() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test"
        );

        vm.prank(external1);
        council.approveEmergencyAction(actionId);

        ISecurityCouncil.EmergencyAction memory action = council.getEmergencyAction(actionId);
        assertEq(action.approvers.length, 2);
        assertTrue(council.isActionApproved(actionId));
    }

    function test_ApproveEmergencyActionRevertsIfAlreadyApproved() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test"
        );

        vm.prank(foundationMember);
        vm.expectRevert(SecurityCouncil.AlreadyApproved.selector);
        council.approveEmergencyAction(actionId);
    }

    function test_ExecuteEmergencyAction() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test"
        );

        vm.prank(external1);
        council.approveEmergencyAction(actionId);

        vm.prank(external2);
        council.executeEmergencyAction(actionId);

        assertEq(target.value(), 42);

        ISecurityCouncil.EmergencyAction memory action = council.getEmergencyAction(actionId);
        assertTrue(action.executed);
    }

    function test_ExecuteEmergencyActionRevertsIfNotApproved() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test"
        );

        // Only 1 approval, need 2
        vm.prank(external1);
        vm.expectRevert(SecurityCouncil.ActionNotApproved.selector);
        council.executeEmergencyAction(actionId);
    }

    function test_CancelEmergencyAction() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test"
        );

        vm.prank(external1);
        council.cancelEmergencyAction(actionId);

        ISecurityCouncil.EmergencyAction memory action = council.getEmergencyAction(actionId);
        assertTrue(action.executed); // Marked as executed to prevent reuse
    }

    /*//////////////////////////////////////////////////////////////
                        CONVENIENCE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function test_PauseProtocol() public {
        vm.prank(foundationMember);
        council.pauseProtocol("Emergency pause");

        uint256[] memory pending = council.getPendingActions();
        assertEq(pending.length, 1);

        ISecurityCouncil.EmergencyAction memory action = council.getEmergencyAction(pending[0]);
        assertEq(uint256(action.actionType), uint256(ISecurityCouncil.ActionType.PauseProtocol));
    }

    function test_UnpauseProtocol() public {
        vm.prank(foundationMember);
        council.unpauseProtocol();

        uint256[] memory pending = council.getPendingActions();
        assertEq(pending.length, 1);

        ISecurityCouncil.EmergencyAction memory action = council.getEmergencyAction(pending[0]);
        assertEq(uint256(action.actionType), uint256(ISecurityCouncil.ActionType.UnpauseProtocol));
    }

    /*//////////////////////////////////////////////////////////////
                         MEMBER MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    function test_AddMember() public {
        address newMember = makeAddr("newMember");

        vm.prank(daoGovernor);
        council.addMember(newMember, false);

        assertTrue(council.isMember(newMember));
        assertEq(council.memberCount(), 4);
    }

    function test_AddMemberRevertsIfNotDAO() public {
        address newMember = makeAddr("newMember");

        vm.prank(foundationMember);
        vm.expectRevert(SecurityCouncil.OnlyDAOCanModifyMembers.selector);
        council.addMember(newMember, false);
    }

    function test_RemoveMember() public {
        vm.prank(daoGovernor);
        council.removeMember(external2);

        assertFalse(council.isMember(external2));
        assertEq(council.memberCount(), 2);
    }

    function test_RemoveMemberRevertsIfTooFewMembers() public {
        vm.startPrank(daoGovernor);
        council.removeMember(external2);

        vm.expectRevert(SecurityCouncil.NotEnoughMembers.selector);
        council.removeMember(external1);
        vm.stopPrank();
    }

    function test_SetThreshold() public {
        vm.prank(daoGovernor);
        council.setThreshold(3);

        assertEq(council.threshold(), 3);
    }

    function test_SetThresholdRevertsIfInvalid() public {
        vm.prank(daoGovernor);
        vm.expectRevert(SecurityCouncil.InvalidThreshold.selector);
        council.setThreshold(4); // More than member count
    }

    /*//////////////////////////////////////////////////////////////
                             VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function test_GetPendingActions() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(foundationMember);
        council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test1"
        );

        vm.prank(external1);
        council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test2"
        );

        uint256[] memory pending = council.getPendingActions();
        assertEq(pending.length, 2);
    }

    function test_IsActionApproved() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test"
        );

        // Only 1 approval
        assertFalse(council.isActionApproved(actionId));

        // Add second approval
        vm.prank(external1);
        council.approveEmergencyAction(actionId);

        // Now approved
        assertTrue(council.isActionApproved(actionId));
    }
}
