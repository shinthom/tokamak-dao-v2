// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ISecurityCouncil Interface
/// @notice Interface for the Security Council multi-sig contract
/// @dev Security Council can bypass governance for emergency actions:
///      - Cancel malicious proposals in timelock
///      - Emergency contract upgrades
///      - Protocol pause
///      Initial configuration: 3 members (1 foundation + 2 external), 2/3 threshold
interface ISecurityCouncil {
    /// @notice Member information
    struct Member {
        address account;
        bool isFoundation; // True if foundation member
        uint256 addedAt;
    }

    /// @notice Emergency action types
    enum ActionType {
        CancelProposal, // Cancel a proposal in timelock
        EmergencyUpgrade, // Emergency contract upgrade
        PauseProtocol, // Pause protocol functions
        UnpauseProtocol, // Unpause protocol functions
        Custom // Custom action

    }

    /// @notice Emergency action structure
    struct EmergencyAction {
        uint256 id;
        ActionType actionType;
        address target;
        bytes data;
        string reason;
        uint256 createdAt;
        uint256 executedAt;
        bool executed;
        address[] approvers;
    }

    /// @notice Emitted when a member is added
    event MemberAdded(address indexed member, bool isFoundation);

    /// @notice Emitted when a member is removed
    event MemberRemoved(address indexed member);

    /// @notice Emitted when threshold is updated
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    /// @notice Emitted when an emergency action is proposed
    event EmergencyActionProposed(
        uint256 indexed actionId,
        ActionType actionType,
        address target,
        bytes data,
        string reason,
        address indexed proposer
    );

    /// @notice Emitted when an emergency action is approved
    event EmergencyActionApproved(uint256 indexed actionId, address indexed approver);

    /// @notice Emitted when an emergency action is executed
    event EmergencyActionExecuted(uint256 indexed actionId, address indexed executor);

    /// @notice Emitted when an emergency action is canceled
    event EmergencyActionCanceled(uint256 indexed actionId);

    /// @notice Add a new council member
    /// @param member The member address
    /// @param isFoundation Whether this is a foundation member
    /// @dev Only callable via DAO governance (for member changes)
    function addMember(address member, bool isFoundation) external;

    /// @notice Remove a council member
    /// @param member The member to remove
    /// @dev Only callable via DAO governance
    function removeMember(address member) external;

    /// @notice Update the execution threshold
    /// @param newThreshold New threshold (must be <= member count)
    /// @dev Only callable via DAO governance
    function setThreshold(uint256 newThreshold) external;

    /// @notice Propose an emergency action
    /// @param actionType The type of emergency action
    /// @param target The target address
    /// @param data The calldata to execute
    /// @param reason The reason for the emergency action
    /// @return actionId The emergency action ID
    function proposeEmergencyAction(
        ActionType actionType,
        address target,
        bytes calldata data,
        string calldata reason
    ) external returns (uint256 actionId);

    /// @notice Approve an emergency action
    /// @param actionId The action ID to approve
    function approveEmergencyAction(uint256 actionId) external;

    /// @notice Execute an approved emergency action
    /// @param actionId The action ID to execute
    /// @dev Requires threshold approvals
    function executeEmergencyAction(uint256 actionId) external;

    /// @notice Cancel a pending emergency action
    /// @param actionId The action ID to cancel
    function cancelEmergencyAction(uint256 actionId) external;

    /// @notice Cancel a malicious proposal in the timelock
    /// @param proposalId The proposal ID to cancel
    /// @dev Convenience function for CancelProposal action type
    function cancelProposal(uint256 proposalId) external;

    /// @notice Pause the protocol
    /// @param reason The reason for pausing
    /// @dev Convenience function for PauseProtocol action type
    function pauseProtocol(string calldata reason) external;

    /// @notice Unpause the protocol
    /// @dev Convenience function for UnpauseProtocol action type
    function unpauseProtocol() external;

    /// @notice Get all council members
    /// @return Array of member structs
    function getMembers() external view returns (Member[] memory);

    /// @notice Get member count
    /// @return Total member count
    function memberCount() external view returns (uint256);

    /// @notice Get foundation member count
    /// @return Foundation member count
    function foundationMemberCount() external view returns (uint256);

    /// @notice Get external member count
    /// @return External member count
    function externalMemberCount() external view returns (uint256);

    /// @notice Check if an address is a member
    /// @param account The address to check
    /// @return True if member
    function isMember(address account) external view returns (bool);

    /// @notice Get the current threshold
    /// @return Required approvals for execution
    function threshold() external view returns (uint256);

    /// @notice Get an emergency action
    /// @param actionId The action ID
    /// @return The emergency action struct
    function getEmergencyAction(uint256 actionId) external view returns (EmergencyAction memory);

    /// @notice Get pending emergency actions
    /// @return Array of pending action IDs
    function getPendingActions() external view returns (uint256[] memory);

    /// @notice Check if an action has enough approvals
    /// @param actionId The action ID
    /// @return True if threshold is met
    function isActionApproved(uint256 actionId) external view returns (bool);
}
