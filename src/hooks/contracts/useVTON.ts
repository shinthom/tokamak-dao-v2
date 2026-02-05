"use client";

import { useReadContract, useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { getContractAddresses, areContractsDeployed, VTON_ABI } from "@/constants/contracts";

// Mock data for when contracts are not deployed
const MOCK_DATA = {
  totalSupply: BigInt(0),
  emissionRatio: BigInt(0),
  balance: BigInt(0),
  votingPower: BigInt(0),
};

/**
 * Hook to get vTON total supply
 */
export function useTotalSupply() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.vton,
    abi: VTON_ABI,
    functionName: "totalSupply",
    query: {
      enabled: isDeployed,
    },
  });

  return {
    data: isDeployed ? result.data : MOCK_DATA.totalSupply,
    isLoading: isDeployed ? result.isLoading : false,
    isFetching: isDeployed ? result.isFetching : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    isDeployed,
  };
}

/**
 * Hook to get vTON emission ratio
 */
export function useEmissionRatio() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.vton,
    abi: VTON_ABI,
    functionName: "emissionRatio",
    query: {
      enabled: isDeployed,
    },
  });

  return {
    data: isDeployed ? result.data : MOCK_DATA.emissionRatio,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    isDeployed,
  };
}

/**
 * Hook to get vTON balance for an address
 */
export function useVTONBalance(address?: `0x${string}`) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.vton,
    abi: VTON_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: isDeployed && !!address,
    },
  });

  return {
    data: isDeployed && address ? result.data : MOCK_DATA.balance,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    refetch: result.refetch,
    isDeployed,
  };
}

/**
 * Hook to get voting power for an address
 */
export function useVotingPower(address?: `0x${string}`) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.vton,
    abi: VTON_ABI,
    functionName: "getVotes",
    args: address ? [address] : undefined,
    query: {
      enabled: isDeployed && !!address,
    },
  });

  return {
    data: isDeployed && address ? result.data : MOCK_DATA.votingPower,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    isDeployed,
  };
}

/**
 * Hook to get vTON allowance for a spender
 */
export function useVTONAllowance(owner?: `0x${string}`, spender?: `0x${string}`) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.vton,
    abi: VTON_ABI,
    functionName: "allowance",
    args: owner && spender ? [owner, spender] : undefined,
    query: {
      enabled: isDeployed && !!owner && !!spender,
    },
  });

  return {
    data: isDeployed && owner && spender ? result.data : BigInt(0),
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    refetch: result.refetch,
    isDeployed,
  };
}

/**
 * Hook to approve vTON spending
 */
export function useVTONApprove() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

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

  const approve = (spender: `0x${string}`, amount: bigint) => {
    if (!isDeployed) {
      console.warn("Contracts not deployed, approve action skipped");
      return;
    }
    writeContract({
      address: addresses.vton,
      abi: VTON_ABI,
      functionName: "approve",
      args: [spender, amount],
    });
  };

  const approveAsync = async (spender: `0x${string}`, amount: bigint) => {
    if (!isDeployed) {
      throw new Error("Contracts not deployed");
    }
    return writeContractAsync({
      address: addresses.vton,
      abi: VTON_ABI,
      functionName: "approve",
      args: [spender, amount],
    });
  };

  return {
    approve,
    approveAsync,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
    isDeployed,
  };
}
