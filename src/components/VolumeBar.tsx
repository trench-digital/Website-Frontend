import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp, faArrowDown, faRocket } from '@fortawesome/free-solid-svg-icons';

interface VolumeBarProps {
  buyVolume: number;
  sellVolume: number;
  formatVolume: (volume: number) => string; // Use the existing formatNumber function signature
  title?: string; // Optional title for the bar container
}

const VolumeBar: React.FC<VolumeBarProps> = ({ buyVolume, sellVolume, formatVolume, title = "Buy/Sell Volume Ratio" }) => {
  // Calculation logic moved from IIFE
  const totalVolume = buyVolume + sellVolume;
  let buyPercentage = totalVolume > 0 ? (buyVolume / totalVolume) * 100 : 50;
  let sellPercentage = totalVolume > 0 ? (sellVolume / totalVolume) * 100 : 50;

  const minWidth = 5; // Minimum 5% width if both have volume
  const showDivider = buyVolume > 0 && sellVolume > 0;

  if (showDivider) {
    if (buyPercentage < minWidth) {
      buyPercentage = minWidth;
      sellPercentage = 100 - minWidth;
    } else if (sellPercentage < minWidth) {
      sellPercentage = minWidth;
      buyPercentage = 100 - minWidth;
    }
  } else if (buyVolume > 0) {
    buyPercentage = 100;
    sellPercentage = 0;
  } else if (sellVolume > 0) {
    sellPercentage = 100;
    buyPercentage = 0;
  } else {
    // Both 0, stick to 50/50
    buyPercentage = 50;
    sellPercentage = 50;
  }


  const buyWidthStyle = `${buyPercentage}%`;
  const sellWidthStyle = `${sellPercentage}%`;
  const buyPercentText = `${buyPercentage.toFixed(0)}%`;
  const sellPercentText = `${sellPercentage.toFixed(0)}%`;

  const buyWidthPercent = buyPercentage; // Keep numeric value for comparison
  const sellWidthPercent = sellPercentage; // Keep numeric value for comparison

  // Determine rocket color
  let rocketColorClass = 'text-white'; // Default to white if equal or both zero
  const tolerance = 0.1; // Tolerance for floating point comparison
  if (buyPercentage > sellPercentage + tolerance) {
    rocketColorClass = 'text-green-500';
  } else if (sellPercentage > buyPercentage + tolerance) {
    rocketColorClass = 'text-red-500';
  }

  return (
    <div
      className="w-full bg-[rgba(0,0,0,0.5)] border border-[var(--pip-glow-green)] rounded h-5 overflow-hidden flex relative shadow-[0_0_8px_rgba(0,255,0,0.3)_inset] shadow-inner text-xs font-bold mb-2" // Added mb-2 for spacing
      title={title} // Use the title prop
    >
      {/* Buy Section */}
      <div
        className="bg-green-700 h-full flex items-center justify-start text-white relative px-2 z-0" // Darker green, justify-start
        style={{ width: buyWidthStyle, transition: 'width 0.3s ease-in-out' }}
        title={`Buy Volume: ${formatVolume(buyVolume)} (${buyPercentText})`}
      >
        {buyWidthPercent >= 20 && ( // Show text & icon if wide enough
          <span className="flex items-center">
            <FontAwesomeIcon icon={faArrowUp} className="mr-1" style={{ width: '0.65rem', height: '0.65rem' }}/>
            {buyPercentText}
          </span>
        )}
      </div>

      {/* Sell Section */}
      <div
        className="bg-red-700 h-full flex items-center justify-end text-white relative px-2 z-0" // Darker red, justify-end
        style={{ width: sellWidthStyle, transition: 'width 0.3s ease-in-out' }}
        title={`Sell Volume: ${formatVolume(sellVolume)} (${sellPercentText})`}
      >
        {sellWidthPercent >= 20 && ( // Show text & icon if wide enough
          <span className="flex items-center">
            {sellPercentText}
            <FontAwesomeIcon icon={faArrowDown} className="ml-1" style={{ width: '0.65rem', height: '0.65rem' }}/>
          </span>
        )}
      </div>

      {/* Dynamic Divider with Rocket Icon */}
      {showDivider && (
        <div
          className="absolute top-0 bottom-0 w-4 flex items-center justify-center z-10"
          style={{ left: buyWidthStyle, transform: 'translateX(-50%)', transition: 'left 0.3s ease-in-out' }}
        >
          <FontAwesomeIcon
            icon={faRocket}
            className={`${rocketColorClass} drop-shadow-[0_0_3px_var(--pip-glow-green)]`}
            style={{ width: '0.75rem', height: '0.75rem' }}
          />
        </div>
      )}

      {/* Fixed 50% Marker */}
      <div
        className="absolute top-0 bottom-0 w-px bg-[rgba(0,255,0,0.4)] z-[5]"
        style={{ left: '50%', transform: 'translateX(-50%)', boxShadow: '0 0 2px rgba(0, 255, 0, 0.3)' }}
        title="50% Mark"
      ></div>
    </div>
  );
};

export default VolumeBar; 