/**
 * Governance Types for vTON DAO
 */

// Proposal Status
export type ProposalStatus =
  | "active"
  | "pending"
  | "executed"
  | "defeated"
  | "canceled"
  | "queued"
  | "succeeded"
  | "expired";

// Proposal State from Contract (numeric enum)
export enum ProposalState {
  Pending = 0,
  Active = 1,
  Canceled = 2,
  Defeated = 3,
  Succeeded = 4,
  Queued = 5,
  Expired = 6,
  Executed = 7,
}

// Vote Type for casting votes
// IMPORTANT: Must match contract enum order (Against=0, For=1, Abstain=2)
export enum VoteType {
  Against = 0,
  For = 1,
  Abstain = 2,
}

// Map contract state to UI status
export function mapProposalState(state: ProposalState): ProposalStatus {
  switch (state) {
    case ProposalState.Pending:
      return "pending";
    case ProposalState.Active:
      return "active";
    case ProposalState.Canceled:
      return "canceled";
    case ProposalState.Defeated:
      return "defeated";
    case ProposalState.Succeeded:
      return "succeeded";
    case ProposalState.Queued:
      return "queued";
    case ProposalState.Expired:
      return "expired";
    case ProposalState.Executed:
      return "executed";
    default:
      return "pending";
  }
}

// Proposal Data
export interface Proposal {
  id: bigint;
  proposer: `0x${string}`;
  title: string;
  description: string;
  status: ProposalStatus;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  startTime: bigint;
  endTime: bigint;
  eta?: bigint;
}

// Delegator Info
export interface DelegatorInfo {
  address: `0x${string}`;
  delegatedAmount: bigint;
  delegatee?: `0x${string}`;
}

// DAO Parameters
export interface DAOParameters {
  quorum: bigint; // in basis points (e.g., 400 = 4%)
  votingPeriod: bigint; // in seconds
  votingDelay: bigint; // in seconds
  proposalCreationCost: bigint; // TON cost to create proposal
}

// Delegation Parameters
export interface DelegationParameters {
  delegationPeriodRequirement: bigint; // in seconds
}

// vTON Token Info
export interface VTONInfo {
  totalSupply: bigint;
  emissionRatio: bigint; // in basis points
}

// Security Council Info
export interface SecurityCouncilInfo {
  members: `0x${string}`[];
  threshold: number;
  pendingActionsCount: number;
}

// User Status
export interface UserStatus {
  vtonBalance: bigint;
  delegatedTo?: `0x${string}`;
  delegatedAmount: bigint;
  receivedDelegations: bigint;
  votingPower: bigint;
}

// Contract Addresses
export interface ContractAddresses {
  ton?: `0x${string}`;
  vton: `0x${string}`;
  delegateRegistry: `0x${string}`;
  daoGovernor: `0x${string}`;
  securityCouncil: `0x${string}`;
  timelock: `0x${string}`;
  faucet?: `0x${string}`;
  tonFaucet?: `0x${string}`;
}

// Faucet Info
export interface FaucetInfo {
  claimAmount: bigint;
  cooldownPeriod: bigint;
  totalClaimed: bigint;
  paused: boolean;
}

// Faucet Claim Status
export interface FaucetClaimStatus {
  canClaim: boolean;
  timeUntilNextClaim: bigint;
}
