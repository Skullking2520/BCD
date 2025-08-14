import { WagmiProvider, createConfig, http } from 'wagmi'
import { mainnet, polygon, sepolia } from 'wagmi/chains'
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@rainbow-me/rainbowkit/styles.css'
import '../styles/globals.css'
import { useEffect } from 'react'

// Define localhost network
const localhost = {
  id: 1337,
  name: 'Hardhat Localhost',
  network: 'localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['http://localhost:8545'] },
    public: { http: ['http://localhost:8545'] },
  },
}

const config = getDefaultConfig({
  appName: 'Game Items Trading Platform',
  projectId: 'YOUR_PROJECT_ID',
  chains: [localhost, mainnet, polygon, sepolia],
  transports: {
    [localhost.id]: http('http://localhost:8545'),
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [sepolia.id]: http(),
  },
})

const queryClient = new QueryClient()

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // 直接设置为黑夜模式
    document.documentElement.classList.add('dark')
  }, [])

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider locale="en-US">
          <Component {...pageProps} />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}