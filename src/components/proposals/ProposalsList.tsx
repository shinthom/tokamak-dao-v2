"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatUnits } from "viem";
import { ProposalCard } from "@/components/ui/proposal-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProposals } from "@/hooks/contracts/useDAOGovernor";
import type { ProposalStatus } from "@/types/governance";

interface ProposalListItem {
  id: string;
  title: string;
  status: ProposalStatus;
  date: Date;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  totalVoters?: number;
  isDemo?: boolean;
}

// Demo data for showcase (ordered by most recent first)
const DEMO_PROPOSALS: ProposalListItem[] = [
  {
    id: "demo-6",
    title: "TIP-006: Emergency security patch implementation",
    status: "canceled",
    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    forVotes: 50000,
    againstVotes: 10000,
    abstainVotes: 5000,
    totalVoters: 23,
    isDemo: true,
  },
  {
    id: "demo-5",
    title: "TIP-005: Reduce proposal creation cost to 50 TON",
    status: "defeated",
    date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    forVotes: 450000,
    againstVotes: 890000,
    abstainVotes: 120000,
    totalVoters: 145,
    isDemo: true,
  },
  {
    id: "demo-4",
    title: "TIP-004: Treasury allocation for ecosystem grants",
    status: "queued",
    date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    forVotes: 1800000,
    againstVotes: 420000,
    abstainVotes: 60000,
    totalVoters: 189,
    isDemo: true,
  },
  {
    id: "demo-3",
    title: "TIP-003: Update governance parameters",
    status: "executed",
    date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    forVotes: 2100000,
    againstVotes: 150000,
    abstainVotes: 80000,
    totalVoters: 234,
    isDemo: true,
  },
  {
    id: "demo-2",
    title: "TIP-002: Add new liquidity pool for TON/ETH",
    status: "pending",
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    forVotes: 890000,
    againstVotes: 210000,
    abstainVotes: 30000,
    totalVoters: 98,
    isDemo: true,
  },
  {
    id: "demo-1",
    title: "TIP-001: Increase staking rewards by 5%",
    status: "active",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    forVotes: 1250000,
    againstVotes: 320000,
    abstainVotes: 45000,
    totalVoters: 156,
    isDemo: true,
  },
];

type FilterStatus = "all" | ProposalStatus;

const STATUS_FILTERS: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "succeeded", label: "Succeeded" },
  { value: "queued", label: "Queued" },
  { value: "executed", label: "Executed" },
  { value: "defeated", label: "Defeated" },
  { value: "expired", label: "Expired" },
  { value: "canceled", label: "Canceled" },
];

export interface ProposalsListProps {
  className?: string;
}

export function ProposalsList({ className }: ProposalsListProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<FilterStatus>("all");

  // Fetch real proposals from contract
  const { data: realProposals, isLoading } = useProposals();

  // Convert real proposals to list items and append demo proposals
  const proposals: ProposalListItem[] = React.useMemo(() => {
    const contractProposals = realProposals.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      date: p.date,
      forVotes: Number(formatUnits(p.forVotes, 18)),
      againstVotes: Number(formatUnits(p.againstVotes, 18)),
      abstainVotes: Number(formatUnits(p.abstainVotes, 18)),
      isDemo: false,
    }));
    // Real proposals first, then demo proposals
    return [...contractProposals, ...DEMO_PROPOSALS];
  }, [realProposals]);

  // Filter proposals based on search and status
  const filteredProposals = React.useMemo(() => {
    return proposals.filter((proposal) => {
      const matchesSearch =
        searchQuery === "" ||
        proposal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proposal.id.includes(searchQuery);

      const matchesStatus =
        statusFilter === "all" || proposal.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [proposals, searchQuery, statusFilter]);

  const handleProposalClick = (id: string) => {
    router.push(`/proposals/${id}`);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <Input
          placeholder="Search proposals..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sm:max-w-xs"
          leftIcon={
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          }
        />

        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              variant={statusFilter === filter.value ? "primary" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Proposals list */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="text-[var(--text-tertiary)]">
            <div className="mx-auto size-8 mb-4 border-2 border-[var(--border-default)] border-t-[var(--text-brand)] rounded-full animate-spin" />
            <p className="text-sm font-medium">Loading proposals...</p>
          </div>
        </div>
      ) : filteredProposals.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-[var(--text-tertiary)]">
            <svg
              className="mx-auto size-12 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <p className="text-sm font-medium">No proposals found</p>
            <p className="text-xs mt-1">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Proposals will appear here once they are created"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredProposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              id={proposal.id}
              title={proposal.title}
              status={proposal.status}
              date={proposal.date}
              forVotes={proposal.forVotes}
              againstVotes={proposal.againstVotes}
              abstainVotes={proposal.abstainVotes}
              totalVoters={proposal.totalVoters}
              onClick={() => handleProposalClick(proposal.id)}
              className="cursor-pointer"
            />
          ))}
        </div>
      )}
    </div>
  );
}
