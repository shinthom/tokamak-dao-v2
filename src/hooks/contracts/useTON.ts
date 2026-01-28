"use client";

import {
  useReadContract,
  useChainId,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { getContractAddresses, MOCK_TON_ABI, TON_FAUCET_ABI } from "@/constants/contracts";
import { maxUint256 } from "viem";

// Check if TON is deployed (not zero address)
function isTONDeployed(tonAddress?: `0x${string}`): boolean {
  return (
    !!tonAddress &&
    tonAddress !== "0x0000000000000000000000000000000000000000"
  );
}

// Check if TON Faucet is deployed (not zero address)
function isTONFaucetDeployed(faucetAddress?: `0x${string}`): boolean {
  return (
    !!faucetAddress &&
    faucetAddress !== "0x0000000000000000000000000000000000000000"
  );
}

/**
 * Hook to get TON allowance for a spender
 */
export function useTONAllowance(owner?: `0x${string}`, spender?: `0x${string}`) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = isTONDeployed(addresses.ton);

  const result = useReadContract({
    address: addresses.ton,
    abi: MOCK_TON_ABI,
    functionName: "allowance",
    args: owner && spender ? [owner, spender] : undefined,
    query: {
      enabled: isDeployed && !!owner && !!spender,
    },
  });

  return {
    data: (result.data as bigint | undefined) ?? BigInt(0),
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    refetch: result.refetch,
    isDeployed,
  };
}

/**
 * Hook to approve TON spending
 */
export function useApproveTON() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = isTONDeployed(addresses.ton);

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

  const approve = (spender: `0x${string}`, amount: bigint = maxUint256) => {
    if (!isDeployed) {
      console.warn("TON not deployed, approve action skipped");
      return;
    }
    writeContract({
      address: addresses.ton!,
      abi: MOCK_TON_ABI,
      functionName: "approve",
      args: [spender, amount],
    });
  };

  const approveAsync = async (spender: `0x${string}`, amount: bigint = maxUint256) => {
    if (!isDeployed) {
      throw new Error("TON not deployed");
    }
    return writeContractAsync({
      address: addresses.ton!,
      abi: MOCK_TON_ABI,
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

/**
 * Hook to get TON balance
 */
export function useTONBalance(address?: `0x${string}`) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = isTONDeployed(addresses.ton);

  const result = useReadContract({
    address: addresses.ton,
    abi: MOCK_TON_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: isDeployed && !!address,
    },
  });

  return {
    data: (result.data as bigint | undefined) ?? BigInt(0),
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    refetch: result.refetch,
    isDeployed,
  };
}

/**
 * Hook to get TON faucet configuration
 */
export function useTONFaucetConfig() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = isTONFaucetDeployed(addresses.tonFaucet);

  const claimAmountResult = useReadContract({
    address: addresses.tonFaucet,
    abi: TON_FAUCET_ABI,
    functionName: "claimAmount",
    query: {
      enabled: isDeployed,
    },
  });

  const pausedResult = useReadContract({
    address: addresses.tonFaucet,
    abi: TON_FAUCET_ABI,
    functionName: "paused",
    query: {
      enabled: isDeployed,
    },
  });

  const canClaimResult = useReadContract({
    address: addresses.tonFaucet,
    abi: TON_FAUCET_ABI,
    functionName: "canClaim",
    query: {
      enabled: isDeployed,
    },
  });

  return {
    claimAmount: (claimAmountResult.data as bigint | undefined) ?? BigInt(0),
    paused: (pausedResult.data as boolean | undefined) ?? false,
    canClaim: (canClaimResult.data as boolean | undefined) ?? true,
    isLoading: claimAmountResult.isLoading || pausedResult.isLoading,
    isError: claimAmountResult.isError || pausedResult.isError,
    refetch: () => {
      claimAmountResult.refetch();
      pausedResult.refetch();
      canClaimResult.refetch();
    },
    isDeployed,
  };
}

/**
 * Hook to claim TON from TONFaucet (testnet faucet)
 */
export function useClaimTON() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = isTONFaucetDeployed(addresses.tonFaucet);
  const { claimAmount } = useTONFaucetConfig();

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
      console.warn("TONFaucet not deployed, claim action skipped");
      return;
    }
    writeContract({
      address: addresses.tonFaucet!,
      abi: TON_FAUCET_ABI,
      functionName: "claim",
      args: [],
    });
  };

  const claimAsync = async () => {
    if (!isDeployed) {
      throw new Error("TONFaucet not deployed");
    }
    return writeContractAsync({
      address: addresses.tonFaucet!,
      abi: TON_FAUCET_ABI,
      functionName: "claim",
      args: [],
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
    claimAmount,
  };
}

/**
 * Hook to mint TON from MockTON (testnet faucet - legacy, use useClaimTON instead)
 * @deprecated Use useClaimTON instead for consistent faucet pattern
 */
export function useMintTON() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = isTONDeployed(addresses.ton);
  const { claimAmount } = useTONFaucetConfig();

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

  const mint = (to: `0x${string}`, amount: bigint = claimAmount) => {
    if (!isDeployed) {
      console.warn("TON not deployed, mint action skipped");
      return;
    }
    writeContract({
      address: addresses.ton!,
      abi: MOCK_TON_ABI,
      functionName: "mint",
      args: [to, amount],
    });
  };

  const mintAsync = async (to: `0x${string}`, amount: bigint = claimAmount) => {
    if (!isDeployed) {
      throw new Error("TON not deployed");
    }
    return writeContractAsync({
      address: addresses.ton!,
      abi: MOCK_TON_ABI,
      functionName: "mint",
      args: [to, amount],
    });
  };

  return {
    mint,
    mintAsync,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
    isDeployed,
    claimAmount,
  };
}
