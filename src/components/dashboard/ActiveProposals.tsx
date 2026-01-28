"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ProposalCard } from "@/components/ui/proposal-card";
import { Badge } from "@/components/ui/badge";
import { useProposals } from "@/hooks/contracts/useDAOGovernor";
import { useMemo } from "react";
import { formatUnits } from "viem";

/**
 * Active Proposals Section
 * Shows currently active proposals with voting status
 */
export function ActiveProposals() {
  const { data: allProposals, isDeployed } = useProposals();

  // Filter to only show active proposals (or pending if no active)
  const proposals = useMemo(() => {
    if (!allProposals) return [];
    // Show active proposals first, then pending
    const active = allProposals.filter((p) => p.status === "active");
    if (active.length > 0) return active.slice(0, 3);
    // If no active, show recent pending proposals
    const pending = allProposals.filter((p) => p.status === "pending");
    return pending.slice(0, 3);
  }, [allProposals]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          Active Proposals
          <Badge variant="info" size="sm">
            {proposals.length}
          </Badge>
        </CardTitle>
        <Link
          href="/proposals"
          className="text-sm text-[var(--text-brand)] hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isDeployed && (
          <div className="text-center py-4 text-[var(--text-tertiary)]">
            <p className="text-sm">Contracts not deployed</p>
            <p className="text-xs mt-1">
              No proposals available
            </p>
          </div>
        )}
        {isDeployed && proposals.length === 0 && (
          <div className="text-center py-4 text-[var(--text-tertiary)]">
            <p className="text-sm">No active proposals</p>
            <p className="text-xs mt-1">
              Create a new proposal to get started
            </p>
          </div>
        )}
        {proposals.map((proposal) => {
          const forVotes = Number(formatUnits(proposal.forVotes, 18));
          const againstVotes = Number(formatUnits(proposal.againstVotes, 18));
          const abstainVotes = Number(formatUnits(proposal.abstainVotes, 18));
          return (
            <ProposalCard
              key={proposal.id}
              id={proposal.id}
              title={proposal.title}
              status={proposal.status}
              date={proposal.date}
              forVotes={forVotes}
              againstVotes={againstVotes}
              abstainVotes={abstainVotes}
              totalVoters={forVotes + againstVotes + abstainVotes > 0 ? 1 : 0}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}
