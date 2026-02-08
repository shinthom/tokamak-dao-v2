"use client";

import { useChainId } from "wagmi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatAddress } from "@/lib/utils";
import { getContractAddresses, areContractsDeployed } from "@/constants/contracts";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Contract Addresses Section
 * Shows all DAO contract addresses with deployment status
 */
export function ContractAddresses() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const contracts = [
    { name: "vTON Token", address: addresses.vton },
    { name: "Delegate Registry", address: addresses.delegateRegistry },
    { name: "DAO Governor", address: addresses.daoGovernor },
    { name: "Security Council", address: addresses.securityCouncil },
    { name: "Timelock", address: addresses.timelock },
  ];

  const networkName =
    chainId === 1
      ? "Mainnet"
      : chainId === 11155111
        ? "Sepolia"
        : chainId === 1337
          ? "Localhost"
          : chainId === 13371
            ? "Sandbox"
            : `Chain ${chainId}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Contract Addresses
          <Badge
            variant={isDeployed ? "success" : "warning"}
            size="sm"
          >
            {isDeployed ? "Deployed" : "Not Deployed"}
          </Badge>
          <Badge variant="outline" size="sm">
            {networkName}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {contracts.map((contract) => {
            const isZero = contract.address === ZERO_ADDRESS;
            return (
              <div
                key={contract.name}
                className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-0"
              >
                <span className="text-sm text-[var(--text-secondary)]">
                  {contract.name}
                </span>
                <code
                  className={`text-xs font-mono ${
                    isZero
                      ? "text-[var(--text-tertiary)]"
                      : "text-[var(--text-primary)]"
                  }`}
                  title={contract.address}
                >
                  {isZero ? "Not deployed" : formatAddress(contract.address, 6)}
                </code>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
