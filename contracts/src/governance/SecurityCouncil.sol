// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";

import { ISecurityCouncil } from "../interfaces/ISecurityCouncil.sol";

/// @title SecurityCouncil - Emergency Response Multi-sig
/// @notice Multi-signature contract for emergency governance actions
/// @dev Implements vTON DAO Governance Model Security Council:
///      - Initial: 3 members (1 foundation + 2 external)
///      - Threshold: 2/3 (67%)
///      - Powers: Cancel proposals, emergency upgrades, protocol pause
///      - All actions must be disclosed to community afterward
contract SecurityCouncil is ISecurityCouncil, ReentrancyGuard, Pausable {
    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error NotMember();
    error AlreadyMember();
    error NotEnoughMembers();
    error InvalidThreshold();
    error ActionNotFound();
    error ActionAlreadyExecuted();
    error ActionNotApproved();
    error AlreadyApproved();
    error ZeroAddress();
    error CannotRemoveLastFoundationMember();
    error OnlyDAOCanModifyMembers();
    error ExecutionFailed();

    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Minimum number of members
    uint256 public constant MIN_MEMBERS = 2;

    /*//////////////////////////////////////////////////////////////
                                 STATE
    //////////////////////////////////////////////////////////////*/

    /// @notice DAO Governor address (for member management)
    address public daoGovernor;

    /// @notice Timelock address (for canceling proposals)
    address public timelockAddress;

    /// @notice Target contract for pause/unpause
    address public protocolTarget;

    /// @notice Current execution threshold
    uint256 public override threshold;

    /// @notice Action counter
    uint256 private _actionCount;

    /// @notice Array of council members
    Member[] private _members;

    /// @notice Mapping for quick member lookup
    mapping(address => bool) private _isMember;

    /// @notice Mapping from address to member index
    mapping(address => uint256) private _memberIndex;

    /// @notice Emergency actions
    mapping(uint256 => EmergencyAction) private _actions;

    /// @notice Pending action IDs
    uint256[] private _pendingActionIds;

    /// @notice Mapping to track approvals: actionId => member => approved
    mapping(uint256 => mapping(address => bool)) private _approvals;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @notice Deploy the Security Council
    /// @param foundationMember The foundation member address
    /// @param externalMembers Array of external member addresses (should be 2)
    /// @param daoGovernor_ The DAO Governor address
    /// @param timelock_ The timelock address
    /// @param protocolTarget_ The protocol contract to pause/unpause
    constructor(
        address foundationMember,
        address[] memory externalMembers,
        address daoGovernor_,
        address timelock_,
        address protocolTarget_
    ) {
        if (
            foundationMember == address(0) || daoGovernor_ == address(0)
                || timelock_ == address(0)
        ) {
            revert ZeroAddress();
        }

        // Add foundation member
        _addMember(foundationMember, true);

        // Add external members
        for (uint256 i = 0; i < externalMembers.length; i++) {
            if (externalMembers[i] == address(0)) revert ZeroAddress();
            _addMember(externalMembers[i], false);
        }

        // Set initial threshold to 2/3
        uint256 memberCount_ = _members.length;
        threshold = (memberCount_ * 2 + 2) / 3; // Ceiling of 2/3

        daoGovernor = daoGovernor_;
        timelockAddress = timelock_;
        protocolTarget = protocolTarget_;
    }

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyMember() {
        if (!_isMember[msg.sender]) revert NotMember();
        _;
    }

    modifier onlyDAO() {
        if (msg.sender != daoGovernor) revert OnlyDAOCanModifyMembers();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                         MEMBER MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc ISecurityCouncil
    function addMember(address member, bool isFoundation) external override onlyDAO {
        if (member == address(0)) revert ZeroAddress();
        if (_isMember[member]) revert AlreadyMember();

        _addMember(member, isFoundation);

        emit MemberAdded(member, isFoundation);
    }

    /// @inheritdoc ISecurityCouncil
    function removeMember(address member) external override onlyDAO {
        if (!_isMember[member]) revert NotMember();
        if (_members.length <= MIN_MEMBERS) revert NotEnoughMembers();

        // Check if removing last foundation member
        uint256 index = _memberIndex[member];
        if (_members[index].isFoundation && foundationMemberCount() == 1) {
            revert CannotRemoveLastFoundationMember();
        }

        _removeMember(member);

        // Adjust threshold if needed
        if (threshold > _members.length) {
            threshold = _members.length;
        }

        emit MemberRemoved(member);
    }

    /// @inheritdoc ISecurityCouncil
    function setThreshold(uint256 newThreshold) external override onlyDAO {
        if (newThreshold == 0 || newThreshold > _members.length) {
            revert InvalidThreshold();
        }

        uint256 oldThreshold = threshold;
        threshold = newThreshold;

        emit ThresholdUpdated(oldThreshold, newThreshold);
    }

    /*//////////////////////////////////////////////////////////////
                         EMERGENCY ACTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc ISecurityCouncil
    function proposeEmergencyAction(
        ActionType actionType,
        address target,
        bytes calldata data,
        string calldata reason
    ) external override onlyMember returns (uint256 actionId) {
        actionId = _actionCount++;

        address[] memory approvers = new address[](1);
        approvers[0] = msg.sender;

        _actions[actionId] = EmergencyAction({
            id: actionId,
            actionType: actionType,
            target: target,
            data: data,
            reason: reason,
            createdAt: block.timestamp,
            executedAt: 0,
            executed: false,
            approvers: approvers
        });

        _approvals[actionId][msg.sender] = true;
        _pendingActionIds.push(actionId);

        emit EmergencyActionProposed(actionId, actionType, target, data, reason, msg.sender);
        emit EmergencyActionApproved(actionId, msg.sender);
    }

    /// @inheritdoc ISecurityCouncil
    function approveEmergencyAction(uint256 actionId) external override onlyMember {
        EmergencyAction storage action = _actions[actionId];
        if (action.createdAt == 0) revert ActionNotFound();
        if (action.executed) revert ActionAlreadyExecuted();
        if (_approvals[actionId][msg.sender]) revert AlreadyApproved();

        _approvals[actionId][msg.sender] = true;
        action.approvers.push(msg.sender);

        emit EmergencyActionApproved(actionId, msg.sender);
    }

    /// @inheritdoc ISecurityCouncil
    function executeEmergencyAction(uint256 actionId) external override onlyMember nonReentrant {
        EmergencyAction storage action = _actions[actionId];
        if (action.createdAt == 0) revert ActionNotFound();
        if (action.executed) revert ActionAlreadyExecuted();
        if (action.approvers.length < threshold) revert ActionNotApproved();

        action.executed = true;
        action.executedAt = block.timestamp;

        // Remove from pending
        _removePendingAction(actionId);

        // Execute based on action type
        if (action.actionType == ActionType.PauseProtocol) {
            _pause();
        } else if (action.actionType == ActionType.UnpauseProtocol) {
            _unpause();
        } else {
            // Execute custom action
            (bool success,) = action.target.call(action.data);
            if (!success) revert ExecutionFailed();
        }

        emit EmergencyActionExecuted(actionId, msg.sender);
    }

    /// @inheritdoc ISecurityCouncil
    function cancelEmergencyAction(uint256 actionId) external override onlyMember {
        EmergencyAction storage action = _actions[actionId];
        if (action.createdAt == 0) revert ActionNotFound();
        if (action.executed) revert ActionAlreadyExecuted();

        // Remove from pending
        _removePendingAction(actionId);

        // Mark as executed to prevent future use
        action.executed = true;

        emit EmergencyActionCanceled(actionId);
    }

    /*//////////////////////////////////////////////////////////////
                        CONVENIENCE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc ISecurityCouncil
    function cancelProposal(uint256 proposalId) external override onlyMember {
        // This would call the timelock to cancel a queued proposal
        // Implementation depends on timelock interface
        bytes memory data = abi.encodeWithSignature("cancelProposal(uint256)", proposalId);

        uint256 actionId = _actionCount++;

        address[] memory approvers = new address[](1);
        approvers[0] = msg.sender;

        _actions[actionId] = EmergencyAction({
            id: actionId,
            actionType: ActionType.CancelProposal,
            target: timelockAddress,
            data: data,
            reason: "Cancel malicious proposal",
            createdAt: block.timestamp,
            executedAt: 0,
            executed: false,
            approvers: approvers
        });

        _approvals[actionId][msg.sender] = true;
        _pendingActionIds.push(actionId);

        emit EmergencyActionProposed(
            actionId, ActionType.CancelProposal, timelockAddress, data, "Cancel malicious proposal", msg.sender
        );
    }

    /// @inheritdoc ISecurityCouncil
    function pauseProtocol(string calldata reason) external override onlyMember {
        bytes memory data = abi.encodeWithSignature("pause()");

        uint256 actionId = _actionCount++;

        address[] memory approvers = new address[](1);
        approvers[0] = msg.sender;

        _actions[actionId] = EmergencyAction({
            id: actionId,
            actionType: ActionType.PauseProtocol,
            target: protocolTarget,
            data: data,
            reason: reason,
            createdAt: block.timestamp,
            executedAt: 0,
            executed: false,
            approvers: approvers
        });

        _approvals[actionId][msg.sender] = true;
        _pendingActionIds.push(actionId);

        emit EmergencyActionProposed(
            actionId, ActionType.PauseProtocol, protocolTarget, data, reason, msg.sender
        );
    }

    /// @inheritdoc ISecurityCouncil
    function unpauseProtocol() external override onlyMember {
        bytes memory data = abi.encodeWithSignature("unpause()");

        uint256 actionId = _actionCount++;

        address[] memory approvers = new address[](1);
        approvers[0] = msg.sender;

        _actions[actionId] = EmergencyAction({
            id: actionId,
            actionType: ActionType.UnpauseProtocol,
            target: protocolTarget,
            data: data,
            reason: "Unpause protocol",
            createdAt: block.timestamp,
            executedAt: 0,
            executed: false,
            approvers: approvers
        });

        _approvals[actionId][msg.sender] = true;
        _pendingActionIds.push(actionId);

        emit EmergencyActionProposed(
            actionId, ActionType.UnpauseProtocol, protocolTarget, data, "Unpause protocol", msg.sender
        );
    }

    /*//////////////////////////////////////////////////////////////
                              VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc ISecurityCouncil
    function getMembers() external view override returns (Member[] memory) {
        return _members;
    }

    /// @inheritdoc ISecurityCouncil
    function memberCount() external view override returns (uint256) {
        return _members.length;
    }

    /// @inheritdoc ISecurityCouncil
    function foundationMemberCount() public view override returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < _members.length; i++) {
            if (_members[i].isFoundation) count++;
        }
        return count;
    }

    /// @inheritdoc ISecurityCouncil
    function externalMemberCount() external view override returns (uint256) {
        return _members.length - foundationMemberCount();
    }

    /// @inheritdoc ISecurityCouncil
    function isMember(address account) external view override returns (bool) {
        return _isMember[account];
    }

    /// @inheritdoc ISecurityCouncil
    function getEmergencyAction(
        uint256 actionId
    ) external view override returns (EmergencyAction memory) {
        return _actions[actionId];
    }

    /// @inheritdoc ISecurityCouncil
    function getPendingActions() external view override returns (uint256[] memory) {
        return _pendingActionIds;
    }

    /// @inheritdoc ISecurityCouncil
    function isActionApproved(uint256 actionId) external view override returns (bool) {
        return _actions[actionId].approvers.length >= threshold;
    }

    /*//////////////////////////////////////////////////////////////
                          INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @dev Add a member internally
    function _addMember(address member, bool isFoundation) internal {
        _memberIndex[member] = _members.length;
        _members.push(Member({ account: member, isFoundation: isFoundation, addedAt: block.timestamp }));
        _isMember[member] = true;
    }

    /// @dev Remove a member internally
    function _removeMember(address member) internal {
        uint256 index = _memberIndex[member];
        uint256 lastIndex = _members.length - 1;

        if (index != lastIndex) {
            Member memory lastMember = _members[lastIndex];
            _members[index] = lastMember;
            _memberIndex[lastMember.account] = index;
        }

        _members.pop();
        delete _memberIndex[member];
        _isMember[member] = false;
    }

    /// @dev Remove action from pending list
    function _removePendingAction(uint256 actionId) internal {
        uint256 len = _pendingActionIds.length;
        for (uint256 i = 0; i < len; i++) {
            if (_pendingActionIds[i] == actionId) {
                _pendingActionIds[i] = _pendingActionIds[len - 1];
                _pendingActionIds.pop();
                break;
            }
        }
    }

    /// @notice Update DAO Governor address
    /// @param newGovernor New governor address
    function setDAOGovernor(address newGovernor) external onlyDAO {
        if (newGovernor == address(0)) revert ZeroAddress();
        daoGovernor = newGovernor;
    }

    /// @notice Update protocol target address
    /// @param newTarget New target address
    function setProtocolTarget(address newTarget) external onlyDAO {
        if (newTarget == address(0)) revert ZeroAddress();
        protocolTarget = newTarget;
    }
}
