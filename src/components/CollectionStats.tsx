'use client';

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faHashtag,
  faBullhorn,
  faCoins,
  faArrowsRotate,
  faSpinner
} from "@fortawesome/free-solid-svg-icons";
import { useGlobalState } from "@/context/GlobalStateContext";

export default function CollectionStats() {
  const { collectionSizes } = useGlobalState();

  if (!collectionSizes) {
    return (
      <div className="flex justify-center items-center mb-5 px-2 sm:px-4 w-full max-w-md">
        <div className="text-[var(--pip-glow-green)] drop-shadow-[0_0_3px_var(--pip-glow-green)] flex items-center">
          <div className="w-5 h-5 flex items-center justify-center mr-2">
            <FontAwesomeIcon 
              icon={faSpinner} 
              className="text-base animate-spin" 
              style={{ width: '1rem', height: '1rem' }}
            />
          </div>
          <span className="text-sm">Loading collection data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-4 mb-5 px-2 sm:px-4 w-full max-w-md">
      <div className="flex items-center flex-shrink-0 group">
        <div className="w-6 sm:w-8 h-6 sm:h-8 flex items-center justify-center mr-1 sm:mr-2">
          <FontAwesomeIcon 
            icon={faCoins} 
            className="text-[var(--pip-glow-green)] text-base sm:text-xl drop-shadow-[0_0_3px_var(--pip-glow-green)] group-hover:drop-shadow-[0_0_5px_var(--pip-glow-green)] transition-all" 
          />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] sm:text-xs text-[var(--pip-glow-green)] drop-shadow-[0_0_2px_var(--pip-glow-green)]">TOKENS</span>
          <span className="text-sm sm:text-lg font-bold text-white drop-shadow-[0_0_3px_var(--pip-glow-green)] group-hover:text-[var(--pip-glow-green)] transition-colors">{collectionSizes.creations?.toLocaleString() || 0}</span>
        </div>
      </div>
      
      <div className="flex items-center flex-shrink-0 group">
        <div className="w-6 sm:w-8 h-6 sm:h-8 flex items-center justify-center mr-1 sm:mr-2">
          <FontAwesomeIcon 
            icon={faArrowsRotate} 
            className="text-[var(--pip-glow-green)] text-base sm:text-xl drop-shadow-[0_0_3px_var(--pip-glow-green)] group-hover:drop-shadow-[0_0_5px_var(--pip-glow-green)] transition-all" 
          />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] sm:text-xs text-[var(--pip-glow-green)] drop-shadow-[0_0_2px_var(--pip-glow-green)]">TRADES</span>
          <span className="text-sm sm:text-lg font-bold text-white drop-shadow-[0_0_3px_var(--pip-glow-green)] group-hover:text-[var(--pip-glow-green)] transition-colors">{collectionSizes.trades?.toLocaleString() || 0}</span>
        </div>
      </div>
      
      <div className="flex items-center flex-shrink-0 group">
        <div className="w-6 sm:w-8 h-6 sm:h-8 flex items-center justify-center mr-1 sm:mr-2">
          <FontAwesomeIcon 
            icon={faHashtag} 
            className="text-[var(--pip-glow-green)] text-base sm:text-xl drop-shadow-[0_0_3px_var(--pip-glow-green)] group-hover:drop-shadow-[0_0_5px_var(--pip-glow-green)] transition-all" 
          />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] sm:text-xs text-[var(--pip-glow-green)] drop-shadow-[0_0_2px_var(--pip-glow-green)]">KEYWORDS</span>
          <span className="text-sm sm:text-lg font-bold text-white drop-shadow-[0_0_3px_var(--pip-glow-green)] group-hover:text-[var(--pip-glow-green)] transition-colors">{collectionSizes.keywords?.toLocaleString() || 0}</span>
        </div>
      </div>
      
      <div className="flex items-center flex-shrink-0 group">
        <div className="w-6 sm:w-8 h-6 sm:h-8 flex items-center justify-center mr-1 sm:mr-2">
          <FontAwesomeIcon 
            icon={faBullhorn} 
            className="text-[var(--pip-glow-green)] text-base sm:text-xl drop-shadow-[0_0_3px_var(--pip-glow-green)] group-hover:drop-shadow-[0_0_5px_var(--pip-glow-green)] transition-all" 
          />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] sm:text-xs text-[var(--pip-glow-green)] drop-shadow-[0_0_2px_var(--pip-glow-green)]">CALLS</span>
          <span className="text-sm sm:text-lg font-bold text-white drop-shadow-[0_0_3px_var(--pip-glow-green)] group-hover:text-[var(--pip-glow-green)] transition-colors">{collectionSizes.calls?.toLocaleString() || 0}</span>
        </div>
      </div>
    </div>
  );
} 