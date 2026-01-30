"use client";

import * as React from "react";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn, formatVTON } from "@/lib/utils";
import { VoteType } from "@/types/governance";
import { useCastVote } from "@/hooks/contracts/useDAOGovernor";
import { useTotalDelegated } from "@/hooks/contracts/useDelegateRegistry";

export interface VotingModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposalId: bigint;
  proposalTitle: string;
  onVoteSuccess?: () => void;
}

interface VoteOption {
  type: VoteType;
  label: string;
  description: string;
  color: string;
  bgColor: string;
}

const VOTE_OPTIONS: VoteOption[] = [
  {
    type: VoteType.For,
    label: "For",
    description: "Support this proposal",
    color: "text-[var(--color-vote-for)]",
    bgColor: "bg-[var(--color-vote-for)]/10 border-[var(--color-vote-for)]",
  },
  {
    type: VoteType.Against,
    label: "Against",
    description: "Oppose this proposal",
    color: "text-[var(--color-vote-against)]",
    bgColor: "bg-[var(--color-vote-against)]/10 border-[var(--color-vote-against)]",
  },
  {
    type: VoteType.Abstain,
    label: "Abstain",
    description: "Neither support nor oppose",
    color: "text-[var(--color-vote-abstain)]",
    bgColor: "bg-[var(--color-vote-abstain)]/10 border-[var(--color-vote-abstain)]",
  },
];

export function VotingModal({
  isOpen,
  onClose,
  proposalId,
  proposalTitle,
  onVoteSuccess,
}: VotingModalProps) {
  const { address } = useAccount();
  const [selectedVote, setSelectedVote] = React.useState<VoteType | null>(null);
  const queryClient = useQueryClient();

  const { data: votingPower } = useTotalDelegated(address);
  const { castVote, data: txHash, isPending } = useCastVote();

  // Wait for transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedVote(null);
    }
  }, [isOpen]);

  // Invalidate queries and close modal on transaction confirmed
  React.useEffect(() => {
    if (isConfirmed) {
      // Add a small delay to allow RPC node to sync with the new state
      const timer = setTimeout(async () => {
        // Invalidate all queries to refresh data
        await queryClient.invalidateQueries();
        // Call success callback to trigger parent refetch
        onVoteSuccess?.();
        onClose();
      }, 2000); // 2 second delay for RPC sync

      return () => clearTimeout(timer);
    }
  }, [isConfirmed, onClose, onVoteSuccess, queryClient]);

  const handleSubmit = async () => {
    if (selectedVote === null) return;
    castVote(proposalId, selectedVote);
  };

  const isLoading = isPending || isConfirming;

  const formattedVotingPower = votingPower
    ? formatVTON(votingPower, { compact: true })
    : "0";

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Cast Your Vote"
      description={proposalTitle}
      size="md"
    >
      <ModalBody className="space-y-6">
        {/* Voting Power Display */}
        <div className="p-4 rounded-lg bg-[var(--bg-tertiary)]">
          <p className="text-sm text-[var(--text-secondary)]">Your Voting Power</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {formattedVotingPower} vTON
          </p>
        </div>

        {/* Vote Options */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Select your vote
          </p>
          <div className="grid gap-3">
            {VOTE_OPTIONS.map((option) => (
              <button
                key={option.type}
                type="button"
                onClick={() => setSelectedVote(option.type)}
                className={cn(
                  "w-full p-4 rounded-lg border-2 text-left transition-all",
                  "hover:border-[var(--border-hover)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-2",
                  selectedVote === option.type
                    ? option.bgColor
                    : "border-[var(--border-default)] bg-[var(--bg-secondary)]"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className={cn(
                        "font-medium",
                        selectedVote === option.type
                          ? option.color
                          : "text-[var(--text-primary)]"
                      )}
                    >
                      {option.label}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {option.description}
                    </p>
                  </div>

                  {/* Checkmark */}
                  <div
                    className={cn(
                      "size-6 rounded-full border-2 flex items-center justify-center shrink-0",
                      selectedVote === option.type
                        ? `${option.bgColor} border-current`
                        : "border-[var(--border-default)]"
                    )}
                  >
                    {selectedVote === option.type && (
                      <svg
                        className={cn("size-4", option.color)}
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
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={selectedVote === null || !address || isLoading}
          loading={isLoading}
        >
          {isPending ? "Submitting..." : isConfirming ? "Confirming..." : "Submit Vote"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
