// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IDAOGovernor Interface
/// @notice Interface for the DAO Governor contract
/// @dev Implements the vTON DAO governance model with:
///      - Proposal creation with TON burn (100 TON)
///      - Snapshot-based voting power
///      - 7-day on-chain voting period
///      - 4% quorum requirement
///      - Majority pass rate
///      - Timelock execution
interface IDAOGovernor {
    /// @notice Proposal state enum
    enum ProposalState {
        Pending, // Created, waiting for voting to start
        Active, // Voting is active
        Canceled, // Proposal was canceled
        Defeated, // Did not reach quorum or pass rate
        Succeeded, // Passed, waiting for queue
        Queued, // In timelock queue
        Expired, // Timelock expired without execution
        Executed // Successfully executed

    }

    /// @notice Vote type enum
    enum VoteType {
        Against, // No vote
        For, // Yes vote
        Abstain // Abstain (counts for quorum but not pass rate)

    }

    /// @notice Proposal structure
    struct Proposal {
        uint256 id;
        address proposer;
        address[] targets;
        uint256[] values;
        bytes[] calldatas;
        string description;
        uint256 snapshotBlock;
        uint256 voteStart;
        uint256 voteEnd;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool canceled;
        bool executed;
    }

    /// @notice Emitted when a proposal is created
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address[] targets,
        uint256[] values,
        bytes[] calldatas,
        string description,
        uint256 snapshotBlock,
        uint256 voteStart,
        uint256 voteEnd
    );

    /// @notice Emitted when a vote is cast
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        VoteType support,
        uint256 weight,
        string reason
    );

    /// @notice Emitted when a proposal is canceled
    event ProposalCanceled(uint256 indexed proposalId);

    /// @notice Emitted when a proposal is queued for execution
    event ProposalQueued(uint256 indexed proposalId, uint256 eta);

    /// @notice Emitted when a proposal is executed
    event ProposalExecuted(uint256 indexed proposalId);

    /// @notice Emitted when quorum is updated
    event QuorumUpdated(uint256 oldQuorum, uint256 newQuorum);

    /// @notice Emitted when proposal creation cost is updated
    event ProposalCostUpdated(uint256 oldCost, uint256 newCost);

    /// @notice Create a new proposal
    /// @param targets Target addresses for calls
    /// @param values ETH values for calls
    /// @param calldatas Calldata for each call
    /// @param description Human-readable description
    /// @return proposalId The unique proposal ID
    /// @dev Requires burning proposalCreationCost TON
    function propose(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas,
        string calldata description
    ) external returns (uint256 proposalId);

    /// @notice Cast a vote on a proposal
    /// @param proposalId The proposal ID
    /// @param support The vote type (Against, For, Abstain)
    function castVote(uint256 proposalId, VoteType support) external;

    /// @notice Cast a vote with reason
    /// @param proposalId The proposal ID
    /// @param support The vote type
    /// @param reason The reason for the vote
    function castVoteWithReason(
        uint256 proposalId,
        VoteType support,
        string calldata reason
    ) external;

    /// @notice Queue a successful proposal for execution
    /// @param proposalId The proposal ID
    function queue(uint256 proposalId) external;

    /// @notice Execute a queued proposal
    /// @param proposalId The proposal ID
    function execute(uint256 proposalId) external payable;

    /// @notice Cancel a proposal
    /// @param proposalId The proposal ID
    /// @dev Only proposer can cancel, and only before execution
    function cancel(uint256 proposalId) external;

    /// @notice Get the current state of a proposal
    /// @param proposalId The proposal ID
    /// @return The proposal state
    function state(uint256 proposalId) external view returns (ProposalState);

    /// @notice Get proposal details
    /// @param proposalId The proposal ID
    /// @return The proposal struct
    function getProposal(uint256 proposalId) external view returns (Proposal memory);

    /// @notice Check if an account has voted on a proposal
    /// @param proposalId The proposal ID
    /// @param account The account to check
    /// @return True if the account has voted
    function hasVoted(uint256 proposalId, address account) external view returns (bool);

    /// @notice Get the vote receipt for an account
    /// @param proposalId The proposal ID
    /// @param voter The voter address
    /// @return support The vote type
    /// @return weight The voting weight
    function getVoteReceipt(
        uint256 proposalId,
        address voter
    ) external view returns (VoteType support, uint256 weight);

    /// @notice Get the quorum requirement (basis points of total delegated vTON)
    /// @return Quorum in basis points (400 = 4%)
    function quorum() external view returns (uint256);

    /// @notice Set the quorum requirement
    /// @param newQuorum New quorum in basis points
    function setQuorum(uint256 newQuorum) external;

    /// @notice Get the proposal creation cost in TON
    /// @return Cost in TON (wei)
    function proposalCreationCost() external view returns (uint256);

    /// @notice Set the proposal creation cost
    /// @param newCost New cost in TON
    function setProposalCreationCost(uint256 newCost) external;

    /// @notice Get the voting period in blocks
    /// @return Period in blocks
    function votingPeriod() external view returns (uint256);

    /// @notice Get the voting delay (time between proposal creation and vote start)
    /// @return Delay in blocks
    function votingDelay() external view returns (uint256);

    /// @notice Get the timelock address
    /// @return The timelock contract address
    function timelock() external view returns (address);

    /// @notice Hash a proposal for ID generation
    /// @param targets Target addresses
    /// @param values ETH values
    /// @param calldatas Calldata
    /// @param descriptionHash Hash of description
    /// @return The proposal ID
    function hashProposal(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas,
        bytes32 descriptionHash
    ) external pure returns (uint256);
}
