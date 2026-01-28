"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { useBlockNumber } from "wagmi";
import { ProposalDetail, type ProposalDetailData } from "@/components/proposals/ProposalDetail";
import { useProposal, useProposalState } from "@/hooks/contracts/useDAOGovernor";
import type { ProposalStatus } from "@/types/governance";
import { formatVTON } from "@/lib/utils";

// Average block time in seconds (Sepolia/Ethereum ~12s)
const BLOCK_TIME_SECONDS = 12;

// Map contract state (uint8) to ProposalStatus
function mapProposalState(state: number): ProposalStatus {
  const stateMap: Record<number, ProposalStatus> = {
    0: "pending",
    1: "active",
    2: "canceled",
    3: "failed",
    4: "succeeded",
    5: "queued",
    6: "expired",
    7: "executed",
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

// Demo proposals for showcase (prefixed with "demo-")
const DEMO_PROPOSALS: Record<string, ProposalDetailData> = {
  "demo-1": {
    id: "demo-1",
    title: "TIP-001: Increase staking rewards by 5%",
    description: `## Summary
This proposal aims to increase the staking rewards for vTON holders by 5% to incentivize long-term participation in the Tokamak Network governance.

## Motivation
Current staking rewards may not be competitive enough compared to other DeFi protocols. By increasing the rewards, we can:
- Attract more participants to the governance process
- Reduce selling pressure on TON
- Strengthen the security of the network through increased staking

## Specification
- Increase emission ratio from 80% to 85%
- Apply changes immediately upon execution
- No changes to other parameters

## Risks
- Slightly higher inflation rate
- Potential impact on treasury reserves`,
    status: "active" as ProposalStatus,
    proposer: "0x1234567890123456789012345678901234567890" as `0x${string}`,
    forVotes: 1250000,
    againstVotes: 320000,
    abstainVotes: 45000,
    totalVoters: 156,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    votingStartsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    votingEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  },
  "demo-2": {
    id: "demo-2",
    title: "TIP-002: Add new liquidity pool for TON/ETH",
    description: `## Summary
Proposal to add a new liquidity pool for TON/ETH pair on the Tokamak DEX.

## Details
- Initial liquidity: 100,000 TON + equivalent ETH
- Fee tier: 0.3%
- Trading rewards: 10% of fees distributed to LPs`,
    status: "pending" as ProposalStatus,
    proposer: "0x2345678901234567890123456789012345678901" as `0x${string}`,
    forVotes: 890000,
    againstVotes: 210000,
    abstainVotes: 30000,
    totalVoters: 98,
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    votingStartsAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    votingEndsAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  "demo-3": {
    id: "demo-3",
    title: "TIP-003: Update governance parameters",
    description: `## Summary
Update various governance parameters to optimize the decision-making process.

## Changes
- Reduce voting delay from 2 days to 1 day
- Increase quorum from 4% to 5%
- Reduce proposal cost from 100 TON to 75 TON`,
    status: "executed" as ProposalStatus,
    proposer: "0x3456789012345678901234567890123456789012" as `0x${string}`,
    forVotes: 2100000,
    againstVotes: 150000,
    abstainVotes: 80000,
    totalVoters: 234,
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    votingStartsAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    votingEndsAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
    queuedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    executedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  "demo-4": {
    id: "demo-4",
    title: "TIP-004: Treasury allocation for ecosystem grants",
    description: `## Summary
Allocate 500,000 TON from the treasury for ecosystem development grants.

## Allocation
- Developer grants: 300,000 TON
- Community initiatives: 150,000 TON
- Marketing: 50,000 TON`,
    status: "queued" as ProposalStatus,
    proposer: "0x4567890123456789012345678901234567890123" as `0x${string}`,
    forVotes: 1800000,
    againstVotes: 420000,
    abstainVotes: 60000,
    totalVoters: 189,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    votingStartsAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    votingEndsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    queuedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
  },
  "demo-5": {
    id: "demo-5",
    title: "TIP-005: Reduce proposal creation cost to 50 TON",
    description: `## Summary
Reduce the cost of creating proposals from 100 TON to 50 TON.

## Rationale
Lower barrier to entry for community members to participate in governance.`,
    status: "failed" as ProposalStatus,
    proposer: "0x5678901234567890123456789012345678901234" as `0x${string}`,
    forVotes: 450000,
    againstVotes: 890000,
    abstainVotes: 120000,
    totalVoters: 145,
    createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
    votingStartsAt: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000),
    votingEndsAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  },
  "demo-6": {
    id: "demo-6",
    title: "TIP-006: Emergency security patch implementation",
    description: `## Summary
Emergency security patch for a vulnerability discovered in the staking contract.

## Note
This proposal was canceled after the vulnerability was patched through the Security Council.`,
    status: "canceled" as ProposalStatus,
    proposer: "0x6789012345678901234567890123456789012345" as `0x${string}`,
    forVotes: 50000,
    againstVotes: 10000,
    abstainVotes: 5000,
    totalVoters: 23,
    createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
    votingStartsAt: new Date(Date.now() - 34 * 24 * 60 * 60 * 1000),
    votingEndsAt: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000),
  },
};

interface ProposalPageProps {
  params: Promise<{ id: string }>;
}

// Helper function to convert block number to estimated Date
function blockToDate(blockNumber: bigint, currentBlock: bigint, currentTime: Date): Date {
  const blockDiff = Number(blockNumber) - Number(currentBlock);
  const timeDiffMs = blockDiff * BLOCK_TIME_SECONDS * 1000;
  return new Date(currentTime.getTime() + timeDiffMs);
}

// Component for real proposals (fetched from contract)
function RealProposalDetail({ id }: { id: string }) {
  const proposalId = BigInt(id);
  const { data: proposalData, isLoading: proposalLoading, isError: proposalError } = useProposal(proposalId);
  const { data: stateData, isLoading: stateLoading } = useProposalState(proposalId);
  const { data: currentBlock, isLoading: blockLoading } = useBlockNumber();

  const isLoading = proposalLoading || stateLoading || blockLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Link
          href="/proposals"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <svg
            className="size-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          Back to Proposals
        </Link>
        <div className="text-center py-12">
          <div className="text-[var(--text-tertiary)]">
            <div className="mx-auto size-8 mb-4 border-2 border-[var(--border-default)] border-t-[var(--text-brand)] rounded-full animate-spin" />
            <p className="text-sm font-medium">Loading proposal...</p>
          </div>
        </div>
      </div>
    );
  }

  if (proposalError || !proposalData || !currentBlock) {
    notFound();
  }

  // Parse contract data
  const proposal = proposalData as {
    id: bigint;
    proposer: `0x${string}`;
    description: string;
    snapshotBlock: bigint;
    voteStart: bigint;
    voteEnd: bigint;
    forVotes: bigint;
    againstVotes: bigint;
    abstainVotes: bigint;
    canceled: boolean;
    executed: boolean;
  };

  const status = mapProposalState(stateData as number);
  const now = new Date();

  // Convert block numbers to dates using current block as reference
  const voteStartTime = blockToDate(proposal.voteStart, currentBlock, now);
  const voteEndTime = blockToDate(proposal.voteEnd, currentBlock, now);
  // Estimate created time from snapshot block
  const createdTime = blockToDate(proposal.snapshotBlock, currentBlock, now);

  const proposalDetail: ProposalDetailData = {
    id: id,
    title: extractTitle(proposal.description),
    description: proposal.description,
    status,
    proposer: proposal.proposer,
    forVotes: Number(formatVTON(proposal.forVotes)),
    againstVotes: Number(formatVTON(proposal.againstVotes)),
    abstainVotes: Number(formatVTON(proposal.abstainVotes)),
    totalVoters: 0, // Contract doesn't track unique voters
    createdAt: createdTime,
    votingStartsAt: voteStartTime,
    votingEndsAt: voteEndTime,
    executedAt: proposal.executed ? new Date() : undefined,
  };

  return <ProposalDetail proposal={proposalDetail} />;
}

export default function ProposalPage({ params }: ProposalPageProps) {
  const { id } = use(params);

  // Check if it's a demo proposal
  if (id.startsWith("demo-")) {
    const demoProposal = DEMO_PROPOSALS[id];
    if (!demoProposal) {
      notFound();
    }
    return <ProposalDetail proposal={demoProposal} />;
  }

  // Real proposal - fetch from contract
  return <RealProposalDetail id={id} />;
}
