"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatBasisPoints, formatDuration, formatVTON } from "@/lib/utils";
import { useGovernanceParams } from "@/hooks/contracts/useDAOGovernor";

const BLOCK_TIME_SECONDS = 12;

/**
 * DAO Parameters Section
 * Shows governance and delegation parameters
 */
export function DAOParameters() {
  const {
    quorum,
    votingPeriod,
    votingDelay,
    proposalCreationCost,
    isDeployed,
  } = useGovernanceParams();

  const parameters = [
    {
      label: "Quorum",
      value: formatBasisPoints(quorum ?? BigInt(0)),
      description: "Minimum participation for valid vote",
    },
    {
      label: "Voting Period",
      value: formatDuration(Number(votingPeriod ?? BigInt(0)) * BLOCK_TIME_SECONDS),
      description: "Duration of voting",
    },
    {
      label: "Voting Delay",
      value: formatDuration(Number(votingDelay ?? BigInt(0)) * BLOCK_TIME_SECONDS),
      description: "Delay before voting starts",
    },
    {
      label: "Creation Cost",
      value: `${formatVTON(proposalCreationCost ?? BigInt(0), { compact: true })} TON`,
      description: "Cost to create proposal",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>DAO Parameters</CardTitle>
      </CardHeader>
      <CardContent>
        {!isDeployed && (
          <div className="text-center py-2 mb-4 text-[var(--text-tertiary)]">
            <p className="text-xs">
              Showing default values (contracts not deployed)
            </p>
          </div>
        )}
        <div className="space-y-3">
          {parameters.map((param) => (
            <div
              key={param.label}
              className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {param.label}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {param.description}
                </p>
              </div>
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {param.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
