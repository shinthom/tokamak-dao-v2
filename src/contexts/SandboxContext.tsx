"use client";

import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from "react";
import type { ContractAddresses } from "@/types/governance";
import { setSandboxAddresses } from "@/constants/contracts";
import { setSandboxRpcUrl, SANDBOX_CHAIN_ID } from "@/config/wagmi";
import { useWalletConnection } from "@/hooks/useWalletConnection";

interface SandboxSession {
  machineId: string;
  rpcUrl: string;
  addresses: ContractAddresses;
}

type SandboxStatus = "idle" | "creating" | "ready" | "error";

interface SandboxProgress {
  step: string;
  message: string;
  progress?: number;
}

interface SandboxContextValue {
  isActive: boolean;
  session: SandboxSession | null;
  status: SandboxStatus;
  progress: SandboxProgress | null;
  error: string | null;
  startSandbox: () => Promise<void>;
  stopSandbox: () => Promise<void>;
  timeTravel: (seconds: number) => Promise<void>;
  fundWallet: () => Promise<void>;
}

const SandboxContext = createContext<SandboxContextValue | null>(null);

const SESSION_STORAGE_KEY = "sandbox-session";

export function SandboxProvider({ children }: { children: ReactNode }) {
  const { address } = useWalletConnection();
  const [session, setSession] = useState<SandboxSession | null>(null);
  const [status, setStatus] = useState<SandboxStatus>("idle");
  const [progress, setProgress] = useState<SandboxProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Restore session from sessionStorage on mount + verify machine is alive
  useEffect(() => {
    async function restoreSession() {
      try {
        const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (!saved) return;

        const parsed = JSON.parse(saved) as SandboxSession;

        // Verify machine is still alive via Fly API (fast, doesn't go through Anvil RPC)
        const res = await fetch(`/api/sandbox/session/${parsed.machineId}`);
        const data = await res.json();

        if (!data.alive) {
          // Machine is dead — clear stale session
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          return;
        }

        // Machine is alive — restore session
        const fullRpcUrl = `${window.location.origin}${parsed.rpcUrl}`;
        setSandboxRpcUrl(fullRpcUrl);
        setSandboxAddresses(parsed.addresses);
        setSession(parsed);
        setStatus("ready");

        // Switch wallet to sandbox chain (critical: without this, MetaMask stays
        // on the previous chain after page reload, causing write tx to fail with
        // "Requested resource not available" when Wagmi tries switchChain internally)
        try {
          const ethereum = (window as unknown as { ethereum?: { request: (args: { method: string; params: unknown[] }) => Promise<void>; autoRefreshOnNetworkChange?: boolean } }).ethereum;
          if (ethereum) {
            ethereum.autoRefreshOnNetworkChange = false;
            await ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: `0x${SANDBOX_CHAIN_ID.toString(16)}`,
                chainName: "Tokamak Sandbox",
                rpcUrls: [fullRpcUrl],
                nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              }],
            });
          }
        } catch {
          // User might reject - that's ok, reads still work via custom transport
        }
      } catch {
        // Network error during health check — clear session to be safe
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
    restoreSession();
  }, []);

  // Save session to sessionStorage
  useEffect(() => {
    if (session) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [session]);

  // Listen for RPC errors from the transport — auto-detect dead machines
  useEffect(() => {
    if (!session) return;

    let checking = false;
    async function handleRpcError() {
      if (checking || !session) return;
      checking = true;
      try {
        const res = await fetch(`/api/sandbox/session/${session.machineId}`);
        const data = await res.json();
        if (!data.alive) {
          setSandboxRpcUrl(null);
          setSandboxAddresses(null);
          setSession(null);
          setStatus("error");
          setError("Sandbox expired. Please start a new sandbox.");
        }
      } catch {
        // ignore
      } finally {
        checking = false;
      }
    }

    window.addEventListener("sandbox-rpc-error", handleRpcError);
    return () => window.removeEventListener("sandbox-rpc-error", handleRpcError);
  }, [session]);

  const startSandbox = useCallback(async () => {
    if (!address) return;

    setStatus("creating");
    setError(null);
    setProgress(null);

    try {
      const response = await fetch("/api/sandbox/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));

          if (data.step === "error") {
            setError(data.message);
            setStatus("error");
            return;
          }

          setProgress({ step: data.step, message: data.message, progress: data.progress });

          if (data.step === "done") {
            const fullRpcUrl = `${window.location.origin}${data.rpcUrl}`;
            const newSession: SandboxSession = {
              machineId: data.machineId,
              rpcUrl: data.rpcUrl,
              addresses: data.addresses,
            };

            // Set overrides
            setSandboxRpcUrl(fullRpcUrl);
            setSandboxAddresses(data.addresses);

            setSession(newSession);
            setStatus("ready");

            // Switch wallet to sandbox chain
            try {
              const ethereum = (window as unknown as { ethereum?: { request: (args: { method: string; params: unknown[] }) => Promise<void>; autoRefreshOnNetworkChange?: boolean } }).ethereum;
              if (ethereum) {
                // Disable legacy MetaMask auto-reload on chain change
                ethereum.autoRefreshOnNetworkChange = false;
                // Register chain in wallet with correct sandbox RPC URL
                await ethereum.request({
                  method: "wallet_addEthereumChain",
                  params: [{
                    chainId: `0x${SANDBOX_CHAIN_ID.toString(16)}`,
                    chainName: "Tokamak Sandbox",
                    rpcUrls: [fullRpcUrl],
                    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
                  }],
                });
              }
            } catch {
              // User might reject - that's ok
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create sandbox");
      setStatus("error");
    }
  }, [address]);

  const stopSandbox = useCallback(async () => {
    if (!session) return;

    try {
      await fetch(`/api/sandbox/session/${session.machineId}`, { method: "DELETE" });
    } catch {
      // ignore cleanup errors
    }

    // Clear overrides
    setSandboxRpcUrl(null);
    setSandboxAddresses(null);

    setSession(null);
    setStatus("idle");
    setProgress(null);
    setError(null);
  }, [session]);

  const timeTravel = useCallback(async (seconds: number) => {
    if (!session) return;
    await fetch(`/api/sandbox/session/${session.machineId}/time-travel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seconds }),
    });
  }, [session]);

  const fundWallet = useCallback(async () => {
    if (!session || !address) return;
    await fetch(`/api/sandbox/session/${session.machineId}/fund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });
  }, [session, address]);

  return (
    <SandboxContext.Provider
      value={{
        isActive: status === "ready" && session !== null,
        session,
        status,
        progress,
        error,
        startSandbox,
        stopSandbox,
        timeTravel,
        fundWallet,
      }}
    >
      {children}
    </SandboxContext.Provider>
  );
}

export function useSandboxContext(): SandboxContextValue {
  const context = useContext(SandboxContext);
  if (!context) {
    throw new Error("useSandboxContext must be used within SandboxProvider");
  }
  return context;
}
