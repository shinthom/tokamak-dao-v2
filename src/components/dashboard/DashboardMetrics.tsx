"use client";

import { StatCard } from "@/components/ui/stat-card";
import { formatVTON, formatNumber, formatPercentage18 } from "@/lib/utils";
import { useTotalSupply, useEmissionRatio } from "@/hooks/contracts/useVTON";
import { useAllDelegates } from "@/hooks/contracts/useDelegateRegistry";
import { useProposalCount, useProposals } from "@/hooks/contracts/useDAOGovernor";
import { useReadContracts, useChainId } from "wagmi";
import { getContractAddresses, areContractsDeployed, DELEGATE_REGISTRY_ABI } from "@/constants/contracts";
import { useMemo } from "react";

/**
 * Dashboard Metrics Grid
 * Displays 6 key DAO statistics using StatCard components
 */
export function DashboardMetrics() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const { data: totalSupply } = useTotalSupply();
  const { data: emissionRatio } = useEmissionRatio();
  const { data: delegates } = useAllDelegates();
  const { data: proposalCount } = useProposalCount();
  const { data: proposals } = useProposals();

  const delegateCount = delegates?.length ?? 0;

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

  // Calculate total delegated by summing all delegate amounts
  const totalDelegated = useMemo(() => {
    if (!delegatedResults) return BigInt(0);
    return delegatedResults.reduce((sum, result) => {
      if (result?.status === "success" && result.result) {
        return sum + (result.result as bigint);
      }
      return sum;
    }, BigInt(0));
  }, [delegatedResults]);

  // Calculate average participation rate across all proposals
  // Participation = average of (votes cast / total delegated) for each proposal
  const participationRate = useMemo(() => {
    if (!proposals || proposals.length === 0 || totalDelegated === BigInt(0)) {
      return 0;
    }

    // Calculate participation rate for each proposal and average them
    let totalParticipation = 0;
    let countedProposals = 0;

    for (const proposal of proposals) {
      const votesInProposal = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
      if (votesInProposal > BigInt(0)) {
        // Calculate this proposal's participation rate
        const rate = Number((votesInProposal * BigInt(10000)) / totalDelegated) / 100;
        totalParticipation += rate;
        countedProposals++;
      }
    }

    if (countedProposals === 0) return 0;

    // Average participation rate
    const avgRate = totalParticipation / countedProposals;
    return Math.round(avgRate * 10) / 10; // Round to 1 decimal place
  }, [proposals, totalDelegated]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard
        label="Total vTON Supply"
        value={formatVTON(totalSupply ?? BigInt(0), { compact: true })}
        tooltip="Total amount of vTON minted by staking TON. vTON is used as voting power in DAO governance."
      />
      <StatCard
        label="Total Delegated"
        value={formatVTON(totalDelegated, { compact: true })}
        tooltip="Total vTON delegated to delegates. Delegation allows others to vote on your behalf."
      />
      <StatCard
        label="Delegates"
        value={formatNumber(delegateCount)}
        tooltip="Number of registered delegates in the DAO. Delegates can vote on proposals using delegated voting power."
      />
      <StatCard
        label="Proposals"
        value={formatNumber(Number(proposalCount ?? 0))}
        tooltip="Total number of governance proposals created."
      />
      <StatCard
        label="Emission Ratio"
        value={formatPercentage18(emissionRatio ?? BigInt(0))}
        tooltip="The ratio of vTON issued per TON staked. Determines how much vTON you receive when staking."
      />
      <StatCard
        label="Participation"
        value={`${participationRate}%`}
        tooltip="Average voting participation rate. Calculated as the average of (votes cast / total delegated) across all proposals."
      />
    </div>
  );
}
