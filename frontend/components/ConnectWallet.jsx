import { useAccount, useConnect } from 'wagmi'
import { useState } from 'react'

export default function ConnectWallet() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const [isHovered, setIsHovered] = useState(false)

  const handleConnect = () => {
    // Find MetaMask connector
    const metaMaskConnector = connectors.find(connector => 
      connector.name.toLowerCase().includes('metamask')
    )
    
    if (metaMaskConnector) {
      connect({ connector: metaMaskConnector })
    } else {
      // Fallback to first available connector
      connect({ connector: connectors[0] })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="max-w-md w-full">

        {/* Hero Section */}
        <div className="text-center mb-12">
          {/* Animated Logo */}
          <div className="relative mb-8">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
              <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center transition-colors duration-300">
                <svg className="w-12 h-12 text-blue-600 dark:text-blue-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            {/* Floating particles */}
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-bounce"></div>
            <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
            <div className="absolute top-1/2 -right-6 w-2 h-2 bg-pink-400 rounded-full animate-ping"></div>
          </div>

          <h1 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent transition-colors duration-300">
            Game Items Trading Platform
          </h1>
          <p className="text-xl text-gray-300 mb-2 transition-colors duration-300">
            Welcome to the future of gaming
          </p>
          <p className="text-gray-400 transition-colors duration-300">
            Connect your wallet to start trading game items securely on the blockchain
          </p>
        </div>

        {/* Connect Wallet Card */}
        <div className="bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-700 transition-colors duration-300">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-white mb-2 transition-colors duration-300">
              Get Started
            </h2>
            <p className="text-gray-300 transition-colors duration-300">
              Connect your MetaMask wallet to access the marketplace
            </p>
          </div>

          {/* Connect Button */}
          <button
            onClick={handleConnect}
            disabled={isPending}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`
              w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 transform
              ${isPending 
                ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                : isHovered 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg scale-105' 
                  : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:shadow-lg'
              }
              text-white relative overflow-hidden
            `}
          >
            {isPending ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Connecting...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <span className="mr-2">🔗</span>
                Connect Wallet
              </div>
            )}
            
            {/* Shimmer effect */}
            <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 transform -skew-x-12 transition-transform duration-1000 ${
              isHovered ? 'translate-x-full' : '-translate-x-full'
            }`}></div>
          </button>

          {/* Features */}
          <div className="mt-8 grid grid-cols-1 gap-4">
            <div className="flex items-center p-3 bg-blue-900/20 rounded-lg transition-colors duration-300">
              <div className="w-8 h-8 bg-blue-800 rounded-full flex items-center justify-center mr-3 transition-colors duration-300">
                <span className="text-blue-400 text-sm transition-colors duration-300">🔒</span>
              </div>
              <div>
                <h3 className="font-semibold text-white transition-colors duration-300">Secure Trading</h3>
                <p className="text-sm text-gray-300 transition-colors duration-300">Blockchain-powered security</p>
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-purple-900/20 rounded-lg transition-colors duration-300">
              <div className="w-8 h-8 bg-purple-800 rounded-full flex items-center justify-center mr-3 transition-colors duration-300">
                <span className="text-purple-400 text-sm transition-colors duration-300">⚡</span>
              </div>
              <div>
                <h3 className="font-semibold text-white transition-colors duration-300">Instant Transactions</h3>
                <p className="text-sm text-gray-300 transition-colors duration-300">Real-time blockchain updates</p>
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-green-900/20 rounded-lg transition-colors duration-300">
              <div className="w-8 h-8 bg-green-800 rounded-full flex items-center justify-center mr-3 transition-colors duration-300">
                <span className="text-green-400 text-sm transition-colors duration-300">🎮</span>
              </div>
              <div>
                <h3 className="font-semibold text-white transition-colors duration-300">Game Items</h3>
                <p className="text-sm text-gray-300 transition-colors duration-300">Trade legendary items</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-400 transition-colors duration-300">
            Powered by Ethereum • Built with Next.js • Secure by Design
          </p>
        </div>
      </div>
    </div>
  )
} 