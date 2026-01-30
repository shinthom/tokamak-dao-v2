"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, HelperText } from "@/components/ui/input";
import {
  useProposeEmergencyAction,
  ActionType,
} from "@/hooks/contracts/useSecurityCouncil";
import { CancelProposalModal } from "./CancelProposalModal";

const ACTION_TYPE_OPTIONS = [
  { value: ActionType.CancelProposal, label: "Cancel Proposal" },
  { value: ActionType.PauseProtocol, label: "Pause Protocol" },
  { value: ActionType.UnpauseProtocol, label: "Unpause Protocol" },
  { value: ActionType.EmergencyUpgrade, label: "Emergency Upgrade" },
  { value: ActionType.Custom, label: "Custom" },
];

export interface CreateActionFormProps {
  isMember: boolean;
}

/**
 * Form for creating a new emergency action
 */
export function CreateActionForm({ isMember }: CreateActionFormProps) {
  const [actionType, setActionType] = React.useState<ActionType>(
    ActionType.CancelProposal
  );
  const [target, setTarget] = React.useState("");
  const [calldata, setCalldata] = React.useState("0x");
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = React.useState(false);

  const {
    proposeEmergencyAction,
    isPending,
    isConfirming,
    isConfirmed,
    error: txError,
    reset,
  } = useProposeEmergencyAction();

  const isProcessing = isPending || isConfirming;

  // Reset form on success
  React.useEffect(() => {
    if (isConfirmed) {
      setTarget("");
      setCalldata("0x");
      setReason("");
      setActionType(ActionType.CancelProposal);
      setError(null);
      // Reset transaction state after a delay
      const timer = setTimeout(() => reset(), 3000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, reset]);

  const validateForm = (): boolean => {
    if (!target || !target.startsWith("0x") || target.length !== 42) {
      setError("Please enter a valid target address");
      return false;
    }
    if (!calldata.startsWith("0x")) {
      setError("Calldata must start with 0x");
      return false;
    }
    if (!reason.trim()) {
      setError("Please provide a reason for this action");
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    proposeEmergencyAction(
      actionType,
      target as `0x${string}`,
      calldata as `0x${string}`,
      reason
    );
  };

  if (!isMember) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Action</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Action Type */}
          <div className="space-y-2">
            <Label htmlFor="actionType" required>
              Action Type
            </Label>
            <select
              id="actionType"
              value={actionType}
              onChange={(e) => setActionType(Number(e.target.value) as ActionType)}
              className="flex w-full h-10 px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-[var(--input-radius)] transition-colors hover:border-[var(--input-border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--input-border-focus)] focus:ring-offset-1"
              disabled={isProcessing}
            >
              {ACTION_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Cancel Proposal - Show modal trigger button */}
          {actionType === ActionType.CancelProposal ? (
            <div className="space-y-2">
              <Button
                type="button"
                variant="destructive"
                fullWidth
                onClick={() => setIsCancelModalOpen(true)}
              >
                Select Proposal to Cancel
              </Button>
              <HelperText>
                Opens a wizard to select a proposal and enter cancellation reason.
              </HelperText>
            </div>
          ) : (
            <>
              {/* Target Address */}
              <div className="space-y-2">
                <Label htmlFor="target" required>
                  Target Address
                </Label>
                <Input
                  id="target"
                  placeholder="0x..."
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  disabled={isProcessing}
                  error={!!error && error.includes("target")}
                />
              </div>

              {/* Calldata */}
              <div className="space-y-2">
                <Label htmlFor="calldata">Calldata</Label>
                <Input
                  id="calldata"
                  placeholder="0x"
                  value={calldata}
                  onChange={(e) => setCalldata(e.target.value)}
                  disabled={isProcessing}
                  error={!!error && error.includes("Calldata")}
                />
                <HelperText>
                  Optional encoded function call data. Use 0x for no data.
                </HelperText>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason" required>
                  Reason
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Describe why this emergency action is needed..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isProcessing}
                  error={!!error && error.includes("reason")}
                  rows={3}
                />
              </div>

              {/* Error Message */}
              {(error || txError) && (
                <HelperText error>
                  {error || txError?.message || "Transaction failed"}
                </HelperText>
              )}

              {/* Success Message */}
              {isConfirmed && (
                <HelperText className="text-[var(--status-success-fg)]">
                  Emergency action proposed successfully!
                </HelperText>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="destructive"
                fullWidth
                loading={isProcessing}
                disabled={isProcessing}
              >
                {isPending
                  ? "Confirming..."
                  : isConfirming
                  ? "Processing..."
                  : "Propose Emergency Action"}
              </Button>
            </>
          )}
        </form>

        {/* Cancel Proposal Modal */}
        <CancelProposalModal
          open={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
        />
      </CardContent>
    </Card>
  );
}
