"use client";

import { useReadContract, useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  getContractAddresses,
  areContractsDeployed,
  SECURITY_COUNCIL_ABI,
} from "@/constants/contracts";

/**
 * Security Council Action Types (matches contract enum)
 */
export enum ActionType {
  CancelProposal = 0,
  PauseProtocol = 1,
  UnpauseProtocol = 2,
  EmergencyUpgrade = 3,
  Custom = 4,
}

/**
 * Member struct from SecurityCouncil contract
 */
export interface SecurityCouncilMember {
  account: `0x${string}`;
  isFoundation: boolean;
  addedAt: bigint;
}

// Mock data for when contracts are not deployed
const MOCK_DATA = {
  members: [] as SecurityCouncilMember[],
  threshold: BigInt(0),
  pendingActionsCount: BigInt(0),
};

/**
 * Hook to get Security Council members
 */
export function useCouncilMembers() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.securityCouncil,
    abi: SECURITY_COUNCIL_ABI,
    functionName: "getMembers",
    query: {
      enabled: isDeployed,
    },
  });

  return {
    data: isDeployed ? result.data : MOCK_DATA.members,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    isDeployed,
  };
}

/**
 * Hook to get Security Council threshold
 */
export function useCouncilThreshold() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.securityCouncil,
    abi: SECURITY_COUNCIL_ABI,
    functionName: "threshold",
    query: {
      enabled: isDeployed,
    },
  });

  return {
    data: isDeployed ? result.data : MOCK_DATA.threshold,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    isDeployed,
  };
}

/**
 * Hook to get pending actions count
 */
export function usePendingActionsCount() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.securityCouncil,
    abi: SECURITY_COUNCIL_ABI,
    functionName: "getPendingActionsCount",
    query: {
      enabled: isDeployed,
    },
  });

  return {
    data: isDeployed ? result.data : MOCK_DATA.pendingActionsCount,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    isDeployed,
  };
}

/**
 * Combined hook for all Security Council data
 */
export function useSecurityCouncil() {
  const membersResult = useCouncilMembers();
  const thresholdResult = useCouncilThreshold();
  const pendingResult = usePendingActionsCount();

  return {
    members: membersResult.data ?? [],
    threshold: thresholdResult.data ?? BigInt(0),
    pendingActionsCount: pendingResult.data ?? BigInt(0),
    isLoading:
      membersResult.isLoading ||
      thresholdResult.isLoading ||
      pendingResult.isLoading,
    isError:
      membersResult.isError ||
      thresholdResult.isError ||
      pendingResult.isError,
    isDeployed: membersResult.isDeployed,
  };
}

/**
 * Hook to check if an address is a Security Council member
 */
export function useIsMember(address?: `0x${string}`) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.securityCouncil,
    abi: SECURITY_COUNCIL_ABI,
    functionName: "isMember",
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
    isDeployed,
  };
}

/**
 * Hook to get pending action IDs
 */
export function usePendingActions() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.securityCouncil,
    abi: SECURITY_COUNCIL_ABI,
    functionName: "getPendingActions",
    query: {
      enabled: isDeployed,
    },
  });

  return {
    data: isDeployed ? result.data : [],
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    isDeployed,
  };
}

/**
 * Hook to get action details
 */
export function useAction(actionId?: bigint) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.securityCouncil,
    abi: SECURITY_COUNCIL_ABI,
    functionName: "getAction",
    args: actionId !== undefined ? [actionId] : undefined,
    query: {
      enabled: isDeployed && actionId !== undefined,
    },
  });

  return {
    data: result.data,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    isDeployed,
  };
}

/**
 * Hook to check if a member has approved an action
 */
export function useHasApproved(actionId?: bigint, member?: `0x${string}`) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.securityCouncil,
    abi: SECURITY_COUNCIL_ABI,
    functionName: "hasApproved",
    args: actionId !== undefined && member ? [actionId, member] : undefined,
    query: {
      enabled: isDeployed && actionId !== undefined && !!member,
    },
  });

  return {
    data: result.data ?? false,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    isDeployed,
  };
}

/**
 * Hook to propose an emergency action
 */
export function useProposeEmergencyAction() {
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

  const proposeEmergencyAction = (
    actionType: ActionType,
    target: `0x${string}`,
    data: `0x${string}`,
    reason: string
  ) => {
    if (!isDeployed) {
      console.warn("Contracts not deployed, proposeEmergencyAction action skipped");
      return;
    }
    writeContract({
      address: addresses.securityCouncil,
      abi: SECURITY_COUNCIL_ABI,
      functionName: "proposeEmergencyAction",
      args: [actionType, target, data, reason],
    });
  };

  const proposeEmergencyActionAsync = async (
    actionType: ActionType,
    target: `0x${string}`,
    data: `0x${string}`,
    reason: string
  ) => {
    if (!isDeployed) {
      throw new Error("Contracts not deployed");
    }
    return writeContractAsync({
      address: addresses.securityCouncil,
      abi: SECURITY_COUNCIL_ABI,
      functionName: "proposeEmergencyAction",
      args: [actionType, target, data, reason],
    });
  };

  return {
    proposeEmergencyAction,
    proposeEmergencyActionAsync,
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
 * Hook to approve an emergency action
 */
export function useApproveEmergencyAction() {
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

  const approveEmergencyAction = (actionId: bigint) => {
    if (!isDeployed) {
      console.warn("Contracts not deployed, approveEmergencyAction action skipped");
      return;
    }
    writeContract({
      address: addresses.securityCouncil,
      abi: SECURITY_COUNCIL_ABI,
      functionName: "approveEmergencyAction",
      args: [actionId],
    });
  };

  const approveEmergencyActionAsync = async (actionId: bigint) => {
    if (!isDeployed) {
      throw new Error("Contracts not deployed");
    }
    return writeContractAsync({
      address: addresses.securityCouncil,
      abi: SECURITY_COUNCIL_ABI,
      functionName: "approveEmergencyAction",
      args: [actionId],
    });
  };

  return {
    approveEmergencyAction,
    approveEmergencyActionAsync,
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
 * Hook to execute an emergency action
 */
export function useExecuteEmergencyAction() {
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

  const executeEmergencyAction = (actionId: bigint) => {
    if (!isDeployed) {
      console.warn("Contracts not deployed, executeEmergencyAction action skipped");
      return;
    }
    writeContract({
      address: addresses.securityCouncil,
      abi: SECURITY_COUNCIL_ABI,
      functionName: "executeEmergencyAction",
      args: [actionId],
    });
  };

  const executeEmergencyActionAsync = async (actionId: bigint) => {
    if (!isDeployed) {
      throw new Error("Contracts not deployed");
    }
    return writeContractAsync({
      address: addresses.securityCouncil,
      abi: SECURITY_COUNCIL_ABI,
      functionName: "executeEmergencyAction",
      args: [actionId],
    });
  };

  return {
    executeEmergencyAction,
    executeEmergencyActionAsync,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
    isDeployed,
  };
}
