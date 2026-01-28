"use client";

import * as React from "react";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { MyDelegation, DelegatesList, DelegateRegistrationModal } from "@/components/delegates";
import { Button } from "@/components/ui/button";
import { useDelegateInfo } from "@/hooks/contracts/useDelegateRegistry";

/**
 * Delegates Page
 *
 * Displays:
 * - User's current delegation status
 * - List of all registered delegates
 * - Ability to delegate/undelegate vTON
 * - Option to register as a delegate
 *
 * Key rules:
 * - vTON holders cannot vote directly, must delegate
 * - Delegation cap: 20% of total supply
 * - Minimum delegation period: 7 days
 */
export default function DelegatesPage() {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const { data: delegateInfo, isLoading, refetch } = useDelegateInfo(address);
  const [registrationModalOpen, setRegistrationModalOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Only check connection after mounting to avoid hydration mismatch
  const ready = mounted && isConnected;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Delegates
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Delegate your vTON to participate in governance voting
          </p>
        </div>
        {ready && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setRegistrationModalOpen(true)}
              loading={isLoading}
              disabled={delegateInfo && delegateInfo.registeredAt > BigInt(0) && delegateInfo.isActive}
            >
              {delegateInfo && delegateInfo.registeredAt > BigInt(0) && delegateInfo.isActive
                ? "Already Registered"
                : "Register as Delegate"}
            </Button>
          </div>
        )}
      </div>

      {/* My Delegation Status */}
      <section>
        <MyDelegation />
      </section>

      {/* All Delegates */}
      <section>
        <DelegatesList />
      </section>

      {/* Delegate Registration Modal */}
      <DelegateRegistrationModal
        open={registrationModalOpen}
        onClose={() => setRegistrationModalOpen(false)}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ["readContract"] });
        }}
      />
    </div>
  );
}
