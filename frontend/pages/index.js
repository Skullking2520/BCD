import { useAccount, useWriteContract, useSimulateContract, useDisconnect } from 'wagmi'
import { parseEther } from 'viem'
import { useState, useEffect } from 'react'
import ConnectWallet from '../components/ConnectWallet'
import Notification from '../components/Notification'

export default function Home() {
  const { address, isConnected } = useAccount()
  const { writeContract } = useWriteContract()
  const { disconnect } = useDisconnect()
  const [selectedQuantities, setSelectedQuantities] = useState({})
  const [isLoading, setIsLoading] = useState({})
  const [notification, setNotification] = useState(null)
  const [mounted, setMounted] = useState(false)

    useEffect(() => {
    setMounted(true)
  }, [])

  if (!isConnected) {
    return <ConnectWallet />
  }

  const handleLogout = () => {
    disconnect()
  }

  const handleQuantityChange = (itemId, quantity) => {
    setSelectedQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(1, Math.min(10, quantity)) // Limit 1-10
    }))
  }

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
  }

  const handleBuy = async (itemName, price, itemId) => {
    const quantity = selectedQuantities[itemId] || 1
    const totalPrice = (parseFloat(price) * quantity).toFixed(3)
    
    try {
      setIsLoading(prev => ({ ...prev, [itemId]: true }))
      console.log(`Attempting to purchase ${quantity}x ${itemName} for ${totalPrice} ETH`)
      
      // Call the real marketplace contract for purchase
      const result = await writeContract({
        address: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853', // Updated GameMarketplace address
        abi: [
          {
            name: 'buyItem',
            type: 'function',
            stateMutability: 'payable',
            inputs: [
              { name: 'itemId', type: 'uint256' }
            ],
            outputs: []
          }
        ],
        functionName: 'buyItem',
        args: [itemId],
        value: parseEther(totalPrice)
      })

      showNotification(
        `Purchase Successful!\n\n${quantity}x ${itemName} has been added to your collection\nTotal Price: ${totalPrice} ETH\n\nTransaction Hash: ${result.hash}\n\nPlease check MetaMask for transaction details.`,
        'success'
      )
    } catch (error) {
      console.error('Purchase failed:', error)
      showNotification(
        `Purchase Failed\n\nError: ${error.message}\n\nPlease ensure you have sufficient ETH balance.`,
        'error'
      )
    } finally {
      setIsLoading(prev => ({ ...prev, [itemId]: false }))
    }
  }

  const gameItems = [
    {
      id: 1,
      name: "Legendary Sword",
      description: "A powerful sword with magical properties that grants +50 attack power and +25 critical strike chance",
      price: "0.1",
      rarity: "LEGENDARY",
      rarityColor: "text-orange-600",
      bgGradient: "from-orange-400 to-red-500",
      icon: "⚔️",
      stats: { attack: 50, crit: 25, durability: 100 }
    },
    {
      id: 2,
      name: "Epic Shield",
      description: "A sturdy shield that blocks all damage and provides +40 defense with magic resistance",
      price: "0.05",
      rarity: "EPIC",
      rarityColor: "text-purple-600",
      bgGradient: "from-purple-400 to-pink-500",
      icon: "🛡️",
      stats: { defense: 40, magicResist: 30, block: 75 }
    },
    {
      id: 3,
      name: "Rare Potion",
      description: "Restores health and mana instantly. Perfect for emergency situations in battle",
      price: "0.02",
      rarity: "RARE",
      rarityColor: "text-blue-600",
      bgGradient: "from-blue-400 to-cyan-500",
      icon: "🧪",
      stats: { heal: 100, mana: 100, duration: 5 }
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 transition-colors duration-300">
      {/* Notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Header */}
      <header className="bg-gray-800 shadow-lg border-b border-gray-700 transition-colors duration-300">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">🎮</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white transition-colors duration-300">Game Items Trading Platform</h1>
                <p className="text-sm text-gray-400 transition-colors duration-300">Secure blockchain trading</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="bg-gray-700 px-4 py-2 rounded-lg transition-colors duration-300">
                <span className="text-sm text-gray-400">Connected: </span>
                <span className="font-mono text-sm text-white">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>
              
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors font-semibold text-sm flex items-center"
              >
                <span className="mr-2">🚪</span>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4 transition-colors duration-300">
            Welcome to the Marketplace
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto transition-colors duration-300">
            Discover and purchase legendary game items. Each item is unique and secured on the blockchain.
          </p>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {gameItems.map((item) => (
            <div key={item.id} className="bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-700 overflow-hidden card-hover">
              {/* Item Image */}
              <div className={`w-full h-48 bg-gradient-to-br ${item.bgGradient} flex items-center justify-center relative overflow-hidden`}>
                <span className="text-white text-6xl drop-shadow-lg float">{item.icon}</span>
                <div className="absolute top-4 right-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-black bg-opacity-30 ${item.rarityColor}`}>
                    {item.rarity}
                  </span>
                </div>
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 transform -skew-x-12 shimmer"></div>
              </div>
              
              {/* Item Details */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2 transition-colors duration-300">{item.name}</h3>
                <p className="text-gray-300 text-sm mb-4 line-clamp-2 transition-colors duration-300">{item.description}</p>
                
                {/* Stats */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-300 mb-2 transition-colors duration-300">Item Stats:</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(item.stats).map(([stat, value]) => (
                      <div key={stat} className="flex justify-between">
                        <span className="text-gray-400 capitalize transition-colors duration-300">{stat}:</span>
                        <span className="font-semibold text-white transition-colors duration-300">+{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Price and Quantity */}
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <span className="text-2xl font-bold text-green-400 transition-colors duration-300">{item.price} ETH</span>
                    <span className="text-sm text-gray-400 ml-2 transition-colors duration-300">per item</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-300 transition-colors duration-300">Qty:</label>
                    <div className="flex items-center border border-gray-600 rounded-lg transition-colors duration-300">
                      <button
                        onClick={() => handleQuantityChange(item.id, (selectedQuantities[item.id] || 1) - 1)}
                        className="px-3 py-1 text-gray-400 hover:bg-gray-700 transition-colors"
                        disabled={selectedQuantities[item.id] <= 1}
                      >
                        -
                      </button>
                      <span className="px-3 py-1 text-white font-medium min-w-[2rem] text-center transition-colors duration-300">
                        {selectedQuantities[item.id] || 1}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item.id, (selectedQuantities[item.id] || 1) + 1)}
                        className="px-3 py-1 text-gray-400 hover:bg-gray-700 transition-colors"
                        disabled={selectedQuantities[item.id] >= 10}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Total Price */}
                <div className="mb-4 p-3 bg-green-900/20 rounded-lg transition-colors duration-300">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400 transition-colors duration-300">Total Price:</span>
                    <span className="text-lg font-bold text-green-400 transition-colors duration-300">
                      {((parseFloat(item.price) * (selectedQuantities[item.id] || 1)).toFixed(3))} ETH
                    </span>
                  </div>
                </div>
                
                {/* Buy Button */}
                <button
                  onClick={() => handleBuy(item.name, item.price, item.id)}
                  disabled={isLoading[item.id]}
                  className={`
                    w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 transform btn-animate
                    ${isLoading[item.id]
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 hover:shadow-lg hover:scale-105'
                    }
                    text-white relative overflow-hidden
                  `}
                >
                  {isLoading[item.id] ? (
                    <div className="flex items-center justify-center">
                      <div className="spinner mr-3"></div>
                      Processing...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <span className="mr-2">🛒</span>
                      Buy Now
                    </div>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Platform Statistics */}
        <div className="bg-gray-800 rounded-2xl shadow-xl p-8 mb-8 transition-colors duration-300">
          <h3 className="text-2xl font-bold text-white mb-6 text-center transition-colors duration-300">Platform Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-blue-900/20 rounded-xl transition-colors duration-300">
              <div className="text-4xl font-bold text-blue-400 mb-2 transition-colors duration-300">3</div>
              <div className="text-gray-300 font-medium transition-colors duration-300">Total Items</div>
              <div className="text-sm text-gray-400 mt-1 transition-colors duration-300">Available for trading</div>
            </div>
            <div className="text-center p-6 bg-green-900/20 rounded-xl transition-colors duration-300">
              <div className="text-4xl font-bold text-green-400 mb-2 transition-colors duration-300">0.17 ETH</div>
              <div className="text-gray-300 font-medium transition-colors duration-300">Total Value</div>
              <div className="text-sm text-gray-400 mt-1 transition-colors duration-300">Market capitalization</div>
            </div>
            <div className="text-center p-6 bg-purple-900/20 rounded-xl transition-colors duration-300">
              <div className="text-4xl font-bold text-purple-400 mb-2 transition-colors duration-300">2</div>
              <div className="text-gray-300 font-medium transition-colors duration-300">Active Games</div>
              <div className="text-sm text-gray-400 mt-1 transition-colors duration-300">Supported platforms</div>
            </div>
          </div>
        </div>

        {/* How to Use */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-2xl p-8 transition-colors duration-300">
          <h3 className="text-2xl font-bold text-white mb-6 text-center transition-colors duration-300">
            🎮 How to Use This DApp
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <h4 className="font-semibold text-white transition-colors duration-300">Select Quantity</h4>
                  <p className="text-gray-300 text-sm transition-colors duration-300">Choose how many items you want to purchase using the +/- buttons</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <h4 className="font-semibold text-white transition-colors duration-300">Click Buy Now</h4>
                  <p className="text-gray-300 text-sm transition-colors duration-300">Review the total price and click the Buy Now button</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <h4 className="font-semibold text-white transition-colors duration-300">Confirm Transaction</h4>
                  <p className="text-gray-300 text-sm transition-colors duration-300">Approve the transaction in your MetaMask wallet</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                <div>
                  <h4 className="font-semibold text-white transition-colors duration-300">Receive Items</h4>
                  <p className="text-gray-300 text-sm transition-colors duration-300">Your items will be added to your blockchain wallet</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-900/20 rounded-lg border border-yellow-700 transition-colors duration-300">
            <p className="text-yellow-200 text-sm text-center transition-colors duration-300">
              <strong>Note:</strong> This demo calls real smart contract transactions. Please confirm transactions in MetaMask.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
