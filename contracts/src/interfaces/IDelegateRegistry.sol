// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IDelegateRegistry Interface
/// @notice Interface for the Delegate Registry contract
/// @dev Manages delegate registration and vTON delegation
///      Key features:
///      - Delegates must register with profile, voting philosophy, and interests
///      - vTON holders must delegate to vote (cannot vote directly)
///      - 7-day minimum delegation period for voting power recognition
interface IDelegateRegistry {
    /// @notice Delegate information structure
    struct DelegateInfo {
        string profile; // Identity or pseudonym
        string votingPhilosophy; // Decision-making criteria
        string interests; // Affiliations, investments, consulting relationships
        uint256 registeredAt; // Registration timestamp
        bool isActive; // Whether the delegate is active
    }

    /// @notice Delegation information structure
    struct DelegationInfo {
        address delegate; // The delegate receiving the delegation
        uint256 amount; // Amount of vTON delegated
        uint256 delegatedAt; // When the delegation was made
        uint256 expiresAt; // When the delegation expires (0 = no expiry)
    }

    /// @notice Emitted when a delegate registers
    event DelegateRegistered(
        address indexed delegate, string profile, string votingPhilosophy, string interests
    );

    /// @notice Emitted when a delegate updates their info
    event DelegateUpdated(
        address indexed delegate, string profile, string votingPhilosophy, string interests
    );

    /// @notice Emitted when a delegate is deactivated
    event DelegateDeactivated(address indexed delegate);

    /// @notice Emitted when vTON is delegated
    event Delegated(
        address indexed owner, address indexed delegate, uint256 amount, uint256 expiresAt
    );

    /// @notice Emitted when delegation is withdrawn
    event Undelegated(address indexed owner, address indexed delegate, uint256 amount);

    /// @notice Emitted when delegation period requirement is updated
    event DelegationPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);

    /// @notice Emitted when auto-expiry period is updated
    event AutoExpiryUpdated(uint256 oldExpiry, uint256 newExpiry);

    /// @notice Register as a delegate
    /// @param profile Identity or pseudonym
    /// @param votingPhilosophy Voting philosophy and decision criteria
    /// @param interests Interests disclosure (affiliations, investments, etc.)
    function registerDelegate(
        string calldata profile,
        string calldata votingPhilosophy,
        string calldata interests
    ) external;

    /// @notice Update delegate information
    /// @param profile New profile
    /// @param votingPhilosophy New voting philosophy
    /// @param interests New interests disclosure
    function updateDelegate(
        string calldata profile,
        string calldata votingPhilosophy,
        string calldata interests
    ) external;

    /// @notice Deactivate as a delegate
    function deactivateDelegate() external;

    /// @notice Delegate vTON to a delegate
    /// @param delegate The delegate address
    /// @param amount Amount of vTON to delegate
    function delegate(address delegate, uint256 amount) external;

    /// @notice Withdraw delegation from a delegate
    /// @param delegate The delegate address
    /// @param amount Amount to undelegate
    function undelegate(address delegate, uint256 amount) external;

    /// @notice Redelegate from one delegate to another
    /// @param fromDelegate Current delegate
    /// @param toDelegate New delegate
    /// @param amount Amount to redelegate
    function redelegate(address fromDelegate, address toDelegate, uint256 amount) external;

    /// @notice Get delegate information
    /// @param delegate The delegate address
    /// @return The delegate info struct
    function getDelegateInfo(address delegate) external view returns (DelegateInfo memory);

    /// @notice Check if an address is a registered delegate
    /// @param account The address to check
    /// @return True if registered and active
    function isRegisteredDelegate(address account) external view returns (bool);

    /// @notice Get total vTON delegated to a delegate
    /// @param delegate The delegate address
    /// @return Total delegated amount
    function getTotalDelegated(address delegate) external view returns (uint256);

    /// @notice Get delegation info for an owner to a specific delegate
    /// @param owner The vTON owner
    /// @param delegate The delegate
    /// @return The delegation info
    function getDelegation(
        address owner,
        address delegate
    ) external view returns (DelegationInfo memory);

    /// @notice Get voting power of a delegate at a specific block
    /// @param delegate The delegate address
    /// @param blockNumber The block to check
    /// @param snapshotBlock The proposal snapshot block
    /// @return Voting power (only includes delegations made 7+ days before snapshot)
    function getVotingPower(
        address delegate,
        uint256 blockNumber,
        uint256 snapshotBlock
    ) external view returns (uint256);

    /// @notice Get the minimum delegation period for voting power
    /// @return Period in seconds
    function delegationPeriodRequirement() external view returns (uint256);

    /// @notice Set the delegation period requirement
    /// @param period New period in seconds
    function setDelegationPeriodRequirement(uint256 period) external;

    /// @notice Get the auto-expiry period (0 = no expiry)
    /// @return Period in seconds
    function autoExpiryPeriod() external view returns (uint256);

    /// @notice Set the auto-expiry period
    /// @param period New period in seconds (0 to disable)
    function setAutoExpiryPeriod(uint256 period) external;
}
