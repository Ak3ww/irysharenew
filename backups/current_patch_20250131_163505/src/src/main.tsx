import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
if (!projectId) throw new Error("VITE_WALLETCONNECT_PROJECT_ID is not set in .env");

// Irys Testnet configuration
const irysTestnet = {
  id: 1270,
  name: 'Irys Testnet',
  nativeCurrency: { name: 'Irys', symbol: 'IRYS', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.irys.xyz/v1/execution-rpc'] },
    public: { http: ['https://testnet-rpc.irys.xyz/v1/execution-rpc'] },
  },
  blockExplorers: {
    default: { name: 'Irys Explorer', url: 'https://testnet-explorer.irys.xyz' },
  },
} as const;

const config = getDefaultConfig({
  appName: 'Iryshare',
  projectId,
  chains: [irysTestnet],
  ssr: true,
});
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
    <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
