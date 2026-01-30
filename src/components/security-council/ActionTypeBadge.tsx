"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { ActionType } from "@/hooks/contracts/useSecurityCouncil";

/**
 * Action type configuration for styling
 */
const actionTypeConfig: Record<
  ActionType,
  { label: string; variant: "error" | "warning" | "info" | "default" }
> = {
  [ActionType.CancelProposal]: { label: "CANCEL PROPOSAL", variant: "error" },
  [ActionType.PauseProtocol]: { label: "PAUSE PROTOCOL", variant: "warning" },
  [ActionType.UnpauseProtocol]: { label: "UNPAUSE PROTOCOL", variant: "info" },
  [ActionType.EmergencyUpgrade]: { label: "EMERGENCY UPGRADE", variant: "error" },
  [ActionType.Custom]: { label: "CUSTOM", variant: "default" },
};

export interface ActionTypeBadgeProps {
  actionType: ActionType;
  className?: string;
}

/**
 * Badge component for displaying action types with appropriate styling
 */
export function ActionTypeBadge({ actionType, className }: ActionTypeBadgeProps) {
  const config = actionTypeConfig[actionType] ?? actionTypeConfig[ActionType.Custom];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
