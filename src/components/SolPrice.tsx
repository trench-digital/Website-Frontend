"use client";

import { useGlobalState } from '@/context/GlobalStateContext';

export default function SolPrice() {
  const { solPrice: price, solPriceChange: priceChange, solPriceLoading: loading } = useGlobalState();

  if (loading) {
    return <div className="flex items-center text-xs">Loading SOL...</div>;
  }

  const isPositive = priceChange && priceChange > 0;

  return (
    <div className="flex items-center space-x-2">
      <svg 
        width="20" 
        height="20" 
        viewBox="0 0 24 20" 
        className="text-[var(--pip-glow-green)]"
      >
        <path 
          d="M4.2 14.1c0.1-0.1 0.2-0.1 0.4-0.1h15.6c0.2 0 0.3 0.2 0.2 0.4l-3.4 3.4c-0.1 0.1-0.2 0.1-0.4 0.1H0.4c-0.2 0-0.3-0.2-0.2-0.4l4-3.4z" 
          fill="currentColor"
        />
        <path 
          d="M4.2 0.1c0.1-0.1 0.2-0.1 0.4-0.1h15.6c0.2 0 0.3 0.2 0.2 0.4l-3.4 3.4c-0.1 0.1-0.2 0.1-0.4 0.1H0.4c-0.2 0-0.3-0.2-0.2-0.4l4-3.4z" 
          fill="currentColor"
        />
        <path 
          d="M20 7.1c-0.1-0.1-0.2-0.1-0.4-0.1H4c-0.2 0-0.3 0.2-0.2 0.4l3.4 3.4c0.1 0.1 0.2 0.1 0.4 0.1h15.6c0.2 0 0.3-0.2 0.2-0.4L20 7.1z" 
          fill="currentColor"
        />
      </svg>
      <div className="text-xs">
        <span className="font-bold">${price?.toFixed(2)}</span>
        {priceChange !== null && (
          <span
            className={`ml-1 text-xs ${
              isPositive ? "text-green-400" : "text-red-400"
            }`}
          >
            {isPositive ? "+" : ""}
            {priceChange.toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
} 