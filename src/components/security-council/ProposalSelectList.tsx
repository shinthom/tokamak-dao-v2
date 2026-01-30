"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { formatAddress, formatVTON } from "@/lib/utils";
import type { ProposalListItem } from "@/hooks/contracts/useDAOGovernor";

export interface ProposalSelectListProps {
  proposals: ProposalListItem[];
  isLoading: boolean;
  selectedProposalId: string | null;
  onSelect: (proposal: ProposalListItem) => void;
}

/**
 * Searchable and selectable list of proposals for cancellation
 */
export function ProposalSelectList({
  proposals,
  isLoading,
  selectedProposalId,
  onSelect,
}: ProposalSelectListProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredProposals = React.useMemo(() => {
    if (!searchQuery.trim()) return proposals;

    const query = searchQuery.toLowerCase();
    return proposals.filter(
      (p) =>
        p.id.toLowerCase().includes(query) ||
        p.title.toLowerCase().includes(query)
    );
  }, [proposals, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 rounded-lg bg-[var(--bg-secondary)] animate-pulse"
          >
            <div className="h-4 bg-[var(--bg-tertiary)] rounded w-3/4 mb-2" />
            <div className="h-3 bg-[var(--bg-tertiary)] rounded w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="p-8 text-center rounded-lg bg-[var(--bg-secondary)]">
        <p className="text-sm text-[var(--text-secondary)]">
          No cancelable proposals found.
        </p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Only pending, active, succeeded, or queued proposals can be canceled.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <Input
        placeholder="Search by ID or title..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="bg-[var(--bg-secondary)]"
      />

      {/* Proposals List */}
      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
        {filteredProposals.length === 0 ? (
          <div className="p-4 text-center rounded-lg bg-[var(--bg-secondary)]">
            <p className="text-sm text-[var(--text-secondary)]">
              No proposals match your search.
            </p>
          </div>
        ) : (
          filteredProposals.map((proposal) => {
            const isSelected = selectedProposalId === proposal.id;
            const totalVotes =
              proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;

            return (
              <button
                key={proposal.id}
                type="button"
                onClick={() => onSelect(proposal)}
                className={cn(
                  "w-full p-4 rounded-lg border-2 text-left transition-all",
                  "hover:border-[var(--border-hover)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1",
                  isSelected
                    ? "border-[var(--color-primary-500)] bg-[var(--bg-brand-subtle)]"
                    : "border-[var(--border-default)] bg-[var(--bg-secondary)]"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-medium truncate",
                        isSelected
                          ? "text-[var(--text-brand)]"
                          : "text-[var(--text-primary)]"
                      )}
                    >
                      {proposal.title}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-tertiary)]">
                      <span>ID: {proposal.id}</span>
                      <span>
                        Proposer: {formatAddress(proposal.proposer as `0x${string}`)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span className="text-[var(--color-vote-for)]">
                        For: {formatVTON(proposal.forVotes, { compact: true })}
                      </span>
                      <span className="text-[var(--color-vote-against)]">
                        Against: {formatVTON(proposal.againstVotes, { compact: true })}
                      </span>
                      <span className="text-[var(--text-tertiary)]">
                        Total: {formatVTON(totalVotes, { compact: true })}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={proposal.status} size="sm" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
