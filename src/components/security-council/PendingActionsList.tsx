"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmergencyActionCard } from "./EmergencyActionCard";
import {
  useAction,
  useHasApproved,
  useApproveEmergencyAction,
  useExecuteEmergencyAction,
  ActionType,
} from "@/hooks/contracts/useSecurityCouncil";

interface PendingActionItemProps {
  actionId: bigint;
  threshold: number;
  currentAddress?: `0x${string}`;
  isMember: boolean;
}

/**
 * Individual pending action item that fetches its own data
 */
function PendingActionItem({
  actionId,
  threshold,
  currentAddress,
  isMember,
}: PendingActionItemProps) {
  const { data: action, isLoading } = useAction(actionId);
  const { data: hasApproved } = useHasApproved(actionId, currentAddress);

  const {
    approveEmergencyAction,
    isPending: isApproving,
    isConfirming: isApproveConfirming,
  } = useApproveEmergencyAction();

  const {
    executeEmergencyAction,
    isPending: isExecuting,
    isConfirming: isExecuteConfirming,
  } = useExecuteEmergencyAction();

  if (isLoading || !action) {
    return (
      <div className="h-40 bg-[var(--bg-tertiary)] rounded animate-pulse" />
    );
  }

  const [actionType, proposer, target, , reason, approvalCount, executed] = action;

  // Skip executed actions
  if (executed) {
    return null;
  }

  const isExecutable = Number(approvalCount) >= threshold;

  return (
    <EmergencyActionCard
      actionId={actionId}
      actionType={actionType as ActionType}
      proposer={proposer}
      target={target}
      reason={reason}
      approvalCount={Number(approvalCount)}
      threshold={threshold}
      hasApproved={hasApproved}
      isExecutable={isExecutable}
      isMember={isMember}
      onApprove={() => approveEmergencyAction(actionId)}
      onExecute={() => executeEmergencyAction(actionId)}
      isApproving={isApproving || isApproveConfirming}
      isExecuting={isExecuting || isExecuteConfirming}
    />
  );
}

export interface PendingActionsListProps {
  actionIds: readonly bigint[];
  threshold: number;
  currentAddress?: `0x${string}`;
  isMember: boolean;
  isLoading?: boolean;
}

/**
 * Displays the list of pending emergency actions
 */
export function PendingActionsList({
  actionIds,
  threshold,
  currentAddress,
  isMember,
  isLoading,
}: PendingActionsListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-40 bg-[var(--bg-tertiary)] rounded animate-pulse"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Actions</CardTitle>
      </CardHeader>
      <CardContent>
        {actionIds.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">
            No pending actions
          </p>
        ) : (
          <div className="space-y-4">
            {actionIds.map((actionId) => (
              <PendingActionItem
                key={actionId.toString()}
                actionId={actionId}
                threshold={threshold}
                currentAddress={currentAddress}
                isMember={isMember}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
