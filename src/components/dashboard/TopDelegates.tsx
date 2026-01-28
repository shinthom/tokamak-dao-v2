"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DelegateCard } from "@/components/ui/delegate-card";
import { useAllDelegates } from "@/hooks/contracts/useDelegateRegistry";
import { useReadContracts, useChainId } from "wagmi";
import { getContractAddresses, areContractsDeployed, DELEGATE_REGISTRY_ABI } from "@/constants/contracts";
import { useMemo } from "react";
import { formatUnits } from "viem";

/**
 * Top Delegates Section
 * Shows top 5 delegates by voting power
 */
export function TopDelegates() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);
  const { data: delegates } = useAllDelegates();

  // Build contract calls to get total delegated for each delegate
  const delegatedCalls = useMemo(() => {
    if (!delegates || delegates.length === 0) return [];
    return delegates.map((delegate) => ({
      address: addresses.delegateRegistry as `0x${string}`,
      abi: DELEGATE_REGISTRY_ABI,
      functionName: "getTotalDelegated" as const,
      args: [delegate],
    }));
  }, [delegates, addresses.delegateRegistry]);

  const { data: delegatedResults } = useReadContracts({
    contracts: delegatedCalls,
    query: {
      enabled: isDeployed && delegatedCalls.length > 0,
    },
  });

  // Combine delegates with their voting power and sort
  const topDelegates = useMemo(() => {
    if (!delegates || !delegatedResults) return [];

    const delegatesWithPower = delegates.map((address, index) => {
      const result = delegatedResults[index];
      const votingPower = result?.status === "success" ? (result.result as bigint) : BigInt(0);
      return {
        address: address as `0x${string}`,
        votingPower,
        votingPowerFormatted: formatUnits(votingPower, 18),
      };
    });

    // Sort by voting power descending and take top 5
    return delegatesWithPower
      .sort((a, b) => (b.votingPower > a.votingPower ? 1 : -1))
      .slice(0, 5);
  }, [delegates, delegatedResults]);

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
            votingPower={Number(delegate.votingPowerFormatted).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            tokenSymbol="vTON"
            rank={index + 1}
          />
        ))}
      </CardContent>
    </Card>
  );
}
