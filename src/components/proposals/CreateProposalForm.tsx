"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea, Label, HelperText } from "@/components/ui/input";
import { cn, formatVTON } from "@/lib/utils";
import { usePropose, useGovernanceParams } from "@/hooks/contracts/useDAOGovernor";
import { useTONAllowance, useApproveTON, useTONBalance } from "@/hooks/contracts/useTON";
import { useVTONBalance, useTotalSupply } from "@/hooks/contracts/useVTON";
import { useTotalDelegated } from "@/hooks/contracts/useDelegateRegistry";
import { getContractAddresses, DAO_GOVERNOR_ABI } from "@/constants/contracts";
import { parseEventLogs } from "viem";
import { ActionBuilderList, DEFAULT_ACTION } from "./ActionBuilderList";
import type { BuiltAction } from "./ActionBuilder";

export interface CreateProposalFormProps {
  className?: string;
}

export function CreateProposalForm({ className }: CreateProposalFormProps) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const addresses = getContractAddresses(chainId);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [burnRateInput, setBurnRateInput] = React.useState<string>("");
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [actions, setActions] = React.useState<BuiltAction[]>([
    { ...DEFAULT_ACTION },
  ]);

  const { proposeAsync } = usePropose();
  const { proposalCreationCost, proposalThreshold, isLoading: isGovernanceLoading } = useGovernanceParams();

  // vTON balance and threshold state
  const { data: vtonBalance } = useVTONBalance(address);
  const { data: vtonTotalSupply, isLoading: isTotalSupplyLoading } = useTotalSupply();
  const { data: delegatedToMe } = useTotalDelegated(address);

  // Loading state for vTON requirements
  // Also treat undefined data as loading (data may be undefined even after isLoading becomes false)
  const isVTONDataLoading = isGovernanceLoading || isTotalSupplyLoading ||
    vtonTotalSupply === undefined || proposalThreshold === undefined;


  // Total voting power = balance + delegated to me
  const totalVotingPower = (vtonBalance ?? BigInt(0)) + (delegatedToMe ?? BigInt(0));

  // TON approval state
  const { data: tonBalance } = useTONBalance(address);
  const { data: tonAllowance, refetch: refetchAllowance } = useTONAllowance(
    address,
    addresses.daoGovernor
  );
  const { approveAsync } = useApproveTON();

  const formattedCost = proposalCreationCost
    ? formatVTON(proposalCreationCost)
    : "100";

  const requiredAmount = proposalCreationCost ?? BigInt(100 * 10 ** 18);
  const hasEnoughTON = tonBalance >= requiredAmount;
  const hasEnoughAllowance = tonAllowance >= requiredAmount;

  // Calculate required vTON based on threshold (0.25% = 25 basis points)
  const requiredVTON = vtonTotalSupply && proposalThreshold
    ? (vtonTotalSupply * proposalThreshold) / BigInt(10000)
    : BigInt(0);
  const hasEnoughVTON = totalVotingPower >= requiredVTON;

  // Form validation
  const isFormValid =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    isConnected &&
    hasEnoughTON &&
    hasEnoughVTON;

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitStep, setSubmitStep] = React.useState<"idle" | "approving" | "waitingApproval" | "proposing" | "waitingProposal">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid || !publicClient) return;

    setIsSubmitting(true);

    try {
      // Step 1: Approve if needed
      if (!hasEnoughAllowance) {
        setSubmitStep("approving");
        const approveHash = await approveAsync(addresses.daoGovernor);
        // Wait for the approval transaction to be confirmed
        setSubmitStep("waitingApproval");
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        await refetchAllowance();
      }

      // Step 2: Create proposal
      setSubmitStep("proposing");
      const fullDescription = `# ${title}\n\n${description}`;

      // Prepare action arrays
      const targets = actions.map((a) => (a.target || "0x0000000000000000000000000000000000000000") as `0x${string}`);
      const values = actions.map((a) => BigInt(a.value || "0"));
      const calldatas = actions.map((a) => (a.calldata || "0x") as `0x${string}`);

      setSubmitStep("waitingProposal");
      // Convert percentage to basis points (e.g., 30% -> 3000)
      const burnRate = burnRateInput === "" ? 0 : Number(burnRateInput);
      const burnRateBasisPoints = Math.round(burnRate * 100);
      const proposalHash = await proposeAsync(targets, values, calldatas, fullDescription, burnRateBasisPoints);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: proposalHash });

      // Parse ProposalCreated event to get the proposal ID
      const logs = parseEventLogs({
        abi: DAO_GOVERNOR_ABI,
        logs: receipt.logs,
        eventName: "ProposalCreated",
      });

      if (logs.length > 0 && logs[0].args.proposalId) {
        const proposalId = logs[0].args.proposalId.toString();
        router.push(`/proposals/${proposalId}`);
      } else {
        router.push("/proposals");
      }
    } catch (error) {
      console.error("Failed to create proposal:", error);
    } finally {
      setIsSubmitting(false);
      setSubmitStep("idle");
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      {/* Requirements Card */}
      <Card>
        <CardHeader>
          <CardTitle>Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* TON Requirement Row */}
          <div className="flex items-center justify-between py-2 border-b border-[var(--border-primary)]">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Proposal Fee</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                ({formattedCost} TON will be burned to prevent spam)
              </p>
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <p className="text-sm font-medium tabular-nums text-[var(--text-primary)]">
                {formatVTON(tonBalance)} TON
              </p>
              <Badge
                variant={hasEnoughTON ? (hasEnoughAllowance ? "success" : "warning") : "error"}
                size="sm"
              >
                {hasEnoughTON
                  ? hasEnoughAllowance ? "Ready" : "Needs approval"
                  : "Insufficient"}
              </Badge>
            </div>
          </div>

          {/* vTON Requirement Row */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Voting Power Required</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {isVTONDataLoading
                  ? "Loading..."
                  : `(You need ${formatVTON(requiredVTON)} vTON voting power to create proposals)`}
              </p>
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-sm font-medium tabular-nums text-[var(--text-primary)] underline decoration-dotted decoration-[var(--text-tertiary)] underline-offset-2">
                      {formatVTON(totalVotingPower)} vTON
                    </p>
                  </TooltipTrigger>
                  <TooltipContent>
                    Your balance: {formatVTON(vtonBalance ?? BigInt(0))} vTON + Delegated to you: {formatVTON(delegatedToMe ?? BigInt(0))} vTON
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {!isVTONDataLoading && (
                <Badge
                  variant={hasEnoughVTON ? "success" : "error"}
                  size="sm"
                >
                  {hasEnoughVTON ? "Ready" : "Insufficient"}
                </Badge>
              )}
            </div>
          </div>

          {/* Status Messages */}
          {!isConnected && (
            <div className="mt-2 p-3 rounded-lg bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] text-sm">
              Please connect your wallet to create a proposal.
            </div>
          )}

          {isConnected && (!hasEnoughTON || !hasEnoughVTON) && (
            <div className="mt-2 pt-3 border-t border-[var(--border-primary)]">
              <a href="/faucet" className="text-sm text-[var(--brand-primary)] hover:underline">
                Get tokens from faucet →
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proposal Details */}
      <Card>
        <CardHeader>
          <CardTitle>Proposal Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" required>
              Title
            </Label>
            <Input
              id="title"
              placeholder="TIP-XXX: Short, descriptive title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={title.length > 0 && title.length < 10}
            />
            <HelperText error={title.length > 0 && title.length < 10}>
              {title.length > 0 && title.length < 10
                ? "Title should be at least 10 characters"
                : "Use a clear, concise title that describes the proposal"}
            </HelperText>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" required>
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Provide a detailed description of your proposal. You can use Markdown for formatting.

## Summary
Brief overview of the proposal

## Motivation
Why is this proposal needed?

## Specification
Technical details of the changes

## Risks
Potential risks and mitigations"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={12}
              error={description.length > 0 && description.length < 50}
            />
            <HelperText error={description.length > 0 && description.length < 50}>
              {description.length > 0 && description.length < 50
                ? "Description should be at least 50 characters"
                : "Markdown formatting is supported"}
            </HelperText>
          </div>

          {/* Vote Burn Rate */}
          <div className="space-y-2">
            <Label htmlFor="burnRate">
              Vote Burn Rate (%)
            </Label>
            <Input
              id="burnRate"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={burnRateInput}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setBurnRateInput("");
                } else {
                  const num = Number(val);
                  if (num >= 0 && num <= 100) {
                    setBurnRateInput(num.toFixed(1));
                  }
                }
              }}
              placeholder="0.0"
            />
            <HelperText>
              When voters cast their vote, this percentage of their voting power will be permanently burned as vTON (0-100%). Default is 0%.
            </HelperText>
            {burnRateInput !== "" && Number(burnRateInput) > 0 && (
              <div className="mt-2 p-3 rounded-lg bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] text-sm">
                Voters will have {Number(burnRateInput).toFixed(1)}% of their voting power burned when they vote on this proposal.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Advanced: Actions */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setShowAdvanced(!showAdvanced)}>
          <div className="flex items-center justify-between">
            <CardTitle>Actions</CardTitle>
            <svg
              className={cn(
                "size-5 text-[var(--text-tertiary)] transition-transform",
                showAdvanced && "rotate-180"
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </CardHeader>

        {showAdvanced && (
          <CardContent className="space-y-4">
            <HelperText>
              Specify the on-chain actions to execute if this proposal passes.
              Leave empty for signaling proposals. On supported networks (Sepolia, Mainnet),
              enter a verified contract address to auto-load its ABI and build calldata.
            </HelperText>

            <ActionBuilderList actions={actions} onChange={setActions} />
          </CardContent>
        )}
      </Card>

      {/* Submit */}
      <div className="flex items-center justify-between gap-4 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          loading={isSubmitting}
        >
          {isSubmitting
            ? submitStep === "approving"
              ? "Approve in Wallet..."
              : submitStep === "waitingApproval"
              ? "Approving TON..."
              : submitStep === "proposing"
              ? "Confirm in Wallet..."
              : submitStep === "waitingProposal"
              ? "Creating Proposal..."
              : "Processing..."
            : hasEnoughAllowance
            ? "Create Proposal"
            : "Approve & Create Proposal"}
        </Button>
      </div>
    </form>
  );
}
