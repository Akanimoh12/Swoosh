import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrumSepolia, baseSepolia } from 'wagmi/chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'Swoosh',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [arbitrumSepolia, baseSepolia],
  ssr: false,
});
