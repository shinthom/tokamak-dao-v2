"use client";

import * as React from "react";
import { useChainId, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { encodeFunctionData } from "viem";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea, Label, HelperText } from "@/components/ui/input";
import {
  useProposeEmergencyAction,
  ActionType,
} from "@/hooks/contracts/useSecurityCouncil";
import { useCancelableProposals } from "@/hooks/contracts/useDAOGovernor";
import { getContractAddresses, DAO_GOVERNOR_ABI } from "@/constants/contracts";
import { ProposalSelectList } from "./ProposalSelectList";
import { ProposalPreviewCard } from "./ProposalPreviewCard";
import type { ProposalListItem } from "@/hooks/contracts/useDAOGovernor";

/**
 * Modal steps for the Cancel Proposal flow
 */
enum Step {
  SelectProposal = 1,
  EnterReason = 2,
  Confirm = 3,
}

export interface CancelProposalModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * 3-step modal for creating an Emergency Action to cancel a DAO Proposal
 */
export function CancelProposalModal({
  open,
  onClose,
  onSuccess,
}: CancelProposalModalProps) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const queryClient = useQueryClient();

  // State
  const [step, setStep] = React.useState<Step>(Step.SelectProposal);
  const [selectedProposal, setSelectedProposal] = React.useState<ProposalListItem | null>(null);
  const [reason, setReason] = React.useState("");
  const [validationError, setValidationError] = React.useState<string | null>(null);

  // Hooks
  const { data: cancelableProposals, isLoading: isLoadingProposals } = useCancelableProposals();
  const {
    proposeEmergencyAction,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error: txError,
    reset: resetTx,
  } = useProposeEmergencyAction();

  // Wait for transaction receipt
  const { isLoading: isWaitingReceipt, isSuccess: isReceiptSuccess } =
    useWaitForTransactionReceipt({ hash });

  const isProcessing = isPending || isConfirming || isWaitingReceipt;

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setStep(Step.SelectProposal);
      setSelectedProposal(null);
      setReason("");
      setValidationError(null);
      resetTx();
    }
  }, [open, resetTx]);

  // Handle successful transaction
  React.useEffect(() => {
    if (isConfirmed || isReceiptSuccess) {
      // Invalidate queries to refresh the pending actions list
      queryClient.invalidateQueries({ queryKey: ["readContract"] });
      queryClient.invalidateQueries({ queryKey: ["readContracts"] });
      onSuccess?.();
      // Close modal after a short delay to show success state
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, isReceiptSuccess, onClose, onSuccess, queryClient]);

  // Handlers
  const handleSelectProposal = (proposal: ProposalListItem) => {
    setSelectedProposal(proposal);
    setValidationError(null);
  };

  const handleNext = () => {
    if (step === Step.SelectProposal) {
      if (!selectedProposal) {
        setValidationError("Please select a proposal to cancel");
        return;
      }
      setStep(Step.EnterReason);
    } else if (step === Step.EnterReason) {
      if (!reason.trim()) {
        setValidationError("Please provide a reason for cancellation");
        return;
      }
      setStep(Step.Confirm);
    }
    setValidationError(null);
  };

  const handleBack = () => {
    if (step === Step.EnterReason) {
      setStep(Step.SelectProposal);
    } else if (step === Step.Confirm) {
      setStep(Step.EnterReason);
    }
    setValidationError(null);
  };

  const handleSubmit = () => {
    if (!selectedProposal) return;

    // Encode the cancel function call
    const calldata = encodeFunctionData({
      abi: DAO_GOVERNOR_ABI,
      functionName: "cancel",
      args: [BigInt(selectedProposal.id)],
    });

    // Propose the emergency action
    proposeEmergencyAction(
      ActionType.CancelProposal,
      addresses.daoGovernor as `0x${string}`,
      calldata,
      reason
    );
  };

  // Get modal title based on step
  const getTitle = () => {
    switch (step) {
      case Step.SelectProposal:
        return "Select Proposal to Cancel";
      case Step.EnterReason:
        return "Enter Cancellation Reason";
      case Step.Confirm:
        return "Confirm Emergency Action";
    }
  };

  // Get modal description based on step
  const getDescription = () => {
    switch (step) {
      case Step.SelectProposal:
        return "Choose a proposal from the list below";
      case Step.EnterReason:
        return "Explain why this proposal should be canceled";
      case Step.Confirm:
        return "Review and submit your emergency action";
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={getTitle()}
      description={getDescription()}
      size="lg"
    >
      <ModalBody className="space-y-4">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 pb-2">
          {[Step.SelectProposal, Step.EnterReason, Step.Confirm].map((s) => (
            <div
              key={s}
              className={`flex items-center ${s < Step.Confirm ? "flex-1" : ""}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step >= s
                    ? "bg-[var(--color-primary-500)] text-white"
                    : "bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]"
                }`}
              >
                {step > s ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                ) : (
                  s
                )}
              </div>
              {s < Step.Confirm && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    step > s
                      ? "bg-[var(--color-primary-500)]"
                      : "bg-[var(--border-secondary)]"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Proposal */}
        {step === Step.SelectProposal && (
          <ProposalSelectList
            proposals={cancelableProposals ?? []}
            isLoading={isLoadingProposals}
            selectedProposalId={selectedProposal?.id ?? null}
            onSelect={handleSelectProposal}
          />
        )}

        {/* Step 2: Enter Reason */}
        {step === Step.EnterReason && selectedProposal && (
          <div className="space-y-4">
            <ProposalPreviewCard proposal={selectedProposal} compact />

            <div className="space-y-2">
              <Label htmlFor="cancel-reason" required>
                Reason for Cancellation
              </Label>
              <Textarea
                id="cancel-reason"
                placeholder="Explain why this proposal should be canceled..."
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setValidationError(null);
                }}
                error={!!validationError && validationError.includes("reason")}
                rows={4}
              />
              <HelperText>
                This reason will be publicly visible and recorded on-chain.
              </HelperText>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === Step.Confirm && selectedProposal && (
          <div className="space-y-4">
            {/* Warning Banner */}
            <div className="p-4 rounded-lg bg-[var(--status-warning-bg)] border border-[var(--status-warning-border)]">
              <div className="flex gap-3">
                <svg
                  className="w-5 h-5 text-[var(--status-warning-fg)] shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-[var(--status-warning-fg)]">
                    This is an emergency action
                  </p>
                  <p className="text-xs text-[var(--status-warning-fg)] mt-1 opacity-80">
                    Other Security Council members will need to approve this action
                    before it can be executed. Once executed, the proposal will be
                    permanently canceled.
                  </p>
                </div>
              </div>
            </div>

            {/* Proposal Details */}
            <div>
              <p className="text-xs text-[var(--text-tertiary)] mb-2 uppercase tracking-wide">
                Proposal to Cancel
              </p>
              <ProposalPreviewCard proposal={selectedProposal} />
            </div>

            {/* Reason */}
            <div>
              <p className="text-xs text-[var(--text-tertiary)] mb-2 uppercase tracking-wide">
                Cancellation Reason
              </p>
              <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-secondary)]">
                <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                  {reason}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Messages */}
        {(validationError || txError) && (
          <HelperText error>
            {validationError || txError?.message || "Transaction failed"}
          </HelperText>
        )}

        {/* Success Message */}
        {(isConfirmed || isReceiptSuccess) && (
          <div className="p-3 bg-[var(--status-success-bg)] border border-[var(--status-success-border)] rounded-lg text-center">
            <p className="text-sm text-[var(--status-success-fg)] font-medium">
              Emergency action proposed successfully!
            </p>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        {step === Step.SelectProposal ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleNext}
              disabled={!selectedProposal || isLoadingProposals}
            >
              Continue
            </Button>
          </>
        ) : step === Step.EnterReason ? (
          <>
            <Button variant="secondary" onClick={handleBack}>
              Back
            </Button>
            <Button onClick={handleNext} disabled={!reason.trim()}>
              Continue
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              onClick={handleBack}
              disabled={isProcessing}
            >
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={isProcessing || isConfirmed || isReceiptSuccess}
              loading={isProcessing}
            >
              {isPending
                ? "Confirming..."
                : isConfirming || isWaitingReceipt
                ? "Processing..."
                : "Create Emergency Action"}
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}
