// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Checkpoints } from "@openzeppelin/contracts/utils/structs/Checkpoints.sol";

import { IDelegateRegistry } from "../interfaces/IDelegateRegistry.sol";

/// @title DelegateRegistry - vTON Delegation Management
/// @notice Manages delegate registration and vTON delegation
/// @dev Key features per vTON DAO Governance Model:
///      - Delegates must register with profile, voting philosophy, interests
///      - vTON holders MUST delegate to vote (cannot vote directly)
///      - Optional auto-expiry for delegations
contract DelegateRegistry is IDelegateRegistry, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Checkpoints for Checkpoints.Trace208;

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error NotRegisteredDelegate();
    error AlreadyRegisteredDelegate();
    error DelegateNotActive();
    error InsufficientDelegation();
    error ZeroAmount();
    error ZeroAddress();
    error EmptyProfile();
    error DelegationExpired();

    /*//////////////////////////////////////////////////////////////
                                 STATE
    //////////////////////////////////////////////////////////////*/

    /// @notice The vTON token contract
    IERC20 public immutable vTON;

    /// @notice Auto-expiry period for delegations (0 = no expiry)
    uint256 public override autoExpiryPeriod;

    /// @notice Registered delegates
    mapping(address => DelegateInfo) private _delegates;

    /// @notice Delegations: owner => delegate => DelegationInfo
    mapping(address => mapping(address => DelegationInfo)) private _delegations;

    /// @notice Total delegated to each delegate
    mapping(address => uint256) private _totalDelegated;

    /// @notice Total delegated by each owner
    mapping(address => uint256) private _totalDelegatedBy;

    /// @notice Historical voting power checkpoints for each delegate
    mapping(address => Checkpoints.Trace208) private _votingPowerCheckpoints;

    /// @notice List of all registered delegate addresses
    address[] private _delegateList;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @notice Deploy the DelegateRegistry
    /// @param vTON_ The vTON token address
    /// @param initialOwner The initial owner (DAO governance)
    constructor(address vTON_, address initialOwner) Ownable(initialOwner) {
        if (vTON_ == address(0) || initialOwner == address(0)) revert ZeroAddress();

        vTON = IERC20(vTON_);
        autoExpiryPeriod = 0; // No expiry by default
    }

    /*//////////////////////////////////////////////////////////////
                         DELEGATE REGISTRATION
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IDelegateRegistry
    function registerDelegate(
        string calldata profile,
        string calldata votingPhilosophy,
        string calldata interests
    ) external override {
        if (bytes(profile).length == 0) revert EmptyProfile();
        if (_delegates[msg.sender].registeredAt != 0) revert AlreadyRegisteredDelegate();

        _delegates[msg.sender] = DelegateInfo({
            profile: profile,
            votingPhilosophy: votingPhilosophy,
            interests: interests,
            registeredAt: block.timestamp,
            isActive: true
        });

        _delegateList.push(msg.sender);

        emit DelegateRegistered(msg.sender, profile, votingPhilosophy, interests);
    }

    /// @inheritdoc IDelegateRegistry
    function updateDelegate(
        string calldata profile,
        string calldata votingPhilosophy,
        string calldata interests
    ) external override {
        if (bytes(profile).length == 0) revert EmptyProfile();
        DelegateInfo storage info = _delegates[msg.sender];
        if (info.registeredAt == 0) revert NotRegisteredDelegate();

        info.profile = profile;
        info.votingPhilosophy = votingPhilosophy;
        info.interests = interests;

        emit DelegateUpdated(msg.sender, profile, votingPhilosophy, interests);
    }

    /// @inheritdoc IDelegateRegistry
    function deactivateDelegate() external override {
        DelegateInfo storage info = _delegates[msg.sender];
        if (info.registeredAt == 0) revert NotRegisteredDelegate();

        info.isActive = false;

        emit DelegateDeactivated(msg.sender);
    }

    /*//////////////////////////////////////////////////////////////
                              DELEGATION
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IDelegateRegistry
    function delegate(address delegateAddr, uint256 amount) external override nonReentrant {
        if (delegateAddr == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        DelegateInfo storage info = _delegates[delegateAddr];
        if (info.registeredAt == 0 || !info.isActive) revert DelegateNotActive();

        // Transfer vTON to this contract
        vTON.safeTransferFrom(msg.sender, address(this), amount);

        // Update delegation info
        DelegationInfo storage delegation = _delegations[msg.sender][delegateAddr];
        delegation.delegate = delegateAddr;
        delegation.amount += amount;
        delegation.delegatedAt = block.timestamp;

        // Set expiry if auto-expiry is enabled
        if (autoExpiryPeriod > 0) {
            delegation.expiresAt = block.timestamp + autoExpiryPeriod;
        }

        // Update totals
        _totalDelegated[delegateAddr] += amount;
        _totalDelegatedBy[msg.sender] += amount;

        // Update voting power checkpoint
        _updateVotingPowerCheckpoint(delegateAddr);

        emit Delegated(msg.sender, delegateAddr, amount, delegation.expiresAt);
    }

    /// @inheritdoc IDelegateRegistry
    function undelegate(address delegateAddr, uint256 amount) external override nonReentrant {
        if (delegateAddr == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        DelegationInfo storage delegation = _delegations[msg.sender][delegateAddr];
        if (delegation.amount < amount) revert InsufficientDelegation();

        // Update delegation info
        delegation.amount -= amount;
        if (delegation.amount == 0) {
            delete _delegations[msg.sender][delegateAddr];
        }

        // Update totals
        _totalDelegated[delegateAddr] -= amount;
        _totalDelegatedBy[msg.sender] -= amount;

        // Update voting power checkpoint
        _updateVotingPowerCheckpoint(delegateAddr);

        // Return vTON to owner
        vTON.safeTransfer(msg.sender, amount);

        emit Undelegated(msg.sender, delegateAddr, amount);
    }

    /// @inheritdoc IDelegateRegistry
    function redelegate(
        address fromDelegate,
        address toDelegate,
        uint256 amount
    ) external override nonReentrant {
        if (fromDelegate == address(0) || toDelegate == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        DelegateInfo storage toInfo = _delegates[toDelegate];
        if (toInfo.registeredAt == 0 || !toInfo.isActive) revert DelegateNotActive();

        DelegationInfo storage fromDelegation = _delegations[msg.sender][fromDelegate];
        if (fromDelegation.amount < amount) revert InsufficientDelegation();

        // Update from delegation
        fromDelegation.amount -= amount;
        if (fromDelegation.amount == 0) {
            delete _delegations[msg.sender][fromDelegate];
        }
        _totalDelegated[fromDelegate] -= amount;

        // Update to delegation
        DelegationInfo storage toDelegation = _delegations[msg.sender][toDelegate];
        toDelegation.delegate = toDelegate;
        toDelegation.amount += amount;
        toDelegation.delegatedAt = block.timestamp;
        if (autoExpiryPeriod > 0) {
            toDelegation.expiresAt = block.timestamp + autoExpiryPeriod;
        }
        _totalDelegated[toDelegate] += amount;

        // Update voting power checkpoints
        _updateVotingPowerCheckpoint(fromDelegate);
        _updateVotingPowerCheckpoint(toDelegate);

        emit Undelegated(msg.sender, fromDelegate, amount);
        emit Delegated(msg.sender, toDelegate, amount, toDelegation.expiresAt);
    }

    /*//////////////////////////////////////////////////////////////
                              VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IDelegateRegistry
    function getDelegateInfo(
        address delegateAddr
    ) external view override returns (DelegateInfo memory) {
        return _delegates[delegateAddr];
    }

    /// @inheritdoc IDelegateRegistry
    function isRegisteredDelegate(address account) external view override returns (bool) {
        return _delegates[account].registeredAt != 0 && _delegates[account].isActive;
    }

    /// @inheritdoc IDelegateRegistry
    function getTotalDelegated(address delegateAddr) external view override returns (uint256) {
        return _totalDelegated[delegateAddr];
    }

    /// @inheritdoc IDelegateRegistry
    function getDelegation(
        address owner,
        address delegateAddr
    ) external view override returns (DelegationInfo memory) {
        return _delegations[owner][delegateAddr];
    }

    /// @inheritdoc IDelegateRegistry
    function getVotingPower(
        address delegateAddr,
        uint256, /* blockNumber */
        uint256 /* snapshotBlock */
    ) external view override returns (uint256) {
        return _totalDelegated[delegateAddr];
    }

    /// @notice Get all registered delegates
    /// @return Array of delegate addresses
    function getAllDelegates() external view returns (address[] memory) {
        return _delegateList;
    }

    /// @notice Get total vTON delegated by an owner
    /// @param owner The owner address
    /// @return Total amount delegated
    function getTotalDelegatedBy(address owner) external view returns (uint256) {
        return _totalDelegatedBy[owner];
    }

    /*//////////////////////////////////////////////////////////////
                           ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IDelegateRegistry
    function setAutoExpiryPeriod(uint256 period) external override onlyOwner {
        uint256 oldExpiry = autoExpiryPeriod;
        autoExpiryPeriod = period;

        emit AutoExpiryUpdated(oldExpiry, period);
    }

    /*//////////////////////////////////////////////////////////////
                          INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @dev Update voting power checkpoint for a delegate
    function _updateVotingPowerCheckpoint(address delegateAddr) internal {
        uint208 newPower = uint208(_totalDelegated[delegateAddr]);
        _votingPowerCheckpoints[delegateAddr].push(uint48(block.number), newPower);
    }
}
