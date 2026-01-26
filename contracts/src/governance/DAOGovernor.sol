// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { IDAOGovernor } from "../interfaces/IDAOGovernor.sol";
import { IDelegateRegistry } from "../interfaces/IDelegateRegistry.sol";

/// @title DAOGovernor - vTON DAO Governance
/// @notice Main governance contract for Tokamak Network DAO
/// @dev Implements vTON DAO Governance Model:
///      - Proposal creation requires burning 100 TON
///      - Snapshot-based voting power (7-day delegation requirement)
///      - 7-day on-chain voting period
///      - 4% quorum of total delegated vTON
///      - Simple majority pass rate
///      - 7-day timelock before execution
contract DAOGovernor is IDAOGovernor, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error InvalidProposal();
    error ProposalNotFound();
    error ProposalNotActive();
    error ProposalNotSucceeded();
    error ProposalNotQueued();
    error ProposalAlreadyExecuted();
    error ProposalAlreadyCanceled();
    error AlreadyVoted();
    error NotProposer();
    error InvalidVoteType();
    error VotingNotStarted();
    error VotingEnded();
    error QuorumNotReached();
    error TimelockNotReady();
    error TimelockExpired();
    error ExecutionFailed();
    error ZeroAddress();
    error ArrayLengthMismatch();
    error NotDelegator();
    error InsufficientTON();

    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Default proposal creation cost (100 TON)
    uint256 public constant DEFAULT_PROPOSAL_COST = 100 ether;

    /// @notice Default quorum (4% = 400 basis points)
    uint256 public constant DEFAULT_QUORUM = 400;

    /// @notice Basis points denominator
    uint256 public constant BASIS_POINTS = 10_000;

    /// @notice Default voting delay (1 day in blocks, ~7200 blocks)
    uint256 public constant DEFAULT_VOTING_DELAY = 7200;

    /// @notice Default voting period (7 days in blocks, ~50400 blocks)
    uint256 public constant DEFAULT_VOTING_PERIOD = 50_400;

    /// @notice Timelock delay (7 days)
    uint256 public constant TIMELOCK_DELAY = 7 days;

    /// @notice Timelock grace period (14 days after eta)
    uint256 public constant TIMELOCK_GRACE_PERIOD = 14 days;

    /*//////////////////////////////////////////////////////////////
                                 STATE
    //////////////////////////////////////////////////////////////*/

    /// @notice The TON token (for proposal creation cost)
    IERC20 public immutable ton;

    /// @notice The vTON token
    IERC20 public immutable vTON;

    /// @notice The delegate registry
    IDelegateRegistry public immutable delegateRegistry;

    /// @notice The timelock contract address
    address public override timelock;

    /// @notice Proposal creation cost in TON
    uint256 public override proposalCreationCost;

    /// @notice Quorum in basis points
    uint256 public override quorum;

    /// @notice Voting delay in blocks
    uint256 public override votingDelay;

    /// @notice Voting period in blocks
    uint256 public override votingPeriod;

    /// @notice Proposal counter
    uint256 private _proposalCount;

    /// @notice Mapping from proposal ID to Proposal
    mapping(uint256 => Proposal) private _proposals;

    /// @notice Mapping from proposal ID to timelock eta
    mapping(uint256 => uint256) private _proposalEta;

    /// @notice Mapping from proposal ID to voter to hasVoted
    mapping(uint256 => mapping(address => bool)) private _hasVoted;

    /// @notice Mapping from proposal ID to voter to vote receipt
    mapping(uint256 => mapping(address => VoteReceipt)) private _voteReceipts;

    /// @notice Vote receipt structure
    struct VoteReceipt {
        VoteType support;
        uint256 weight;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @notice Deploy the DAOGovernor
    /// @param ton_ The TON token address
    /// @param vTON_ The vTON token address
    /// @param delegateRegistry_ The delegate registry address
    /// @param timelock_ The timelock controller address
    /// @param initialOwner The initial owner (for parameter updates)
    constructor(
        address ton_,
        address vTON_,
        address delegateRegistry_,
        address timelock_,
        address initialOwner
    ) Ownable(initialOwner) {
        if (
            ton_ == address(0) || vTON_ == address(0) || delegateRegistry_ == address(0)
                || timelock_ == address(0) || initialOwner == address(0)
        ) {
            revert ZeroAddress();
        }

        ton = IERC20(ton_);
        vTON = IERC20(vTON_);
        delegateRegistry = IDelegateRegistry(delegateRegistry_);
        timelock = timelock_;

        proposalCreationCost = DEFAULT_PROPOSAL_COST;
        quorum = DEFAULT_QUORUM;
        votingDelay = DEFAULT_VOTING_DELAY;
        votingPeriod = DEFAULT_VOTING_PERIOD;
    }

    /*//////////////////////////////////////////////////////////////
                           PROPOSAL LIFECYCLE
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IDAOGovernor
    function propose(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas,
        string calldata description
    ) external override nonReentrant returns (uint256 proposalId) {
        if (targets.length == 0) revert InvalidProposal();
        if (targets.length != values.length || targets.length != calldatas.length) {
            revert ArrayLengthMismatch();
        }

        // Burn TON for proposal creation
        if (proposalCreationCost > 0) {
            ton.safeTransferFrom(msg.sender, address(0xdead), proposalCreationCost);
        }

        // Generate proposal ID
        proposalId = hashProposal(targets, values, calldatas, keccak256(bytes(description)));

        // Check proposal doesn't already exist
        if (_proposals[proposalId].snapshotBlock != 0) revert InvalidProposal();

        uint256 snapshot = block.number;
        uint256 voteStart = block.number + votingDelay;
        uint256 voteEnd = voteStart + votingPeriod;

        _proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: msg.sender,
            targets: targets,
            values: values,
            calldatas: calldatas,
            description: description,
            snapshotBlock: snapshot,
            voteStart: voteStart,
            voteEnd: voteEnd,
            forVotes: 0,
            againstVotes: 0,
            abstainVotes: 0,
            canceled: false,
            executed: false
        });

        _proposalCount++;

        emit ProposalCreated(
            proposalId, msg.sender, targets, values, calldatas, description, snapshot, voteStart, voteEnd
        );
    }

    /// @inheritdoc IDAOGovernor
    function castVote(uint256 proposalId, VoteType support) external override {
        _castVote(proposalId, support, "");
    }

    /// @inheritdoc IDAOGovernor
    function castVoteWithReason(
        uint256 proposalId,
        VoteType support,
        string calldata reason
    ) external override {
        _castVote(proposalId, support, reason);
    }

    /// @inheritdoc IDAOGovernor
    function queue(uint256 proposalId) external override {
        if (state(proposalId) != ProposalState.Succeeded) revert ProposalNotSucceeded();

        uint256 eta = block.timestamp + TIMELOCK_DELAY;
        _proposalEta[proposalId] = eta;

        emit ProposalQueued(proposalId, eta);
    }

    /// @inheritdoc IDAOGovernor
    function execute(uint256 proposalId) external payable override nonReentrant {
        ProposalState currentState = state(proposalId);
        if (currentState != ProposalState.Queued) revert ProposalNotQueued();

        uint256 eta = _proposalEta[proposalId];
        if (block.timestamp < eta) revert TimelockNotReady();
        if (block.timestamp > eta + TIMELOCK_GRACE_PERIOD) revert TimelockExpired();

        Proposal storage proposal = _proposals[proposalId];
        proposal.executed = true;

        // Execute all calls
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            (bool success,) =
                proposal.targets[i].call{ value: proposal.values[i] }(proposal.calldatas[i]);
            if (!success) revert ExecutionFailed();
        }

        emit ProposalExecuted(proposalId);
    }

    /// @inheritdoc IDAOGovernor
    function cancel(uint256 proposalId) external override {
        Proposal storage proposal = _proposals[proposalId];
        if (proposal.snapshotBlock == 0) revert ProposalNotFound();
        if (msg.sender != proposal.proposer) revert NotProposer();
        if (proposal.executed) revert ProposalAlreadyExecuted();
        if (proposal.canceled) revert ProposalAlreadyCanceled();

        proposal.canceled = true;

        emit ProposalCanceled(proposalId);
    }

    /*//////////////////////////////////////////////////////////////
                              VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IDAOGovernor
    function state(uint256 proposalId) public view override returns (ProposalState) {
        Proposal storage proposal = _proposals[proposalId];

        if (proposal.snapshotBlock == 0) revert ProposalNotFound();

        if (proposal.canceled) {
            return ProposalState.Canceled;
        }

        if (proposal.executed) {
            return ProposalState.Executed;
        }

        if (block.number < proposal.voteStart) {
            return ProposalState.Pending;
        }

        if (block.number <= proposal.voteEnd) {
            return ProposalState.Active;
        }

        // Voting ended - check results
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        uint256 totalDelegated = vTON.totalSupply(); // Simplified: use total supply as proxy
        uint256 requiredQuorum = (totalDelegated * quorum) / BASIS_POINTS;

        if (totalVotes < requiredQuorum) {
            return ProposalState.Defeated;
        }

        // Check pass rate (simple majority of for vs against)
        if (proposal.forVotes <= proposal.againstVotes) {
            return ProposalState.Defeated;
        }

        // Check if queued
        uint256 eta = _proposalEta[proposalId];
        if (eta == 0) {
            return ProposalState.Succeeded;
        }

        if (block.timestamp > eta + TIMELOCK_GRACE_PERIOD) {
            return ProposalState.Expired;
        }

        return ProposalState.Queued;
    }

    /// @inheritdoc IDAOGovernor
    function getProposal(uint256 proposalId) external view override returns (Proposal memory) {
        return _proposals[proposalId];
    }

    /// @inheritdoc IDAOGovernor
    function hasVoted(uint256 proposalId, address account) external view override returns (bool) {
        return _hasVoted[proposalId][account];
    }

    /// @inheritdoc IDAOGovernor
    function getVoteReceipt(
        uint256 proposalId,
        address voter
    ) external view override returns (VoteType support, uint256 weight) {
        VoteReceipt memory receipt = _voteReceipts[proposalId][voter];
        return (receipt.support, receipt.weight);
    }

    /// @inheritdoc IDAOGovernor
    function hashProposal(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas,
        bytes32 descriptionHash
    ) public pure override returns (uint256) {
        return uint256(keccak256(abi.encode(targets, values, calldatas, descriptionHash)));
    }

    /// @notice Get proposal count
    /// @return Total number of proposals
    function proposalCount() external view returns (uint256) {
        return _proposalCount;
    }

    /// @notice Get proposal eta (timelock)
    /// @param proposalId The proposal ID
    /// @return The eta timestamp
    function proposalEta(uint256 proposalId) external view returns (uint256) {
        return _proposalEta[proposalId];
    }

    /*//////////////////////////////////////////////////////////////
                           ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IDAOGovernor
    function setQuorum(uint256 newQuorum) external override onlyOwner {
        uint256 oldQuorum = quorum;
        quorum = newQuorum;
        emit QuorumUpdated(oldQuorum, newQuorum);
    }

    /// @inheritdoc IDAOGovernor
    function setProposalCreationCost(uint256 newCost) external override onlyOwner {
        uint256 oldCost = proposalCreationCost;
        proposalCreationCost = newCost;
        emit ProposalCostUpdated(oldCost, newCost);
    }

    /// @notice Set voting delay
    /// @param newDelay New delay in blocks
    function setVotingDelay(uint256 newDelay) external onlyOwner {
        votingDelay = newDelay;
    }

    /// @notice Set voting period
    /// @param newPeriod New period in blocks
    function setVotingPeriod(uint256 newPeriod) external onlyOwner {
        votingPeriod = newPeriod;
    }

    /// @notice Set timelock address
    /// @param newTimelock New timelock address
    function setTimelock(address newTimelock) external onlyOwner {
        if (newTimelock == address(0)) revert ZeroAddress();
        timelock = newTimelock;
    }

    /*//////////////////////////////////////////////////////////////
                          INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @dev Internal vote casting logic
    function _castVote(uint256 proposalId, VoteType support, string memory reason) internal {
        Proposal storage proposal = _proposals[proposalId];

        if (proposal.snapshotBlock == 0) revert ProposalNotFound();
        if (block.number < proposal.voteStart) revert VotingNotStarted();
        if (block.number > proposal.voteEnd) revert VotingEnded();
        if (_hasVoted[proposalId][msg.sender]) revert AlreadyVoted();

        // Only registered delegators can vote
        if (!delegateRegistry.isRegisteredDelegator(msg.sender)) {
            revert NotDelegator();
        }

        // Get voting power (only delegations made 7+ days before snapshot)
        uint256 weight =
            delegateRegistry.getVotingPower(msg.sender, proposal.snapshotBlock, proposal.snapshotBlock);

        // Record vote
        _hasVoted[proposalId][msg.sender] = true;
        _voteReceipts[proposalId][msg.sender] = VoteReceipt({ support: support, weight: weight });

        // Update vote counts
        if (support == VoteType.For) {
            proposal.forVotes += weight;
        } else if (support == VoteType.Against) {
            proposal.againstVotes += weight;
        } else if (support == VoteType.Abstain) {
            proposal.abstainVotes += weight;
        } else {
            revert InvalidVoteType();
        }

        emit VoteCast(msg.sender, proposalId, support, weight, reason);
    }

    /// @notice Receive ETH for proposal execution
    receive() external payable { }
}
