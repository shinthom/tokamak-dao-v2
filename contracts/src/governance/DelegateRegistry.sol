// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Checkpoints } from "@openzeppelin/contracts/utils/structs/Checkpoints.sol";

import { IDelegateRegistry } from "../interfaces/IDelegateRegistry.sol";

/// @title DelegateRegistry - vTON Delegation Management
/// @notice Manages delegator registration and vTON delegation
/// @dev Key features per vTON DAO Governance Model:
///      - Delegators must register with profile, voting philosophy, interests
///      - vTON holders MUST delegate to vote (cannot vote directly)
///      - Delegation cap: 20% of total supply per delegator
///      - 7-day minimum delegation period for voting power
///      - Optional auto-expiry for delegations
contract DelegateRegistry is IDelegateRegistry, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Checkpoints for Checkpoints.Trace208;

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error NotRegisteredDelegator();
    error AlreadyRegisteredDelegator();
    error DelegatorNotActive();
    error DelegationCapExceeded();
    error InsufficientDelegation();
    error ZeroAmount();
    error ZeroAddress();
    error InvalidCap();
    error SelfDelegationNotAllowed();
    error EmptyProfile();
    error DelegationExpired();

    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Maximum delegation cap (100%)
    uint256 public constant MAX_CAP = 10_000; // 100% in basis points

    /// @notice Default delegation cap (20%)
    uint256 public constant DEFAULT_CAP = 2000; // 20% in basis points

    /// @notice Default delegation period requirement (7 days)
    uint256 public constant DEFAULT_PERIOD = 7 days;

    /*//////////////////////////////////////////////////////////////
                                 STATE
    //////////////////////////////////////////////////////////////*/

    /// @notice The vTON token contract
    IERC20 public immutable vTON;

    /// @notice Delegation cap in basis points (2000 = 20%)
    uint256 public override delegationCap;

    /// @notice Minimum delegation period for voting power (in seconds)
    uint256 public override delegationPeriodRequirement;

    /// @notice Auto-expiry period for delegations (0 = no expiry)
    uint256 public override autoExpiryPeriod;

    /// @notice Registered delegators
    mapping(address => DelegatorInfo) private _delegators;

    /// @notice Delegations: owner => delegator => DelegationInfo
    mapping(address => mapping(address => DelegationInfo)) private _delegations;

    /// @notice Total delegated to each delegator
    mapping(address => uint256) private _totalDelegated;

    /// @notice Total delegated by each owner
    mapping(address => uint256) private _totalDelegatedBy;

    /// @notice Historical voting power checkpoints for each delegator
    mapping(address => Checkpoints.Trace208) private _votingPowerCheckpoints;

    /// @notice List of all registered delegator addresses
    address[] private _delegatorList;

    /// @notice Delegation timestamps for voting power calculation
    /// @dev delegator => owner => delegatedAt timestamp
    mapping(address => mapping(address => uint256)) private _delegationTimestamps;

    /// @notice List of addresses that delegated to each delegator
    /// @dev delegator => list of owners who delegated to them
    mapping(address => address[]) private _delegatorsToOwners;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @notice Deploy the DelegateRegistry
    /// @param vTON_ The vTON token address
    /// @param initialOwner The initial owner (DAO governance)
    constructor(address vTON_, address initialOwner) Ownable(initialOwner) {
        if (vTON_ == address(0) || initialOwner == address(0)) revert ZeroAddress();

        vTON = IERC20(vTON_);
        delegationCap = DEFAULT_CAP;
        delegationPeriodRequirement = DEFAULT_PERIOD;
        autoExpiryPeriod = 0; // No expiry by default
    }

    /*//////////////////////////////////////////////////////////////
                         DELEGATOR REGISTRATION
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IDelegateRegistry
    function registerDelegator(
        string calldata profile,
        string calldata votingPhilosophy,
        string calldata interests
    ) external override {
        if (bytes(profile).length == 0) revert EmptyProfile();
        if (_delegators[msg.sender].registeredAt != 0) revert AlreadyRegisteredDelegator();

        _delegators[msg.sender] = DelegatorInfo({
            profile: profile,
            votingPhilosophy: votingPhilosophy,
            interests: interests,
            registeredAt: block.timestamp,
            isActive: true
        });

        _delegatorList.push(msg.sender);

        emit DelegatorRegistered(msg.sender, profile, votingPhilosophy, interests);
    }

    /// @inheritdoc IDelegateRegistry
    function updateDelegator(
        string calldata profile,
        string calldata votingPhilosophy,
        string calldata interests
    ) external override {
        if (bytes(profile).length == 0) revert EmptyProfile();
        DelegatorInfo storage info = _delegators[msg.sender];
        if (info.registeredAt == 0) revert NotRegisteredDelegator();

        info.profile = profile;
        info.votingPhilosophy = votingPhilosophy;
        info.interests = interests;

        emit DelegatorUpdated(msg.sender, profile, votingPhilosophy, interests);
    }

    /// @inheritdoc IDelegateRegistry
    function deactivateDelegator() external override {
        DelegatorInfo storage info = _delegators[msg.sender];
        if (info.registeredAt == 0) revert NotRegisteredDelegator();

        info.isActive = false;

        emit DelegatorDeactivated(msg.sender);
    }

    /*//////////////////////////////////////////////////////////////
                              DELEGATION
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IDelegateRegistry
    function delegate(address delegator, uint256 amount) external override nonReentrant {
        if (delegator == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (delegator == msg.sender) revert SelfDelegationNotAllowed();

        DelegatorInfo storage info = _delegators[delegator];
        if (info.registeredAt == 0 || !info.isActive) revert DelegatorNotActive();

        // Check delegation cap
        uint256 totalSupply = vTON.totalSupply();
        uint256 maxDelegation = (totalSupply * delegationCap) / MAX_CAP;
        if (_totalDelegated[delegator] + amount > maxDelegation) {
            revert DelegationCapExceeded();
        }

        // Transfer vTON to this contract
        vTON.safeTransferFrom(msg.sender, address(this), amount);

        // Update delegation info
        DelegationInfo storage delegation = _delegations[msg.sender][delegator];
        delegation.delegator = delegator;
        delegation.amount += amount;
        delegation.delegatedAt = block.timestamp;

        // Set expiry if auto-expiry is enabled
        if (autoExpiryPeriod > 0) {
            delegation.expiresAt = block.timestamp + autoExpiryPeriod;
        }

        // Update totals
        _totalDelegated[delegator] += amount;
        _totalDelegatedBy[msg.sender] += amount;

        // Record delegation timestamp for voting power calculation
        // Only add to owners list if this is a new delegation
        if (_delegationTimestamps[delegator][msg.sender] == 0) {
            _delegatorsToOwners[delegator].push(msg.sender);
        }
        _delegationTimestamps[delegator][msg.sender] = block.timestamp;

        // Update voting power checkpoint
        _updateVotingPowerCheckpoint(delegator);

        emit Delegated(msg.sender, delegator, amount, delegation.expiresAt);
    }

    /// @inheritdoc IDelegateRegistry
    function undelegate(address delegator, uint256 amount) external override nonReentrant {
        if (delegator == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        DelegationInfo storage delegation = _delegations[msg.sender][delegator];
        if (delegation.amount < amount) revert InsufficientDelegation();

        // Update delegation info
        delegation.amount -= amount;
        if (delegation.amount == 0) {
            delete _delegations[msg.sender][delegator];
            delete _delegationTimestamps[delegator][msg.sender];
        }

        // Update totals
        _totalDelegated[delegator] -= amount;
        _totalDelegatedBy[msg.sender] -= amount;

        // Update voting power checkpoint
        _updateVotingPowerCheckpoint(delegator);

        // Return vTON to owner
        vTON.safeTransfer(msg.sender, amount);

        emit Undelegated(msg.sender, delegator, amount);
    }

    /// @inheritdoc IDelegateRegistry
    function redelegate(
        address fromDelegator,
        address toDelegator,
        uint256 amount
    ) external override nonReentrant {
        if (fromDelegator == address(0) || toDelegator == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (toDelegator == msg.sender) revert SelfDelegationNotAllowed();

        DelegatorInfo storage toInfo = _delegators[toDelegator];
        if (toInfo.registeredAt == 0 || !toInfo.isActive) revert DelegatorNotActive();

        DelegationInfo storage fromDelegation = _delegations[msg.sender][fromDelegator];
        if (fromDelegation.amount < amount) revert InsufficientDelegation();

        // Check delegation cap for new delegator
        uint256 totalSupply = vTON.totalSupply();
        uint256 maxDelegation = (totalSupply * delegationCap) / MAX_CAP;
        if (_totalDelegated[toDelegator] + amount > maxDelegation) {
            revert DelegationCapExceeded();
        }

        // Update from delegation
        fromDelegation.amount -= amount;
        if (fromDelegation.amount == 0) {
            delete _delegations[msg.sender][fromDelegator];
            delete _delegationTimestamps[fromDelegator][msg.sender];
        }
        _totalDelegated[fromDelegator] -= amount;

        // Update to delegation
        DelegationInfo storage toDelegation = _delegations[msg.sender][toDelegator];
        toDelegation.delegator = toDelegator;
        toDelegation.amount += amount;
        toDelegation.delegatedAt = block.timestamp;
        if (autoExpiryPeriod > 0) {
            toDelegation.expiresAt = block.timestamp + autoExpiryPeriod;
        }
        _totalDelegated[toDelegator] += amount;

        // Record new delegation timestamp
        _delegationTimestamps[toDelegator][msg.sender] = block.timestamp;

        // Update voting power checkpoints
        _updateVotingPowerCheckpoint(fromDelegator);
        _updateVotingPowerCheckpoint(toDelegator);

        emit Undelegated(msg.sender, fromDelegator, amount);
        emit Delegated(msg.sender, toDelegator, amount, toDelegation.expiresAt);
    }

    /*//////////////////////////////////////////////////////////////
                              VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IDelegateRegistry
    function getDelegatorInfo(
        address delegator
    ) external view override returns (DelegatorInfo memory) {
        return _delegators[delegator];
    }

    /// @inheritdoc IDelegateRegistry
    function isRegisteredDelegator(address account) external view override returns (bool) {
        return _delegators[account].registeredAt != 0 && _delegators[account].isActive;
    }

    /// @inheritdoc IDelegateRegistry
    function getTotalDelegated(address delegator) external view override returns (uint256) {
        return _totalDelegated[delegator];
    }

    /// @inheritdoc IDelegateRegistry
    function getDelegation(
        address owner,
        address delegator
    ) external view override returns (DelegationInfo memory) {
        return _delegations[owner][delegator];
    }

    /// @inheritdoc IDelegateRegistry
    /// @dev Only counts delegations made 7+ days before the snapshot block
    function getVotingPower(
        address delegator,
        uint256, /* blockNumber */
        uint256 /* snapshotBlock */
    ) external view override returns (uint256) {
        // Calculate the cutoff timestamp (7 days before current time)
        // Note: In production, you'd use block numbers or a timestamp oracle
        uint256 cutoffTime = block.timestamp - delegationPeriodRequirement;

        uint256 votingPower = 0;
        address[] storage owners = _delegatorsToOwners[delegator];
        uint256 len = owners.length;

        for (uint256 i = 0; i < len; i++) {
            address owner = owners[i];
            uint256 delegatedAt = _delegationTimestamps[delegator][owner];

            if (delegatedAt > 0 && delegatedAt <= cutoffTime) {
                DelegationInfo memory delegation = _delegations[owner][delegator];
                if (delegation.amount > 0) {
                    // Check if not expired
                    if (delegation.expiresAt == 0 || delegation.expiresAt > block.timestamp) {
                        votingPower += delegation.amount;
                    }
                }
            }
        }

        return votingPower;
    }

    /// @notice Get all registered delegators
    /// @return Array of delegator addresses
    function getAllDelegators() external view returns (address[] memory) {
        return _delegatorList;
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
    function setDelegationCap(uint256 cap) external override onlyOwner {
        if (cap > MAX_CAP) revert InvalidCap();

        uint256 oldCap = delegationCap;
        delegationCap = cap;

        emit DelegationCapUpdated(oldCap, cap);
    }

    /// @inheritdoc IDelegateRegistry
    function setDelegationPeriodRequirement(uint256 period) external override onlyOwner {
        uint256 oldPeriod = delegationPeriodRequirement;
        delegationPeriodRequirement = period;

        emit DelegationPeriodUpdated(oldPeriod, period);
    }

    /// @inheritdoc IDelegateRegistry
    function setAutoExpiryPeriod(uint256 period) external override onlyOwner {
        uint256 oldExpiry = autoExpiryPeriod;
        autoExpiryPeriod = period;

        emit AutoExpiryUpdated(oldExpiry, period);
    }

    /*//////////////////////////////////////////////////////////////
                          INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @dev Update voting power checkpoint for a delegator
    function _updateVotingPowerCheckpoint(address delegator) internal {
        uint208 newPower = uint208(_totalDelegated[delegator]);
        _votingPowerCheckpoints[delegator].push(uint48(block.number), newPower);
    }
}
