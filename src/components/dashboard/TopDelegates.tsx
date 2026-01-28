"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DelegateCard } from "@/components/ui/delegate-card";
import { useAllDelegates } from "@/hooks/contracts/useDelegateRegistry";

// Mock top delegates for display
const MOCK_DELEGATES: {
  address: `0x${string}`;
  ensName?: string;
  votingPower: string;
}[] = [];

/**
 * Top Delegates Section
 * Shows top 5 delegates by voting power
 */
export function TopDelegates() {
  const { isDeployed } = useAllDelegates();

  // In production, we'd fetch and sort delegates from the contract
  // For now, use mock data
  const topDelegates = MOCK_DELEGATES.slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Top Delegates</CardTitle>
        <Link
          href="/delegates"
          className="text-sm text-[var(--text-brand)] hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {!isDeployed && (
          <div className="text-center py-4 text-[var(--text-tertiary)]">
            <p className="text-sm">Contracts not deployed</p>
            <p className="text-xs mt-1">
              No delegates available
            </p>
          </div>
        )}
        {isDeployed && topDelegates.length === 0 && (
          <div className="text-center py-4 text-[var(--text-tertiary)]">
            <p className="text-sm">No delegates yet</p>
            <p className="text-xs mt-1">
              Be the first to delegate your voting power
            </p>
          </div>
        )}
        {topDelegates.map((delegate, index) => (
          <DelegateCard
            key={delegate.address}
            address={delegate.address}
            ensName={delegate.ensName}
            votingPower={delegate.votingPower}
            tokenSymbol="vTON"
            rank={index + 1}
          />
        ))}
      </CardContent>
    </Card>
  );
}
