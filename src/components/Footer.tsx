"use client";

import { useChainId } from "wagmi";
import { Badge } from "@/components/ui/badge";
import { formatAddress } from "@/lib/utils";
import { getContractAddresses, areContractsDeployed } from "@/constants/contracts";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Footer Component
 * Displays contract addresses
 */
export function Footer() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const contracts = [
    { name: "vTON", address: addresses.vton },
    { name: "Registry", address: addresses.delegateRegistry },
    { name: "Governor", address: addresses.daoGovernor },
    { name: "Council", address: addresses.securityCouncil },
    { name: "Timelock", address: addresses.timelock },
  ];

  const networkName = chainId === 13371
    ? "Sandbox"
    : chainId === 1
      ? "Mainnet"
      : chainId === 11155111
        ? "Sepolia"
        : chainId === 1337
          ? "Localhost"
          : `Chain ${chainId}`;

  const handleCopy = async (address: string) => {
    if (address === ZERO_ADDRESS) return;
    try {
      await navigator.clipboard.writeText(address);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <footer className="border-t border-[var(--border-secondary)] bg-[var(--surface-primary)] mt-auto">
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[var(--text-tertiary)]">
          <Badge
            variant={isDeployed ? "success" : "warning"}
            size="sm"
          >
            {networkName}
          </Badge>
          {contracts.map((contract) => {
            const isZero = contract.address === ZERO_ADDRESS;
            return (
              <span key={contract.name} className="flex items-center gap-1">
                <span>{contract.name}:</span>
                {isZero ? (
                  <span className="font-mono">-</span>
                ) : (
                  <button
                    onClick={() => handleCopy(contract.address)}
                    className="font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    title={`Click to copy: ${contract.address}`}
                  >
                    {formatAddress(contract.address, 4)}
                  </button>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
