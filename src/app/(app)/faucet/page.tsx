"use client";

import { FaucetCard } from "@/components/faucet";

/**
 * Testnet Faucet Page
 *
 * Allows users to claim free vTON and TON tokens for testing governance features
 * such as delegation, voting, and creating proposals on the testnet.
 */
export default function FaucetPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Testnet Faucet
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Claim free vTON and TON tokens for testing governance features
        </p>
      </div>

      {/* Faucet Card */}
      <FaucetCard />

      {/* ETH Faucet Notice */}
      <div className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-secondary)]">
        <p className="text-sm text-[var(--text-secondary)]">
          Need Sepolia ETH for gas fees?{" "}
          <a
            href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--text-brand)] hover:underline font-medium"
          >
            Get free testnet ETH from Google Cloud Faucet
          </a>
        </p>
      </div>
    </div>
  );
}
