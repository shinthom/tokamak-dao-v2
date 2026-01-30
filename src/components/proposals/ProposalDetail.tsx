"use client";

import * as React from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { VotingProgress } from "@/components/ui/progress";
import { ProposalTimeline } from "./ProposalTimeline";
import { ProposalActions } from "./ProposalActions";
import { VotingModal } from "./VotingModal";
import { cn, formatAddress, formatNumber, formatDate } from "@/lib/utils";
import type { ProposalStatus } from "@/types/governance";
import { useHasVoted } from "@/hooks/contracts/useDAOGovernor";

export interface ProposalDetailData {
  id: string;
  title: string;
  description: string;
  status: ProposalStatus;
  proposer: `0x${string}`;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  totalVoters: number;
  createdAt: Date;
  votingStartsAt: Date;
  votingEndsAt: Date;
  executedAt?: Date;
  queuedAt?: Date;
}

export interface ProposalDetailProps {
  className?: string;
  proposal: ProposalDetailData;
  onVoteSuccess?: () => void;
}

export function ProposalDetail({ className, proposal, onVoteSuccess }: ProposalDetailProps) {
  const { address, isConnected } = useAccount();
  const [isVotingModalOpen, setIsVotingModalOpen] = React.useState(false);

  // Check if this is a demo proposal (cannot interact with contract)
  const isDemo = proposal.id.startsWith("demo-");
  const proposalIdBigInt = isDemo ? BigInt(0) : BigInt(proposal.id);

  const { data: hasVoted } = useHasVoted(
    proposalIdBigInt,
    isDemo ? undefined : address
  );

  const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
  const forPercentage = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (proposal.againstVotes / totalVotes) * 100 : 0;
  const abstainPercentage = totalVotes > 0 ? (proposal.abstainVotes / totalVotes) * 100 : 0;

  const canVote = isConnected && proposal.status === "active" && !hasVoted && !isDemo;

  // Remove title from description if it appears at the beginning
  const descriptionWithoutTitle = React.useMemo(() => {
    const lines = proposal.description.split('\n');
    const firstLine = lines[0]?.trim();

    // Check if first line is a heading that matches the title
    if (firstLine) {
      // Remove markdown heading prefix (# or ##)
      const headingText = firstLine.replace(/^#{1,2}\s*/, '');
      if (headingText === proposal.title) {
        // Remove the first line and any following empty lines
        let startIndex = 1;
        while (startIndex < lines.length && lines[startIndex].trim() === '') {
          startIndex++;
        }
        return lines.slice(startIndex).join('\n');
      }
    }
    return proposal.description;
  }, [proposal.description, proposal.title]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Back link */}
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

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <StatusBadge status={proposal.status} size="md" />
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {proposal.title}
            </h1>
          </div>

          {canVote && (
            <Button onClick={() => setIsVotingModalOpen(true)}>
              Cast Vote
            </Button>
          )}

          {hasVoted && proposal.status === "active" && (
            <div className="px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)]">
              You have voted
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
          <span>
            Proposed by{" "}
            <span className="font-mono text-[var(--text-primary)]">
              {formatAddress(proposal.proposer)}
            </span>
          </span>
          <span className="text-[var(--text-tertiary)]">|</span>
          <span>{formatDate(proposal.createdAt)}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardContent className="py-4">
              <div className="proposal-prose max-w-none">
                <ReactMarkdown>{descriptionWithoutTitle}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          {/* Voting Results */}
          <Card>
            <CardHeader>
              <CardTitle>Voting Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <VotingProgress
                forVotes={proposal.forVotes}
                againstVotes={proposal.againstVotes}
                abstainVotes={proposal.abstainVotes}
              />

              <div className="grid gap-4 sm:grid-cols-3">
                {/* For */}
                <div className="p-4 rounded-lg bg-[var(--color-vote-for)]/10">
                  <p className="text-sm text-[var(--text-secondary)]">For</p>
                  <p className="text-xl font-bold text-[var(--color-vote-for)]">
                    {formatNumber(proposal.forVotes, { compact: true })}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {forPercentage.toFixed(1)}%
                  </p>
                </div>

                {/* Against */}
                <div className="p-4 rounded-lg bg-[var(--color-vote-against)]/10">
                  <p className="text-sm text-[var(--text-secondary)]">Against</p>
                  <p className="text-xl font-bold text-[var(--color-vote-against)]">
                    {formatNumber(proposal.againstVotes, { compact: true })}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {againstPercentage.toFixed(1)}%
                  </p>
                </div>

                {/* Abstain */}
                <div className="p-4 rounded-lg bg-[var(--color-vote-abstain)]/10">
                  <p className="text-sm text-[var(--text-secondary)]">Abstain</p>
                  <p className="text-xl font-bold text-[var(--color-vote-abstain)]">
                    {formatNumber(proposal.abstainVotes, { compact: true })}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {abstainPercentage.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border-default)]">
                <p className="text-sm text-[var(--text-secondary)]">
                  Total Votes:{" "}
                  <span className="font-medium text-[var(--text-primary)]">
                    {formatNumber(totalVotes, { compact: true })}
                  </span>{" "}
                  from{" "}
                  <span className="font-medium text-[var(--text-primary)]">
                    {proposal.totalVoters}
                  </span>{" "}
                  addresses
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions - only for real proposals */}
          {!isDemo && (
            <ProposalActions
              proposalId={proposalIdBigInt}
              status={proposal.status}
              proposer={proposal.proposer}
              canExecute={proposal.status === "queued"}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card>
            <CardContent>
              <ProposalTimeline
                proposalStatus={proposal.status}
                createdAt={proposal.createdAt}
                votingStartsAt={proposal.votingStartsAt}
                votingEndsAt={proposal.votingEndsAt}
                executedAt={proposal.executedAt}
                queuedAt={proposal.queuedAt}
              />
            </CardContent>
          </Card>

          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle>Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Proposer</span>
                <span className="font-mono text-[var(--text-primary)]">
                  {formatAddress(proposal.proposer)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Status</span>
                <StatusBadge status={proposal.status} size="sm" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Voting Modal - only for real proposals */}
      {!isDemo && (
        <VotingModal
          isOpen={isVotingModalOpen}
          onClose={() => setIsVotingModalOpen(false)}
          proposalId={proposalIdBigInt}
          proposalTitle={proposal.title}
          onVoteSuccess={onVoteSuccess}
        />
      )}
    </div>
  );
}
