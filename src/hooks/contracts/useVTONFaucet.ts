"use client";

import {
  useReadContracts,
  useChainId,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { getContractAddresses, VTON_FAUCET_ABI } from "@/constants/contracts";

// Check if faucet is deployed (not zero address)
function isFaucetDeployed(faucetAddress?: `0x${string}`): boolean {
  return (
    !!faucetAddress &&
    faucetAddress !== "0x0000000000000000000000000000000000000000"
  );
}

/**
 * Hook to get faucet configuration
 */
export function useFaucetConfig() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = isFaucetDeployed(addresses.faucet);

  const result = useReadContracts({
    contracts: [
      {
        address: addresses.faucet,
        abi: VTON_FAUCET_ABI,
        functionName: "claimAmount",
      },
      {
        address: addresses.faucet,
        abi: VTON_FAUCET_ABI,
        functionName: "paused",
      },
    ],
    query: {
      enabled: isDeployed,
    },
  });

  const [claimAmount, paused] = result.data ?? [];

  return {
    claimAmount: (claimAmount?.result as bigint | undefined) ?? BigInt(0),
    paused: (paused?.result as boolean | undefined) ?? false,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    refetch: result.refetch,
    isDeployed,
  };
}

/**
 * Hook to claim from faucet
 */
export function useClaimFromFaucet() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = isFaucetDeployed(addresses.faucet);

  const {
    data: hash,
    isPending,
    writeContract,
    writeContractAsync,
    error,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const claim = () => {
    if (!isDeployed) {
      console.warn("Faucet not deployed, claim action skipped");
      return;
    }
    writeContract({
      address: addresses.faucet!,
      abi: VTON_FAUCET_ABI,
      functionName: "claim",
    });
  };

  const claimAsync = async () => {
    if (!isDeployed) {
      throw new Error("Faucet not deployed");
    }
    return writeContractAsync({
      address: addresses.faucet!,
      abi: VTON_FAUCET_ABI,
      functionName: "claim",
    });
  };

  return {
    claim,
    claimAsync,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
    isDeployed,
  };
}
