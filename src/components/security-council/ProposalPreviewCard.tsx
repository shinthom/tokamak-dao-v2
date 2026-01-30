"use client";

import * as React from "react";
import { StatusBadge } from "@/components/ui/badge";
import { formatAddress, formatVTON } from "@/lib/utils";
import type { ProposalListItem } from "@/hooks/contracts/useDAOGovernor";

export interface ProposalPreviewCardProps {
  proposal: ProposalListItem;
  compact?: boolean;
}

/**
 * Compact preview card for a selected proposal
 * Used in Steps 2 and 3 of the CancelProposalModal
 */
export function ProposalPreviewCard({
  proposal,
  compact = false,
}: ProposalPreviewCardProps) {
  const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;

  if (compact) {
    return (
      <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-secondary)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {proposal.title}
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              ID: {proposal.id}
            </p>
          </div>
          <StatusBadge status={proposal.status} size="sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-secondary)]">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {proposal.title}
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            Proposal ID: {proposal.id}
          </p>
        </div>
        <StatusBadge status={proposal.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-[var(--text-tertiary)]">Proposer</p>
          <p className="text-[var(--text-secondary)] font-medium">
            {formatAddress(proposal.proposer as `0x${string}`)}
          </p>
        </div>
        <div>
          <p className="text-[var(--text-tertiary)]">Total Votes</p>
          <p className="text-[var(--text-secondary)] font-medium">
            {formatVTON(totalVotes, { compact: true })} vTON
          </p>
        </div>
        <div>
          <p className="text-[var(--text-tertiary)]">For</p>
          <p className="text-[var(--color-vote-for)] font-medium">
            {formatVTON(proposal.forVotes, { compact: true })}
          </p>
        </div>
        <div>
          <p className="text-[var(--text-tertiary)]">Against</p>
          <p className="text-[var(--color-vote-against)] font-medium">
            {formatVTON(proposal.againstVotes, { compact: true })}
          </p>
        </div>
      </div>
    </div>
  );
}
