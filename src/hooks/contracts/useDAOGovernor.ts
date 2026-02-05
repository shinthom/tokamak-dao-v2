"use client";

import * as React from "react";
import { useReadContract, useReadContracts, useWriteContract, useChainId, useBlock } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import {
  getContractAddresses,
  areContractsDeployed,
  DAO_GOVERNOR_ABI,
} from "@/constants/contracts";
import { VoteType, ProposalStatus } from "@/types/governance";

// Average block time in seconds (Sepolia/Ethereum ~12s)
const BLOCK_TIME_SECONDS = 12;

// Helper function to convert block number to estimated Date
function blockToDate(blockNumber: bigint, currentBlock: bigint, currentTime: Date): Date {
  const blockDiff = Number(blockNumber) - Number(currentBlock);
  const timeDiffMs = blockDiff * BLOCK_TIME_SECONDS * 1000;
  return new Date(currentTime.getTime() + timeDiffMs);
}

// Mock data for when contracts are not deployed
const MOCK_DATA = {
  proposalCount: BigInt(0),
  quorum: BigInt(400), // 4%
  votingPeriod: BigInt(50400), // 7 days in blocks (~12s/block)
  votingDelay: BigInt(7200), // 1 day in blocks (~12s/block)
  proposalCreationCost: BigInt("100000000000000000000"), // 100 TON
  proposalThreshold: BigInt(25), // 0.25%
};

// Map contract state (uint8) to ProposalStatus
function mapProposalState(state: number): ProposalStatus {
  const stateMap: Record<number, ProposalStatus> = {
    0: "pending",   // Pending
    1: "active",    // Active
    2: "canceled",  // Canceled
    3: "defeated",  // Defeated
    4: "succeeded", // Succeeded
    5: "queued",    // Queued
    6: "expired",   // Expired
    7: "executed",  // Executed
  };
  return stateMap[state] ?? "pending";
}

// Extract title from description (first line after # or full string)
function extractTitle(description: string): string {
  const lines = description.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) {
      return trimmed.slice(2).trim();
    }
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return "Untitled Proposal";
}

export interface ProposalListItem {
  id: string;
  title: string;
  description: string;
  status: ProposalStatus;
  proposer: string;
  date: Date;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  voteStart: bigint;
  voteEnd: bigint;
  burnRate: number;
}

/**
 * Hook to get all proposal IDs directly from contract
 */
function useProposalIds() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.daoGovernor as `0x${string}`,
    abi: DAO_GOVERNOR_ABI,
    functionName: "getAllProposalIds",
    query: {
      enabled: isDeployed,
      staleTime: 30_000, // 30 seconds
    },
  });

  return {
    data: result.data as bigint[] | undefined,
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,
    refetch: result.refetch,
  };
}

/**
 * Hook to get all proposals
 */
export function useProposals() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  // Get current block for date calculations (using blockchain timestamp, not browser time)
  const { data: block } = useBlock();

  // Get proposal IDs from contract
  const { data: proposalIds, isLoading: idsLoading, refetch: refetchIds } = useProposalIds();
  const ids = proposalIds ?? [];

  // Build contract calls for all proposals using actual IDs
  const proposalCalls = ids.map((id) => ({
    address: addresses.daoGovernor as `0x${string}`,
    abi: DAO_GOVERNOR_ABI,
    functionName: "getProposal" as const,
    args: [id],
  }));

  const stateCalls = ids.map((id) => ({
    address: addresses.daoGovernor as `0x${string}`,
    abi: DAO_GOVERNOR_ABI,
    functionName: "state" as const,
    args: [id],
  }));

  const allCalls = [...proposalCalls, ...stateCalls];

  const { data: results, isLoading: detailsLoading, isError, error, refetch: refetchDetails } = useReadContracts({
    contracts: allCalls,
    query: {
      enabled: isDeployed && ids.length > 0,
    },
  });

  // Parse results into proposals
  const proposals: ProposalListItem[] = [];
  const currentBlock = block?.number;
  const now = block ? new Date(Number(block.timestamp) * 1000) : new Date();
  if (results && ids.length > 0 && currentBlock) {
    for (let i = 0; i < ids.length; i++) {
      const proposalResult = results[i];
      const stateResult = results[ids.length + i];

      if (proposalResult?.status === "success" && stateResult?.status === "success") {
        const proposal = proposalResult.result as {
          id: bigint;
          proposer: string;
          description: string;
          voteStart: bigint;
          voteEnd: bigint;
          forVotes: bigint;
          againstVotes: bigint;
          abstainVotes: bigint;
          burnRate: number;
        };
        const state = stateResult.result as number;

        proposals.push({
          id: ids[i].toString(),
          title: extractTitle(proposal.description),
          description: proposal.description,
          status: mapProposalState(state),
          proposer: proposal.proposer,
          date: blockToDate(proposal.voteStart, currentBlock, now),
          forVotes: proposal.forVotes,
          againstVotes: proposal.againstVotes,
          abstainVotes: proposal.abstainVotes,
          voteStart: proposal.voteStart,
          voteEnd: proposal.voteEnd,
          burnRate: proposal.burnRate ?? 0,
        });
      }
    }
  }

  const refetch = async () => {
    await refetchIds();
    await refetchDetails();
  };

  return {
    data: proposals,
    count: ids.length,
    isLoading: isDeployed ? (idsLoading || detailsLoading) : false,
    isError: isDeployed ? isError : false,
    error: isDeployed ? error : null,
    refetch,
    isDeployed,
  };
}

/**
 * Hook to get proposal count
 */
export function useProposalCount() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.daoGovernor,
    abi: DAO_GOVERNOR_ABI,
    functionName: "proposalCount",
    query: {
      enabled: isDeployed,
    },
  });

  return {
    data: isDeployed ? result.data : MOCK_DATA.proposalCount,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    refetch: result.refetch,
    isDeployed,
  };
}

/**
 * Hook to get proposal details
 */
export function useProposal(proposalId: bigint) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.daoGovernor,
    abi: DAO_GOVERNOR_ABI,
    functionName: "getProposal",
    args: [proposalId],
    query: {
      enabled: isDeployed,
    },
  });

  return {
    data: result.data,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    refetch: result.refetch,
    isDeployed,
  };
}

/**
 * Hook to get proposal state
 */
export function useProposalState(proposalId: bigint) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.daoGovernor,
    abi: DAO_GOVERNOR_ABI,
    functionName: "state",
    args: [proposalId],
    query: {
      enabled: isDeployed,
    },
  });

  return {
    data: result.data,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    isDeployed,
  };
}

/**
 * Hook to get governance parameters
 */
export function useGovernanceParams() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const quorumResult = useReadContract({
    address: addresses.daoGovernor,
    abi: DAO_GOVERNOR_ABI,
    functionName: "quorum",
    query: {
      enabled: isDeployed,
    },
  });

  const votingPeriodResult = useReadContract({
    address: addresses.daoGovernor,
    abi: DAO_GOVERNOR_ABI,
    functionName: "votingPeriod",
    query: {
      enabled: isDeployed,
    },
  });

  const votingDelayResult = useReadContract({
    address: addresses.daoGovernor,
    abi: DAO_GOVERNOR_ABI,
    functionName: "votingDelay",
    query: {
      enabled: isDeployed,
    },
  });

  const costResult = useReadContract({
    address: addresses.daoGovernor,
    abi: DAO_GOVERNOR_ABI,
    functionName: "proposalCreationCost",
    query: {
      enabled: isDeployed,
    },
  });

  const thresholdResult = useReadContract({
    address: addresses.daoGovernor,
    abi: DAO_GOVERNOR_ABI,
    functionName: "proposalThreshold",
    query: {
      enabled: isDeployed,
    },
  });

  const isLoading =
    quorumResult.isLoading ||
    votingPeriodResult.isLoading ||
    votingDelayResult.isLoading ||
    costResult.isLoading ||
    thresholdResult.isLoading;

  const isError =
    quorumResult.isError ||
    votingPeriodResult.isError ||
    votingDelayResult.isError ||
    costResult.isError ||
    thresholdResult.isError;

  return {
    quorum: isDeployed ? quorumResult.data : MOCK_DATA.quorum,
    votingPeriod: isDeployed ? votingPeriodResult.data : MOCK_DATA.votingPeriod,
    votingDelay: isDeployed ? votingDelayResult.data : MOCK_DATA.votingDelay,
    proposalCreationCost: isDeployed
      ? costResult.data
      : MOCK_DATA.proposalCreationCost,
    proposalThreshold: isDeployed
      ? thresholdResult.data
      : MOCK_DATA.proposalThreshold,
    isLoading: isDeployed ? isLoading : false,
    isError: isDeployed ? isError : false,
    isDeployed,
  };
}

/**
 * Hook to check if an account has voted on a proposal
 */
export function useHasVoted(proposalId: bigint, account: `0x${string}` | undefined) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.daoGovernor,
    abi: DAO_GOVERNOR_ABI,
    functionName: "hasVoted",
    args: account ? [proposalId, account] : undefined,
    query: {
      enabled: isDeployed && !!account,
    },
  });

  return {
    data: result.data ?? false,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    refetch: result.refetch,
    isDeployed,
  };
}

/**
 * Hook to create a new proposal
 */
export function usePropose() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);
  const queryClient = useQueryClient();

  const invalidateProposalQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["proposalIds"] });
    queryClient.invalidateQueries({ queryKey: ["readContract"] });
    queryClient.invalidateQueries({ queryKey: ["readContracts"] });
  };

  const { writeContract, writeContractAsync, data, isPending, isError, error, isSuccess } =
    useWriteContract({
      mutation: {
        onSuccess: () => {
          invalidateProposalQueries();
        },
      },
    });

  const propose = (
    targets: `0x${string}`[],
    values: bigint[],
    calldatas: `0x${string}`[],
    description: string,
    burnRate: number = 0
  ) => {
    if (!isDeployed) return;
    writeContract({
      address: addresses.daoGovernor,
      abi: DAO_GOVERNOR_ABI,
      functionName: "propose",
      args: [targets, values, calldatas, description, burnRate],
    });
  };

  const proposeAsync = async (
    targets: `0x${string}`[],
    values: bigint[],
    calldatas: `0x${string}`[],
    description: string,
    burnRate: number = 0
  ) => {
    if (!isDeployed) throw new Error("Contracts not deployed");
    const result = await writeContractAsync({
      address: addresses.daoGovernor,
      abi: DAO_GOVERNOR_ABI,
      functionName: "propose",
      args: [targets, values, calldatas, description, burnRate],
    });
    invalidateProposalQueries();
    return result;
  };

  return {
    propose,
    proposeAsync,
    data,
    isPending,
    isError,
    error,
    isSuccess,
    isDeployed,
  };
}

/**
 * Hook to cast a vote on a proposal
 */
export function useCastVote() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const { writeContract, writeContractAsync, data, isPending, isError, error, isSuccess } =
    useWriteContract();

  const castVote = (proposalId: bigint, support: VoteType) => {
    if (!isDeployed) return;
    writeContract({
      address: addresses.daoGovernor,
      abi: DAO_GOVERNOR_ABI,
      functionName: "castVote",
      args: [proposalId, support],
    });
  };

  const castVoteAsync = async (proposalId: bigint, support: VoteType) => {
    if (!isDeployed) throw new Error("Contracts not deployed");
    return writeContractAsync({
      address: addresses.daoGovernor,
      abi: DAO_GOVERNOR_ABI,
      functionName: "castVote",
      args: [proposalId, support],
    });
  };

  const castVoteWithReason = (proposalId: bigint, support: VoteType, reason: string) => {
    if (!isDeployed) return;
    writeContract({
      address: addresses.daoGovernor,
      abi: DAO_GOVERNOR_ABI,
      functionName: "castVoteWithReason",
      args: [proposalId, support, reason],
    });
  };

  const castVoteWithReasonAsync = async (
    proposalId: bigint,
    support: VoteType,
    reason: string
  ) => {
    if (!isDeployed) throw new Error("Contracts not deployed");
    return writeContractAsync({
      address: addresses.daoGovernor,
      abi: DAO_GOVERNOR_ABI,
      functionName: "castVoteWithReason",
      args: [proposalId, support, reason],
    });
  };

  return {
    castVote,
    castVoteAsync,
    castVoteWithReason,
    castVoteWithReasonAsync,
    data,
    isPending,
    isError,
    error,
    isSuccess,
    isDeployed,
  };
}

/**
 * Hook to queue a succeeded proposal
 */
export function useQueueProposal() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const { writeContract, writeContractAsync, data, isPending, isError, error, isSuccess } =
    useWriteContract();

  const queue = (proposalId: bigint) => {
    if (!isDeployed) return;
    writeContract({
      address: addresses.daoGovernor,
      abi: DAO_GOVERNOR_ABI,
      functionName: "queue",
      args: [proposalId],
    });
  };

  const queueAsync = async (proposalId: bigint) => {
    if (!isDeployed) throw new Error("Contracts not deployed");
    return writeContractAsync({
      address: addresses.daoGovernor,
      abi: DAO_GOVERNOR_ABI,
      functionName: "queue",
      args: [proposalId],
    });
  };

  return {
    queue,
    queueAsync,
    data,
    isPending,
    isError,
    error,
    isSuccess,
    isDeployed,
  };
}

/**
 * Hook to execute a queued proposal
 */
export function useExecuteProposal() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const { writeContract, writeContractAsync, data, isPending, isError, error, isSuccess } =
    useWriteContract();

  const execute = (proposalId: bigint) => {
    if (!isDeployed) return;
    writeContract({
      address: addresses.daoGovernor,
      abi: DAO_GOVERNOR_ABI,
      functionName: "execute",
      args: [proposalId],
    });
  };

  const executeAsync = async (proposalId: bigint) => {
    if (!isDeployed) throw new Error("Contracts not deployed");
    return writeContractAsync({
      address: addresses.daoGovernor,
      abi: DAO_GOVERNOR_ABI,
      functionName: "execute",
      args: [proposalId],
    });
  };

  return {
    execute,
    executeAsync,
    data,
    isPending,
    isError,
    error,
    isSuccess,
    isDeployed,
  };
}

/**
 * Hook to get cancelable proposals (pending, active, succeeded, queued)
 * Used by Security Council for emergency cancellation
 */
export function useCancelableProposals() {
  const { data: proposals, isLoading, refetch, isDeployed } = useProposals();

  const cancelableStatuses: ProposalStatus[] = ["pending", "active", "succeeded", "queued"];

  const cancelableProposals = React.useMemo(() => {
    if (!proposals) return [];
    return proposals.filter((p) => cancelableStatuses.includes(p.status));
  }, [proposals]);

  return {
    data: cancelableProposals,
    isLoading,
    refetch,
    isDeployed,
  };
}

/**
 * Hook to cancel a proposal (proposer only)
 */
export function useCancelProposal() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const { writeContract, writeContractAsync, data, isPending, isError, error, isSuccess } =
    useWriteContract();

  const cancel = (proposalId: bigint) => {
    if (!isDeployed) return;
    writeContract({
      address: addresses.daoGovernor,
      abi: DAO_GOVERNOR_ABI,
      functionName: "cancel",
      args: [proposalId],
    });
  };

  const cancelAsync = async (proposalId: bigint) => {
    if (!isDeployed) throw new Error("Contracts not deployed");
    return writeContractAsync({
      address: addresses.daoGovernor,
      abi: DAO_GOVERNOR_ABI,
      functionName: "cancel",
      args: [proposalId],
    });
  };

  return {
    cancel,
    cancelAsync,
    data,
    isPending,
    isError,
    error,
    isSuccess,
    isDeployed,
  };
}
