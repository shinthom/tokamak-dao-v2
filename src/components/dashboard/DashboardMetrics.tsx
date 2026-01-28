"use client";

import { StatCard } from "@/components/ui/stat-card";
import { formatVTON, formatNumber, formatPercentage18 } from "@/lib/utils";
import { useTotalSupply, useEmissionRatio } from "@/hooks/contracts/useVTON";
import { useAllDelegates } from "@/hooks/contracts/useDelegateRegistry";
import { useProposalCount } from "@/hooks/contracts/useDAOGovernor";

/**
 * Dashboard Metrics Grid
 * Displays 6 key DAO statistics using StatCard components
 */
export function DashboardMetrics() {
  const { data: totalSupply, isDeployed } = useTotalSupply();
  const { data: emissionRatio } = useEmissionRatio();
  const { data: delegates } = useAllDelegates();
  const { data: proposalCount } = useProposalCount();

  // Calculate total delegated (mock for now since we'd need to aggregate)
  const totalDelegated = BigInt(0);
  const delegateCount = delegates?.length ?? 0;

  // Participation rate (mock calculation)
  const participationRate = 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard
        label="Total vTON Supply"
        value={formatVTON(totalSupply ?? BigInt(0), { compact: true })}
        description={isDeployed ? "Total minted vTON" : "Contract not deployed"}
      />
      <StatCard
        label="Total Delegated"
        value={formatVTON(totalDelegated, { compact: true })}
        description="vTON delegated to representatives"
      />
      <StatCard
        label="Delegates"
        value={formatNumber(delegateCount)}
        description="Registered delegates"
      />
      <StatCard
        label="Proposals"
        value={formatNumber(Number(proposalCount ?? 0))}
        description="Total proposals created"
      />
      <StatCard
        label="Emission Ratio"
        value={formatPercentage18(emissionRatio ?? BigInt(0))}
        description="vTON emission rate"
      />
      <StatCard
        label="Participation"
        value={`${participationRate}%`}
        description="Average voting participation"
      />
    </div>
  );
}
