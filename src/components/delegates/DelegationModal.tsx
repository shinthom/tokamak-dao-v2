"use client";

import * as React from "react";
import { useAccount, useChainId } from "wagmi";
import { parseEther, formatEther } from "viem";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, HelperText } from "@/components/ui/input";
import { AddressAvatar } from "@/components/ui/avatar";
import { formatAddress, formatVTON } from "@/lib/utils";
import { useVTONBalance, useVTONAllowance, useVTONApprove } from "@/hooks/contracts/useVTON";
import { useDelegate, useUndelegate } from "@/hooks/contracts/useDelegateRegistry";
import { getContractAddresses } from "@/constants/contracts";

export interface DelegationModalProps {
  open: boolean;
  onClose: () => void;
  delegatee: `0x${string}`;
  delegateeName?: string;
  mode: "delegate" | "undelegate";
  currentDelegatedAmount?: bigint;
  onSuccess?: () => void;
}

/**
 * Modal for delegating or undelegating vTON
 */
export function DelegationModal({
  open,
  onClose,
  delegatee,
  delegateeName,
  mode,
  currentDelegatedAmount = BigInt(0),
  onSuccess,
}: DelegationModalProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const { data: vtonBalance } = useVTONBalance(address);
  const { data: allowance, refetch: refetchAllowance } = useVTONAllowance(
    address,
    addresses.delegateRegistry
  );

  const [amount, setAmount] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<"input" | "approve" | "delegate">("input");

  const {
    approve,
    isPending: isApprovePending,
    isConfirming: isApproveConfirming,
    isConfirmed: isApproveConfirmed,
    error: approveError,
    reset: resetApprove,
  } = useVTONApprove();

  const {
    delegate,
    isPending: isDelegatePending,
    isConfirming: isDelegateConfirming,
    isConfirmed: isDelegateConfirmed,
    error: delegateError,
    reset: resetDelegate,
  } = useDelegate();

  const {
    undelegate,
    isPending: isUndelegatePending,
    isConfirming: isUndelegateConfirming,
    isConfirmed: isUndelegateConfirmed,
    error: undelegateError,
    reset: resetUndelegate,
  } = useUndelegate();

  const isPending =
    mode === "delegate"
      ? step === "approve"
        ? isApprovePending
        : isDelegatePending
      : isUndelegatePending;
  const isConfirming =
    mode === "delegate"
      ? step === "approve"
        ? isApproveConfirming
        : isDelegateConfirming
      : isUndelegateConfirming;
  const isConfirmed = mode === "delegate" ? isDelegateConfirmed : isUndelegateConfirmed;
  const txError =
    mode === "delegate"
      ? step === "approve"
        ? approveError
        : delegateError
      : undelegateError;

  const maxAmount =
    mode === "delegate"
      ? vtonBalance ?? BigInt(0)
      : currentDelegatedAmount;

  const displayName = delegateeName || formatAddress(delegatee);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setAmount("");
      setError(null);
      setStep("input");
      resetApprove();
      resetDelegate();
      resetUndelegate();
    }
  }, [open, resetApprove, resetDelegate, resetUndelegate]);

  // After approve is confirmed, proceed to delegate
  React.useEffect(() => {
    if (isApproveConfirmed && step === "approve" && amount) {
      refetchAllowance();
      setStep("delegate");
      resetApprove();
      const parsedAmount = parseEther(amount);
      delegate(delegatee, parsedAmount);
    }
  }, [isApproveConfirmed, step, amount, refetchAllowance, resetApprove, delegate, delegatee]);

  // Close modal on successful transaction
  React.useEffect(() => {
    if (isConfirmed) {
      onSuccess?.();
      const timeout = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isConfirmed, onClose, onSuccess]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);
    setError(null);

    if (value) {
      try {
        const parsedAmount = parseEther(value);
        if (parsedAmount > maxAmount) {
          setError(
            mode === "delegate"
              ? "Amount exceeds your vTON balance"
              : "Amount exceeds your delegated amount"
          );
        } else if (parsedAmount <= BigInt(0)) {
          setError("Amount must be greater than 0");
        }
      } catch {
        setError("Invalid amount");
      }
    }
  };

  const handleMax = () => {
    setAmount(formatEther(maxAmount));
    setError(null);
  };

  const handleSubmit = () => {
    if (!amount || error) return;

    try {
      const parsedAmount = parseEther(amount);
      if (mode === "delegate") {
        const currentAllowance = allowance ?? BigInt(0);
        if (currentAllowance < parsedAmount) {
          // Need to approve first
          setStep("approve");
          approve(addresses.delegateRegistry, parsedAmount);
        } else {
          // Already approved, delegate directly
          setStep("delegate");
          delegate(delegatee, parsedAmount);
        }
      } else {
        undelegate(delegatee, parsedAmount);
      }
    } catch {
      setError("Invalid amount");
    }
  };

  const getButtonText = () => {
    if (isConfirmed) return "Success!";
    if (mode === "delegate") {
      if (step === "approve") {
        if (isApproveConfirming) return "Confirming Approval...";
        if (isApprovePending) return "Approve in Wallet...";
      }
      if (step === "delegate") {
        if (isDelegateConfirming) return "Confirming Delegation...";
        if (isDelegatePending) return "Delegate in Wallet...";
      }
      // Check if approval is needed
      try {
        const parsedAmount = amount ? parseEther(amount) : BigInt(0);
        const currentAllowance = allowance ?? BigInt(0);
        if (parsedAmount > 0 && currentAllowance < parsedAmount) {
          return "Approve & Delegate";
        }
      } catch {
        // Invalid amount, just show Delegate
      }
      return "Delegate";
    }
    if (isConfirming) return "Confirming...";
    if (isPending) return "Confirm in Wallet...";
    return "Undelegate";
  };

  const isProcessing =
    isApprovePending ||
    isApproveConfirming ||
    isDelegatePending ||
    isDelegateConfirming ||
    isUndelegatePending ||
    isUndelegateConfirming;
  const isDisabled = !amount || !!error || isProcessing || isConfirmed;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "delegate" ? "Delegate vTON" : "Undelegate vTON"}
      description={
        mode === "delegate"
          ? "Delegate your vTON to a delegatee to participate in governance"
          : "Remove your delegation from this delegatee"
      }
      size="sm"
    >
      <ModalBody className="space-y-4">
        {/* Delegatee Info */}
        <div className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg">
          <AddressAvatar address={delegatee} size="md" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {displayName}
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">
              {delegatee}
            </span>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="amount">Amount</Label>
            <span className="text-xs text-[var(--text-tertiary)]">
              {mode === "delegate" ? "Balance" : "Delegated"}:{" "}
              {formatVTON(maxAmount)} vTON
            </span>
          </div>
          <div className="relative">
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={amount}
              onChange={handleAmountChange}
              error={!!error}
              className="pr-16"
            />
            <Button
              variant="ghost"
              size="xs"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6"
              onClick={handleMax}
            >
              MAX
            </Button>
          </div>
          {error && <HelperText error>{error}</HelperText>}
          {txError && (
            <HelperText error>
              Transaction failed: {txError.message.slice(0, 50)}...
            </HelperText>
          )}
        </div>

        {/* Info */}
        {mode === "delegate" && step === "input" && (
          <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg text-xs text-[var(--text-secondary)]">
            <p>
              Your voting power will be transferred to the delegatee
            </p>
          </div>
        )}

        {/* Progress Steps */}
        {mode === "delegate" && (step === "approve" || step === "delegate") && (
          <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg text-xs space-y-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium ${
                  step === "approve"
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-success-500)] text-white"
                }`}
              >
                {step === "approve" ? "1" : "\u2713"}
              </div>
              <span
                className={
                  step === "approve"
                    ? "text-[var(--text-primary)] font-medium"
                    : "text-[var(--text-tertiary)]"
                }
              >
                Approve vTON spending
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium ${
                  step === "delegate"
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--border-secondary)] text-[var(--text-tertiary)]"
                }`}
              >
                2
              </div>
              <span
                className={
                  step === "delegate"
                    ? "text-[var(--text-primary)] font-medium"
                    : "text-[var(--text-tertiary)]"
                }
              >
                Delegate to {displayName}
              </span>
            </div>
          </div>
        )}

        {/* Success Message */}
        {isConfirmed && (
          <div className="p-3 bg-[var(--status-success-bg)] border border-[var(--status-success-border)] rounded-lg text-center">
            <p className="text-sm text-[var(--status-success-fg)] font-medium">
              {mode === "delegate"
                ? "Delegation successful!"
                : "Undelegation successful!"}
            </p>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isProcessing}>
          Cancel
        </Button>
        <Button
          variant={mode === "delegate" ? "primary" : "destructive"}
          onClick={handleSubmit}
          disabled={isDisabled}
          loading={isProcessing}
        >
          {getButtonText()}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
