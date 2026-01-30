"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatVTON, formatAddress } from "@/lib/utils";
import { useVTONBalance, useVotingPower } from "@/hooks/contracts/useVTON";
import { useMyDelegations, useTotalDelegated } from "@/hooks/contracts/useDelegateRegistry";
import { useWalletConnection } from "@/hooks/useWalletConnection";

/**
 * My Status Section
 * Shows user's vTON balance, delegation status, and voting power
 * Only visible when wallet is connected
 */
export function MyStatus() {
  const { address, isConnected, isReady } = useWalletConnection();

  const { data: balance, isDeployed } = useVTONBalance(address);
  const { data: votingPower } = useVotingPower(address);
  const { primaryDelegation, totalDelegatedAmount } = useMyDelegations(address);
  const { data: receivedDelegations } = useTotalDelegated(address);

  // Loading state (waiting for hydration and connection restore)
  if (!isReady) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            My Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-0"
              >
                <div className="h-4 w-24 bg-[var(--bg-secondary)] rounded" />
                <div className="h-4 w-20 bg-[var(--bg-secondary)] rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not connected state
  if (!isConnected || !address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            My Status
            <Badge variant="warning" size="sm">
              Not Connected
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-[var(--text-tertiary)]">
            <p className="text-sm">Connect your wallet to view your status</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const delegatee = primaryDelegation?.delegatee;
  const delegatedAmount = totalDelegatedAmount;
  const hasDelegated = !!primaryDelegation && delegatedAmount > BigInt(0);

  const stats = [
    {
      label: "vTON Balance",
      value: `${formatVTON(balance ?? BigInt(0))} vTON`,
    },
    {
      label: "Voting Power",
      value: `${formatVTON(votingPower ?? BigInt(0))} vTON`,
    },
    {
      label: "Received Delegations",
      value: `${formatVTON(receivedDelegations ?? BigInt(0))} vTON`,
    },
    {
      label: "Delegated To",
      value: hasDelegated && delegatee
        ? formatAddress(delegatee)
        : "Not delegated",
    },
    {
      label: "Delegated Amount",
      value: hasDelegated
        ? `${formatVTON(delegatedAmount)} vTON`
        : "-",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          My Status
          <Badge variant="success" size="sm">
            Connected
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isDeployed && (
          <div className="text-center py-2 mb-4 text-[var(--text-tertiary)]">
            <p className="text-xs">
              Showing default values (contracts not deployed)
            </p>
          </div>
        )}
        <div className="space-y-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-0"
            >
              <span className="text-sm text-[var(--text-secondary)]">
                {stat.label}
              </span>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
