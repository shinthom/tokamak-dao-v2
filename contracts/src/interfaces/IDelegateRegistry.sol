// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IDelegateRegistry Interface
/// @notice Interface for the Delegate Registry contract
/// @dev Manages delegator registration and vTON delegation
///      Key features:
///      - Delegators must register with profile, voting philosophy, and interests
///      - vTON holders must delegate to vote (cannot vote directly)
///      - Delegation cap of 20% per delegator to prevent concentration
///      - 7-day minimum delegation period for voting power recognition
interface IDelegateRegistry {
    /// @notice Delegator information structure
    struct DelegatorInfo {
        string profile; // Identity or pseudonym
        string votingPhilosophy; // Decision-making criteria
        string interests; // Affiliations, investments, consulting relationships
        uint256 registeredAt; // Registration timestamp
        bool isActive; // Whether the delegator is active
    }

    /// @notice Delegation information structure
    struct DelegationInfo {
        address delegator; // The delegator receiving the delegation
        uint256 amount; // Amount of vTON delegated
        uint256 delegatedAt; // When the delegation was made
        uint256 expiresAt; // When the delegation expires (0 = no expiry)
    }

    /// @notice Emitted when a delegator registers
    event DelegatorRegistered(
        address indexed delegator, string profile, string votingPhilosophy, string interests
    );

    /// @notice Emitted when a delegator updates their info
    event DelegatorUpdated(
        address indexed delegator, string profile, string votingPhilosophy, string interests
    );

    /// @notice Emitted when a delegator is deactivated
    event DelegatorDeactivated(address indexed delegator);

    /// @notice Emitted when vTON is delegated
    event Delegated(
        address indexed owner, address indexed delegator, uint256 amount, uint256 expiresAt
    );

    /// @notice Emitted when delegation is withdrawn
    event Undelegated(address indexed owner, address indexed delegator, uint256 amount);

    /// @notice Emitted when delegation cap is updated
    event DelegationCapUpdated(uint256 oldCap, uint256 newCap);

    /// @notice Emitted when delegation period requirement is updated
    event DelegationPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);

    /// @notice Emitted when auto-expiry period is updated
    event AutoExpiryUpdated(uint256 oldExpiry, uint256 newExpiry);

    /// @notice Register as a delegator
    /// @param profile Identity or pseudonym
    /// @param votingPhilosophy Voting philosophy and decision criteria
    /// @param interests Interests disclosure (affiliations, investments, etc.)
    function registerDelegator(
        string calldata profile,
        string calldata votingPhilosophy,
        string calldata interests
    ) external;

    /// @notice Update delegator information
    /// @param profile New profile
    /// @param votingPhilosophy New voting philosophy
    /// @param interests New interests disclosure
    function updateDelegator(
        string calldata profile,
        string calldata votingPhilosophy,
        string calldata interests
    ) external;

    /// @notice Deactivate as a delegator
    function deactivateDelegator() external;

    /// @notice Delegate vTON to a delegator
    /// @param delegator The delegator address
    /// @param amount Amount of vTON to delegate
    function delegate(address delegator, uint256 amount) external;

    /// @notice Withdraw delegation from a delegator
    /// @param delegator The delegator address
    /// @param amount Amount to undelegate
    function undelegate(address delegator, uint256 amount) external;

    /// @notice Redelegate from one delegator to another
    /// @param fromDelegator Current delegator
    /// @param toDelegator New delegator
    /// @param amount Amount to redelegate
    function redelegate(address fromDelegator, address toDelegator, uint256 amount) external;

    /// @notice Get delegator information
    /// @param delegator The delegator address
    /// @return The delegator info struct
    function getDelegatorInfo(address delegator) external view returns (DelegatorInfo memory);

    /// @notice Check if an address is a registered delegator
    /// @param account The address to check
    /// @return True if registered and active
    function isRegisteredDelegator(address account) external view returns (bool);

    /// @notice Get total vTON delegated to a delegator
    /// @param delegator The delegator address
    /// @return Total delegated amount
    function getTotalDelegated(address delegator) external view returns (uint256);

    /// @notice Get delegation info for an owner to a specific delegator
    /// @param owner The vTON owner
    /// @param delegator The delegator
    /// @return The delegation info
    function getDelegation(
        address owner,
        address delegator
    ) external view returns (DelegationInfo memory);

    /// @notice Get voting power of a delegator at a specific block
    /// @param delegator The delegator address
    /// @param blockNumber The block to check
    /// @param snapshotBlock The proposal snapshot block
    /// @return Voting power (only includes delegations made 7+ days before snapshot)
    function getVotingPower(
        address delegator,
        uint256 blockNumber,
        uint256 snapshotBlock
    ) external view returns (uint256);

    /// @notice Get the delegation cap (percentage of total supply)
    /// @return Cap in basis points (2000 = 20%)
    function delegationCap() external view returns (uint256);

    /// @notice Set the delegation cap
    /// @param cap New cap in basis points
    function setDelegationCap(uint256 cap) external;

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
