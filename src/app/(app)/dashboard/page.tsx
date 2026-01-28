"use client";

import {
  DashboardMetrics,
  ActiveProposals,
  TopDelegates,
  DAOParameters,
  MyStatus,
  SecurityCouncilStatus,
} from "@/components/dashboard";

/**
 * vTON DAO Dashboard Page
 *
 * Displays:
 * - 6 key DAO metrics (public)
 * - Active proposals with voting status (public)
 * - Top 5 delegates by voting power (public)
 * - DAO governance parameters (public)
 * - User's personal status (wallet connection required)
 * - Security Council status (public)
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Dashboard
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Overview of vTON DAO governance metrics and activity
        </p>
      </div>

      {/* Key Metrics */}
      <section>
        <DashboardMetrics />
      </section>

      {/* Active Proposals & Top Delegates */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActiveProposals />
        <TopDelegates />
      </section>

      {/* DAO Parameters & My Status */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DAOParameters />
        <MyStatus />
      </section>

      {/* Security Council */}
      <section>
        <SecurityCouncilStatus />
      </section>
    </div>
  );
}
