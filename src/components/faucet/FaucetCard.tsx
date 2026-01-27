"use client";

import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, HelperText } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useFaucetConfig,
  useClaimFromFaucet,
  useVTONBalance,
} from "@/hooks/contracts";

const SEPOLIA_ETHERSCAN_URL = "https://sepolia.etherscan.io/tx";

/**
 * Format token balance
 */
function formatBalance(value: bigint): string {
  const formatted = formatEther(value);
  const num = parseFloat(formatted);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Faucet Card Component
 * Simple form to claim vTON tokens
 */
export function FaucetCard() {
  const { address, isConnected, isReady } = useWalletConnection();

  const { claimAmount, paused, isDeployed } = useFaucetConfig();

  const { refetch: refetchVTONBalance } = useVTONBalance(address);

  const {
    claim,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
  } = useClaimFromFaucet();

  // Store success state separately so it persists after reset
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (isConfirmed && hash) {
      refetchVTONBalance();
      setSuccessTxHash(hash);
    }
  }, [isConfirmed, hash, refetchVTONBalance]);

  const handleClaim = () => {
    reset();
    setSuccessTxHash(null);
    claim();
  };

  const isProcessing = isPending || isConfirming;
  const isDisabled = !isReady || !isConnected || isProcessing || paused || !isDeployed;

  const getButtonText = () => {
    if (!isReady) return "Loading...";
    if (!isConnected) return "Connect Wallet";
    if (!isDeployed) return "Not Deployed";
    if (paused) return "Faucet Paused";
    if (isProcessing) {
      return isPending ? "Confirm in Wallet..." : "Processing...";
    }
    return `Get ${formatBalance(claimAmount)} vTON`;
  };

  const getErrorMessage = () => {
    if (!error) return null;
    if (error.message.includes("FaucetPaused")) {
      return "Faucet is currently paused";
    }
    return "Failed to claim. Please try again.";
  };

  return (
    <Card>
      <CardContent>
        <div className="space-y-6">
          {/* Network Field */}
          <div className="space-y-2">
            <Label>Network</Label>
            <Input
              value="Ethereum Sepolia"
              readOnly
              disabled
              size="lg"
            />
          </div>

          {/* Account Field */}
          <div className="space-y-2">
            <Label>Account</Label>
            <Input
              value={isConnected && address ? address : "Not connected"}
              readOnly
              disabled
              size="lg"
            />
          </div>

          {/* Success Message */}
          {successTxHash && (
            <div className="p-3 bg-[var(--bg-success)] rounded-lg border border-[var(--border-success)]">
              <p className="text-sm font-medium text-[var(--fg-success-primary)]">
                Successfully received {formatBalance(claimAmount)} vTON!
              </p>
              <a
                href={`${SEPOLIA_ETHERSCAN_URL}/${successTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm text-[var(--fg-success-primary)] underline hover:opacity-80 break-all"
              >
                View transaction: {successTxHash}
              </a>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <HelperText error>{getErrorMessage()}</HelperText>
          )}

          {/* Get Button */}
          <Button
            onClick={handleClaim}
            disabled={isDisabled}
            loading={isProcessing}
            size="lg"
          >
            {getButtonText()}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
