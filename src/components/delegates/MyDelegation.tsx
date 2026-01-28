"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddressAvatar } from "@/components/ui/avatar";
import { formatAddress, formatVTON } from "@/lib/utils";
import { useVTONBalance } from "@/hooks/contracts/useVTON";
import { useDelegationParams } from "@/hooks/contracts/useDelegateRegistry";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { DelegationModal } from "./DelegationModal";

/**
 * My Delegation Section
 * Shows user's current delegation status and allows managing delegation
 * Note: Users can view their delegation by selecting a delegate from the list
 */
export function MyDelegation() {
  const { address, isConnected, isReady } = useWalletConnection();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState<"delegate" | "undelegate">("delegate");

  const { data: vtonBalance, isDeployed, refetch: refetchVTONBalance } = useVTONBalance(address);
  const { delegationPeriodRequirement } = useDelegationParams();

  const handleDelegationSuccess = React.useCallback(() => {
    refetchVTONBalance();
  }, [refetchVTONBalance]);

  // Loading state (waiting for hydration and connection restore)
  if (!isReady) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            My Delegation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="h-16 bg-[var(--bg-secondary)] rounded-lg" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-[var(--bg-tertiary)] rounded-lg" />
              <div className="h-16 bg-[var(--bg-tertiary)] rounded-lg" />
            </div>
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
            My Delegation
            <Badge variant="warning" size="sm">
              Not Connected
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-[var(--text-tertiary)]">
            <p className="text-sm">Connect your wallet to view your delegation status</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show balance and delegation info
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          My Delegation
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
        <div className="space-y-4">
          {/* Balance Info */}
          <div className="p-4 bg-[var(--bg-secondary)] rounded-lg text-center">
            <p className="text-xs text-[var(--text-tertiary)] mb-1">Your vTON Balance</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {formatVTON(vtonBalance ?? BigInt(0))} vTON
            </p>
          </div>

          {/* Instructions */}
          <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-secondary)]">
            <p>
              vTON holders cannot vote directly. Select a delegate from the list below
              to delegate your vTON and participate in governance.
            </p>
          </div>

          {/* Info */}
          <div className="text-xs text-[var(--text-tertiary)]">
            <p>
              Minimum delegation period:{" "}
              <span className="font-medium">
                {delegationPeriodRequirement
                  ? `${Number(delegationPeriodRequirement) / 86400} days`
                  : "7 days"}
              </span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
