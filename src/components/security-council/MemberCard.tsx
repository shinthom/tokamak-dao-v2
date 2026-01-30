"use client";

import * as React from "react";
import { AddressAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatAddress } from "@/lib/utils";

export interface MemberCardProps {
  address: `0x${string}`;
  isFoundation?: boolean;
  className?: string;
}

/**
 * Displays a Security Council member with avatar and role indicator
 */
export function MemberCard({ address, isFoundation = false, className }: MemberCardProps) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <AddressAvatar address={address} size="sm" />
      <span className="text-sm font-medium text-[var(--text-primary)]">
        {formatAddress(address)}
      </span>
      <Badge variant={isFoundation ? "primary" : "outline"} size="sm">
        {isFoundation ? "Foundation" : "External"}
      </Badge>
    </div>
  );
}
