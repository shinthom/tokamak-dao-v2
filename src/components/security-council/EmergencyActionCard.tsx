"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddressAvatar } from "@/components/ui/avatar";
import { ActionTypeBadge } from "./ActionTypeBadge";
import { ActionType } from "@/hooks/contracts/useSecurityCouncil";
import { formatAddress } from "@/lib/utils";

export interface EmergencyActionCardProps {
  actionId: bigint;
  actionType: ActionType;
  proposer: `0x${string}`;
  target: `0x${string}`;
  reason: string;
  approvalCount: number;
  threshold: number;
  hasApproved: boolean;
  isExecutable: boolean;
  isMember: boolean;
  onApprove?: () => void;
  onExecute?: () => void;
  isApproving?: boolean;
  isExecuting?: boolean;
}

/**
 * Displays a pending emergency action with approval status and action buttons
 */
export function EmergencyActionCard({
  actionId,
  actionType,
  proposer,
  target,
  reason,
  approvalCount,
  threshold,
  hasApproved,
  isExecutable,
  isMember,
  onApprove,
  onExecute,
  isApproving,
  isExecuting,
}: EmergencyActionCardProps) {
  return (
    <Card className="border-l-4 border-l-[var(--color-warning-500)]">
      <CardContent className="pt-4">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <ActionTypeBadge actionType={actionType} />
              <span className="text-sm text-[var(--text-tertiary)]">
                #{actionId.toString()}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-tertiary)]">Target:</span>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {formatAddress(target)}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-sm text-[var(--text-tertiary)]">Reason:</span>
              <span className="text-sm text-[var(--text-primary)]">{reason}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-tertiary)]">Proposer:</span>
              <div className="flex items-center gap-1.5">
                <AddressAvatar address={proposer} size="xs" />
                <span className="text-sm text-[var(--text-primary)]">
                  {formatAddress(proposer)}
                </span>
              </div>
            </div>
          </div>

          {/* Approval Progress */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-tertiary)]">Approvals:</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: threshold }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i < approvalCount
                      ? "bg-[var(--color-success-500)]"
                      : "bg-[var(--bg-tertiary)] border border-[var(--border-secondary)]"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-[var(--text-secondary)]">
              ({approvalCount}/{threshold})
            </span>
          </div>

          {/* Actions */}
          {isMember && (
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={onApprove}
                disabled={hasApproved || isApproving}
                loading={isApproving}
              >
                {hasApproved ? "Approved" : "Approve"}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={onExecute}
                disabled={!isExecutable || isExecuting}
                loading={isExecuting}
              >
                Execute
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
