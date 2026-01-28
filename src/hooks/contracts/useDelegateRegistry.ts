"use client";

import * as React from "react";
import { useReadContract, useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  getContractAddresses,
  areContractsDeployed,
  DELEGATE_REGISTRY_ABI,
} from "@/constants/contracts";

// Mock data for when contracts are not deployed
const MOCK_DATA = {
  delegates: [] as `0x${string}`[],
  totalDelegated: BigInt(0),
  delegationPeriodRequirement: BigInt(604800), // 7 days in seconds
  delegateInfo: {
    profile: "",
    votingPhilosophy: "",
    interests: "",
    registeredAt: BigInt(0),
    isActive: false,
  },
};

/**
 * Hook to get all delegates (registered to receive delegations)
 */
export function useAllDelegates() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.delegateRegistry,
    abi: DELEGATE_REGISTRY_ABI,
    functionName: "getAllDelegates",
    query: {
      enabled: isDeployed,
    },
  });

  return {
    data: isDeployed ? result.data : MOCK_DATA.delegates,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    refetch: result.refetch,
    isDeployed,
  };
}

/**
 * Hook to get total delegated amount to a delegate
 */
export function useTotalDelegated(address?: `0x${string}`) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.delegateRegistry,
    abi: DELEGATE_REGISTRY_ABI,
    functionName: "getTotalDelegated",
    args: address ? [address] : undefined,
    query: {
      enabled: isDeployed && !!address,
    },
  });

  return {
    data: isDeployed && address ? result.data : MOCK_DATA.totalDelegated,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    refetch: result.refetch,
    isDeployed,
  };
}

/**
 * Hook to get delegation info for a delegator (owner) to a specific delegate
 */
export function useDelegation(ownerAddress?: `0x${string}`, delegateAddress?: `0x${string}`) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.delegateRegistry,
    abi: DELEGATE_REGISTRY_ABI,
    functionName: "getDelegation",
    args: ownerAddress && delegateAddress ? [ownerAddress, delegateAddress] : undefined,
    query: {
      enabled: isDeployed && !!ownerAddress && !!delegateAddress,
    },
  });

  return {
    data: isDeployed && ownerAddress && delegateAddress
      ? result.data
      : { delegate: undefined, amount: BigInt(0), delegatedAt: BigInt(0), expiresAt: BigInt(0) },
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    refetch: result.refetch,
    isDeployed,
  };
}

/**
 * Hook to get delegation parameters
 */
export function useDelegationParams() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const periodResult = useReadContract({
    address: addresses.delegateRegistry,
    abi: DELEGATE_REGISTRY_ABI,
    functionName: "delegationPeriodRequirement",
    query: {
      enabled: isDeployed,
    },
  });

  return {
    delegationPeriodRequirement: isDeployed
      ? periodResult.data
      : MOCK_DATA.delegationPeriodRequirement,
    isLoading: isDeployed ? periodResult.isLoading : false,
    isError: isDeployed ? periodResult.isError : false,
    isDeployed,
  };
}

/**
 * Hook to delegate vTON to a delegate
 */
export function useDelegate() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const {
    data: hash,
    isPending,
    writeContract,
    error,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const delegate = (delegateAddr: `0x${string}`, amount: bigint) => {
    if (!isDeployed) {
      console.warn("Contracts not deployed, delegate action skipped");
      return;
    }
    writeContract({
      address: addresses.delegateRegistry,
      abi: DELEGATE_REGISTRY_ABI,
      functionName: "delegate",
      args: [delegateAddr, amount],
    });
  };

  return {
    delegate,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
    isDeployed,
  };
}

/**
 * Hook to undelegate vTON from a delegate
 */
export function useUndelegate() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const {
    data: hash,
    isPending,
    writeContract,
    error,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const undelegate = (delegateAddr: `0x${string}`, amount: bigint) => {
    if (!isDeployed) {
      console.warn("Contracts not deployed, undelegate action skipped");
      return;
    }
    writeContract({
      address: addresses.delegateRegistry,
      abi: DELEGATE_REGISTRY_ABI,
      functionName: "undelegate",
      args: [delegateAddr, amount],
    });
  };

  return {
    undelegate,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
    isDeployed,
  };
}

/**
 * Hook to get delegate info for a registered delegate
 */
export function useDelegateInfo(address?: `0x${string}`) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.delegateRegistry,
    abi: DELEGATE_REGISTRY_ABI,
    functionName: "getDelegateInfo",
    args: address ? [address] : undefined,
    query: {
      enabled: isDeployed && !!address,
    },
  });

  // Parse the result struct
  const data = React.useMemo(() => {
    if (!isDeployed || !address || !result.data) {
      return MOCK_DATA.delegateInfo;
    }
    const info = result.data as {
      profile: string;
      votingPhilosophy: string;
      interests: string;
      registeredAt: bigint;
      isActive: boolean;
    };
    return info;
  }, [isDeployed, address, result.data]);

  return {
    data,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    refetch: result.refetch,
    isDeployed,
  };
}

/**
 * Hook to register as a delegate
 */
export function useRegisterDelegate() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const {
    data: hash,
    isPending,
    writeContract,
    error,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const registerDelegate = (
    profile: string,
    philosophy: string,
    interests: string[]
  ) => {
    if (!isDeployed) {
      console.warn("Contracts not deployed, registerDelegate action skipped");
      return;
    }
    writeContract({
      address: addresses.delegateRegistry,
      abi: DELEGATE_REGISTRY_ABI,
      functionName: "registerDelegate",
      args: [profile, philosophy, interests.join(", ")],
    });
  };

  return {
    registerDelegate,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
    isDeployed,
  };
}

/**
 * Hook to check if an address is a registered delegate
 */
export function useIsRegisteredDelegate(address?: `0x${string}`) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.delegateRegistry,
    abi: DELEGATE_REGISTRY_ABI,
    functionName: "isRegisteredDelegate",
    args: address ? [address] : undefined,
    query: {
      enabled: isDeployed && !!address,
    },
  });

  return {
    data: isDeployed && address ? result.data : false,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    refetch: result.refetch,
    isDeployed,
  };
}

/**
 * Hook to get voting power for a delegate at a specific block
 */
export function useDelegateVotingPower(
  delegateAddr?: `0x${string}`,
  blockNumber?: bigint,
  snapshotBlock?: bigint
) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.delegateRegistry,
    abi: DELEGATE_REGISTRY_ABI,
    functionName: "getVotingPower",
    args:
      delegateAddr && blockNumber && snapshotBlock
        ? [delegateAddr, blockNumber, snapshotBlock]
        : undefined,
    query: {
      enabled: isDeployed && !!delegateAddr && !!blockNumber && !!snapshotBlock,
    },
  });

  return {
    data: result.data ?? BigInt(0),
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    isDeployed,
  };
}

/**
 * Hook to redelegate vTON from one delegate to another
 */
export function useRedelegate() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const {
    data: hash,
    isPending,
    writeContract,
    error,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const redelegate = (
    fromDelegate: `0x${string}`,
    toDelegate: `0x${string}`,
    amount: bigint
  ) => {
    if (!isDeployed) {
      console.warn("Contracts not deployed, redelegate action skipped");
      return;
    }
    writeContract({
      address: addresses.delegateRegistry,
      abi: DELEGATE_REGISTRY_ABI,
      functionName: "redelegate",
      args: [fromDelegate, toDelegate, amount],
    });
  };

  return {
    redelegate,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
    isDeployed,
  };
}
