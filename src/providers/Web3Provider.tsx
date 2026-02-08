'use client';

import * as React from 'react';
import { createAppKit } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import { reconnect } from '@wagmi/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiAdapter, projectId, networks, metadata, config } from '@/config/wagmi';
import { WalletConnectionProvider } from '@/hooks/useWalletConnection';

// Initialize AppKit at module level (must be outside component)
createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  metadata,
  features: {
    analytics: true,
    email: false,
    socials: [],
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#3376f7',
    '--w3m-border-radius-master': '8px',
  },
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  // SSR-safe QueryClient 생성 - 모듈 레벨이 아닌 컴포넌트 내부에서 생성
  const [queryClient] = React.useState(() => new QueryClient());

  // 앱 시작 시 이전 세션 연결 복원
  React.useEffect(() => {
    // Disable MetaMask legacy auto-reload on chain change
    const ethereum = (window as unknown as { ethereum?: { autoRefreshOnNetworkChange?: boolean } }).ethereum;
    if (ethereum) {
      ethereum.autoRefreshOnNetworkChange = false;
    }
    reconnect(config);
  }, []);

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletConnectionProvider>
          {children}
        </WalletConnectionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
