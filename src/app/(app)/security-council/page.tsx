"use client";

import { useAccount } from "wagmi";
import { StatCard } from "@/components/ui/stat-card";
import {
  CouncilMembersList,
  PendingActionsList,
  CreateActionForm,
  AccessDenied,
  ConnectWalletPrompt,
  LoadingState,
} from "@/components/security-council";
import {
  useSecurityCouncil,
  useIsMember,
  usePendingActions,
} from "@/hooks/contracts/useSecurityCouncil";

/**
 * Security Council Page Content
 * Only visible to Security Council members
 */
function SecurityCouncilContent() {
  const { address } = useAccount();
  const { members, threshold, pendingActionsCount, isLoading } =
    useSecurityCouncil();
  const { data: pendingActionIds, isLoading: isLoadingActions } =
    usePendingActions();
  const { data: isMember } = useIsMember(address);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Security Council
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Emergency response multi-signature governance
        </p>
      </div>

      {/* Stats Overview */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Members"
          value={members?.length ?? 0}
          size="sm"
        />
        <StatCard
          label="Threshold"
          value={`${threshold?.toString() ?? 0}/${members?.length ?? 0}`}
          size="sm"
        />
        <StatCard
          label="Pending Actions"
          value={pendingActionsCount?.toString() ?? "0"}
          size="sm"
        />
      </section>

      {/* Main Content */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members List - Left Column */}
        <div className="lg:col-span-1">
          <CouncilMembersList
            members={members ?? []}
            isLoading={isLoading}
          />
        </div>

        {/* Actions - Right Column */}
        <div className="lg:col-span-2 space-y-6">
          <PendingActionsList
            actionIds={pendingActionIds ?? []}
            threshold={Number(threshold ?? 0)}
            currentAddress={address}
            isMember={isMember ?? false}
            isLoading={isLoadingActions}
          />
          <CreateActionForm isMember={isMember ?? false} />
        </div>
      </section>
    </div>
  );
}

/**
 * Security Council Page
 *
 * Access restricted to Security Council members only.
 * Non-members see an access denied message.
 * Unauthenticated users see a wallet connection prompt.
 */
export default function SecurityCouncilPage() {
  const { address, isConnecting } = useAccount();
  const { data: isMember, isLoading: isCheckingMember } = useIsMember(address);

  // Wallet not connected
  if (!address && !isConnecting) {
    return <ConnectWalletPrompt />;
  }

  // Checking membership status
  if (isConnecting || isCheckingMember) {
    return <LoadingState />;
  }

  // Not a member
  if (!isMember) {
    return <AccessDenied />;
  }

  // Member - show full content
  return <SecurityCouncilContent />;
}
