import { useState } from 'react'
import { useAccount, useWriteContract, useSimulateContract } from 'wagmi'
import { parseEther } from 'viem'

export default function GameItemCard({ item }) {
  const { address } = useAccount()
  const [isLoading, setIsLoading] = useState(false)

  const { data: simulateData } = useSimulateContract({
    address: process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS,
    abi: [
      {
        name: 'buyItem',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
          { name: 'listingId', type: 'uint256' }
        ],
        outputs: []
      }
    ],
    functionName: 'buyItem',
    args: [item.listingId],
    value: parseEther(item.price.toString())
  })

  const { writeContract } = useWriteContract()

  const handleBuy = async () => {
    if (!address) {
      alert('Please connect your wallet first')
      return
    }

    setIsLoading(true)
    try {
      await writeContract({
        address: process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS,
        abi: [
          {
            name: 'buyItem',
            type: 'function',
            stateMutability: 'payable',
            inputs: [
              { name: 'listingId', type: 'uint256' }
            ],
            outputs: []
          }
        ],
        functionName: 'buyItem',
        args: [item.listingId],
        value: parseEther(item.price.toString())
      })
      alert('Purchase initiated! Check your wallet for confirmation.')
    } catch (error) {
      console.error('Purchase failed:', error)
      alert('Purchase failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getRarityColor = (rarity) => {
    const colors = {
      common: 'text-gray-600',
      rare: 'text-blue-600',
      epic: 'text-purple-600',
      legendary: 'text-orange-600',
      mythic: 'text-red-600'
    }
    return colors[rarity] || 'text-gray-600'
  }

  return (
    <div className="game-item-card">
      <div className="relative">
        <img
          src={item.image || `https://picsum.photos/400/400?random=${item.id}`}
          alt={item.name}
          className="game-item-image"
        />
        {item.isSold && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold">
            SOLD
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {item.name}
        </h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {item.description}
        </p>
        
        <div className="flex justify-between items-center mb-3">
          <span className={`text-sm font-medium ${getRarityColor(item.rarity)}`}>
            {item.rarity?.toUpperCase()}
          </span>
          <span className="price-display">
            {item.price} ETH
          </span>
        </div>
        
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-gray-500">
            Game: {item.gameName}
          </span>
          <span className="text-sm text-gray-500">
            Level: {item.level}
          </span>
        </div>
        
        <div className="text-xs text-gray-500 mb-4">
          Seller: {item.seller?.slice(0, 6)}...{item.seller?.slice(-4)}
        </div>
        
        {!item.isSold && (
          <button
            onClick={handleBuy}
            disabled={isLoading}
            className="trading-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : 'Buy Now'}
          </button>
        )}
      </div>
    </div>
  )
} 