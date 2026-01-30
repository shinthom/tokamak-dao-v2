"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MemberCard } from "./MemberCard";

/**
 * Member struct from SecurityCouncil contract
 */
export interface SecurityCouncilMember {
  account: `0x${string}`;
  isFoundation: boolean;
  addedAt: bigint;
}

export interface CouncilMembersListProps {
  members: readonly SecurityCouncilMember[];
  isLoading?: boolean;
}

/**
 * Displays the list of Security Council members
 */
export function CouncilMembersList({
  members,
  isLoading,
}: CouncilMembersListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 bg-[var(--bg-tertiary)] rounded animate-pulse"
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
        <CardTitle>Members</CardTitle>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No members found</p>
        ) : (
          <div className="space-y-4">
            {members.map((member, index) => (
              <MemberCard
                key={`${member.account}-${index}`}
                address={member.account}
                isFoundation={member.isFoundation}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
