import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, sepolia, localhost } from '@reown/appkit/networks';
import type { AppKitNetwork } from '@reown/appkit/networks';
import { cookieStorage, createStorage } from 'wagmi';
import { http } from 'viem';

export const projectId = 'ed9db8435ea432ec164cf02c06c0b969';
export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [localhost, mainnet, sepolia];

const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

export const metadata = {
  name: 'Tokamak DAO',
  description: 'Tokamak DAO Governance Platform',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://tokamak.network',
  icons: ['/favicon.ico'],
};

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  networks,
  projectId,
  transports: {
    [localhost.id]: http(),
    [mainnet.id]: alchemyApiKey
      ? http(`https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`)
      : http(),
    [sepolia.id]: alchemyApiKey
      ? http(`https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`)
      : http(),
  },
});

export const config = wagmiAdapter.wagmiConfig;
