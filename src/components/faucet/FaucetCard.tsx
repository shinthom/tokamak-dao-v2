"use client";

import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, HelperText } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useFaucetConfig,
  useClaimFromFaucet,
  useVTONBalance,
  useTONBalance,
  useMintTON,
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
 * Simple form to claim vTON and TON tokens
 */
export function FaucetCard() {
  const { address, isConnected, isReady } = useWalletConnection();

  // vTON Faucet
  const { claimAmount: vtonClaimAmount, paused, isDeployed: isVTONFaucetDeployed } = useFaucetConfig();
  const { refetch: refetchVTONBalance } = useVTONBalance(address);
  const {
    claim: claimVTON,
    hash: vtonHash,
    isPending: isVTONPending,
    isConfirming: isVTONConfirming,
    isConfirmed: isVTONConfirmed,
    error: vtonError,
    reset: resetVTON,
  } = useClaimFromFaucet();

  // TON Faucet
  const { refetch: refetchTONBalance } = useTONBalance(address);
  const {
    mint: mintTON,
    hash: tonHash,
    isPending: isTONPending,
    isConfirming: isTONConfirming,
    isConfirmed: isTONConfirmed,
    error: tonError,
    reset: resetTON,
    isDeployed: isTONDeployed,
    claimAmount: tonClaimAmount,
  } = useMintTON();

  // Store success state separately so it persists after reset
  const [vtonSuccessTxHash, setVtonSuccessTxHash] = useState<string | null>(null);
  const [tonSuccessTxHash, setTonSuccessTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (isVTONConfirmed && vtonHash) {
      refetchVTONBalance();
      setVtonSuccessTxHash(vtonHash);
    }
  }, [isVTONConfirmed, vtonHash, refetchVTONBalance]);

  useEffect(() => {
    if (isTONConfirmed && tonHash) {
      refetchTONBalance();
      setTonSuccessTxHash(tonHash);
    }
  }, [isTONConfirmed, tonHash, refetchTONBalance]);

  const handleClaimVTON = () => {
    resetVTON();
    setVtonSuccessTxHash(null);
    claimVTON();
  };

  const handleClaimTON = () => {
    if (!address) return;
    resetTON();
    setTonSuccessTxHash(null);
    mintTON(address);
  };

  const isVTONProcessing = isVTONPending || isVTONConfirming;
  const isTONProcessing = isTONPending || isTONConfirming;

  const isVTONDisabled = !isReady || !isConnected || isVTONProcessing || paused || !isVTONFaucetDeployed;
  const isTONDisabled = !isReady || !isConnected || isTONProcessing || !isTONDeployed;

  const getVTONButtonText = () => {
    if (!isReady) return "Loading...";
    if (!isConnected) return "Connect Wallet";
    if (!isVTONFaucetDeployed) return "Not Deployed";
    if (paused) return "Faucet Paused";
    if (isVTONProcessing) {
      return isVTONPending ? "Confirm in Wallet..." : "Processing...";
    }
    return `Get ${formatBalance(vtonClaimAmount)} vTON`;
  };

  const getTONButtonText = () => {
    if (!isReady) return "Loading...";
    if (!isConnected) return "Connect Wallet";
    if (!isTONDeployed) return "Not Deployed";
    if (isTONProcessing) {
      return isTONPending ? "Confirm in Wallet..." : "Processing...";
    }
    return `Get ${formatBalance(tonClaimAmount)} TON`;
  };

  const getVTONErrorMessage = () => {
    if (!vtonError) return null;
    if (vtonError.message.includes("FaucetPaused")) {
      return "Faucet is currently paused";
    }
    return "Failed to claim. Please try again.";
  };

  const getTONErrorMessage = () => {
    if (!tonError) return null;
    return "Failed to mint. Please try again.";
  };

  return (
    <div className="space-y-4">
      {/* Connection Info Card */}
      <Card>
        <CardContent>
          <div className="space-y-4">
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
          </div>
        </CardContent>
      </Card>

      {/* vTON Faucet Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">vTON (Governance Token)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              vTON is used for delegation and voting in governance.
            </p>

            {/* vTON Success Message */}
            {vtonSuccessTxHash && (
              <div className="p-3 bg-[var(--bg-success)] rounded-lg border border-[var(--border-success)]">
                <p className="text-sm font-medium text-[var(--fg-success-primary)]">
                  Successfully received {formatBalance(vtonClaimAmount)} vTON!
                </p>
                <a
                  href={`${SEPOLIA_ETHERSCAN_URL}/${vtonSuccessTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-[var(--fg-success-primary)] underline hover:opacity-80 break-all"
                >
                  View transaction
                </a>
              </div>
            )}

            {/* vTON Error Message */}
            {vtonError && (
              <HelperText error>{getVTONErrorMessage()}</HelperText>
            )}

            {/* vTON Get Button */}
            <Button
              onClick={handleClaimVTON}
              disabled={isVTONDisabled}
              loading={isVTONProcessing}
              size="lg"
              className="w-full"
            >
              {getVTONButtonText()}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* TON Faucet Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">TON (Proposal Fee Token)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              TON is required to create proposals. Creating a proposal costs 100 TON.
            </p>

            {/* TON Success Message */}
            {tonSuccessTxHash && (
              <div className="p-3 bg-[var(--bg-success)] rounded-lg border border-[var(--border-success)]">
                <p className="text-sm font-medium text-[var(--fg-success-primary)]">
                  Successfully received {formatBalance(tonClaimAmount)} TON!
                </p>
                <a
                  href={`${SEPOLIA_ETHERSCAN_URL}/${tonSuccessTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-[var(--fg-success-primary)] underline hover:opacity-80 break-all"
                >
                  View transaction
                </a>
              </div>
            )}

            {/* TON Error Message */}
            {tonError && (
              <HelperText error>{getTONErrorMessage()}</HelperText>
            )}

            {/* TON Get Button */}
            <Button
              onClick={handleClaimTON}
              disabled={isTONDisabled}
              loading={isTONProcessing}
              size="lg"
              className="w-full"
            >
              {getTONButtonText()}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
