"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Shield icon for access denied state
 */
const ShieldIcon = () => (
  <svg
    className="size-16 text-[var(--text-tertiary)]"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
    />
  </svg>
);

/**
 * Displays access denied message for non-members
 */
export function AccessDenied() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center gap-4">
            <ShieldIcon />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                Access Denied
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                This page is restricted to Security Council members only.
                Your wallet address is not a member of the Security Council.
              </p>
            </div>
            <Button asChild variant="secondary" className="mt-4">
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Wallet icon for connect prompt
 */
const WalletIcon = () => (
  <svg
    className="size-16 text-[var(--text-tertiary)]"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
    />
  </svg>
);

/**
 * Displays wallet connection prompt
 */
export function ConnectWalletPrompt() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center gap-4">
            <WalletIcon />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                Connect Your Wallet
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Please connect your wallet to access the Security Council page.
                Only Security Council members can view this page.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Loading spinner for member check
 */
export function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="size-12 border-4 border-[var(--border-primary)] border-t-[var(--color-primary-500)] rounded-full animate-spin" />
        <p className="text-sm text-[var(--text-secondary)]">
          Verifying membership...
        </p>
      </div>
    </div>
  );
}
