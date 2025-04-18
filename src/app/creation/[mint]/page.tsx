// src/app/creation/[mint]/page.tsx
"use client";

import { useState, useEffect } from "react";
// Import useParams hook
import { useParams } from "next/navigation";
import { TrenchPumpFunSDK, CreationResponse, Period } from "@/lib/trenchPumpFunSdk";
import PipBoyLayout from "@/components/PipBoyLayout";
import Link from "next/link";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTwitter, faTelegram } from "@fortawesome/free-brands-svg-icons";
import { faGlobe, faArrowUpRightFromSquare, faSpinner, faChartLine, faCommentDots, faCalendarAlt, faTag, faUser, faHourglassHalf, faArrowsRotate } from "@fortawesome/free-solid-svg-icons";

// Create SDK instance
const sdk = new TrenchPumpFunSDK();

// Helper function to format large numbers
const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  } else {
    return num.toFixed(2);
  }
};

// Format date to readable form
const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// SOL icon component
const SolIcon = ({ className = "text-[var(--pip-glow-green)]", size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 20"
    className={className}
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
);

// No longer needed for component props
// interface MintPageProps {
//   params: {
//     mint: string
//   }
// }

// Change signature: remove props
const CreationPage = () => {
  // Use the useParams hook to get route parameters
  // Use a generic for better type safety based on your folder structure [mint]
  const params = useParams<{ mint: string }>();
  // Get the mint from params returned by the hook
  const mint = params.mint;

  const [creation, setCreation] = useState<CreationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // SDK default page size, used for pagination logic
  const callsPerPage = 10;

  // Get appropriate icon for the time period
  const getTimeIcon = () => {
    return faHourglassHalf; // Use faHourglassHalf for all time periods
  };

  useEffect(() => {
    // Ensure mint is available before fetching
    if (!mint) {
      setError("Mint address not found in URL.");
      setLoading(false);
      return;
    }

    const fetchCreation = async () => {
      try {
        setLoading(true);
        setError(null); // Reset error on new fetch
        // Use the currentPage - 1 since API pagination is 0-indexed while our UI is 1-indexed
        const data = await sdk.getCreation(mint, { callsPage: currentPage - 1 });
        console.log("Creation data:", data);
        setCreation(data);
      } catch (err) {
        console.error("Error fetching creation:", err);
        if (err instanceof Error) {
            setError(`Failed to load creation details: ${err.message}. Please try again later.`);
        } else {
            setError("Failed to load creation details due to an unknown error. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCreation();
  }, [mint, currentPage]); // Add currentPage as dependency to refetch when page changes

  // Get time since last trade
  const getTimeSinceLastTrade = () => {
    if (!creation?.volume?.lastTradeDate) return "Never";

    const lastTraded = new Date(creation.volume.lastTradeDate);
    const now = new Date();
    const diffMs = now.getTime() - lastTraded.getTime();

    // Convert to minutes, hours, days
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  // Calculate net volume (buy - sell) for each period
  const getNetVolume = (period: Period) => {
    if (!creation?.volume) return 0;

    const buy = creation.volume.buy[period] || 0;
    const sell = creation.volume.sell[period] || 0;
    return buy - sell;
  };

  // Get calls directly from the creation response
  const getCalls = () => {
    if (!creation?.calls || creation.calls.length === 0) return [];
    return creation.calls;
  };

  // Handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // The useEffect will trigger a new API call with the updated page
  };

  // --- Rest of your component remains the same ---
  // (PipBoyLayout, rendering logic, etc.)

  return (
    <PipBoyLayout>
      {/* Added subtle terminal line at top */}
      <div className="w-full h-2 bg-[var(--pip-glow-green)] opacity-10 mb-1"></div>

      <div className="pip-border p-4 md:p-6 w-full h-full overflow-auto">
        {/* Add scanline effect for PipBoy theme */}
        <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.15),rgba(0,0,0,0.15)_1px,transparent_1px,transparent_2px)]"></div>

        {loading ? (
          <div className="min-h-[60vh] w-full flex items-center justify-center">
            <div className="text-center">
              <FontAwesomeIcon icon={faSpinner} className="text-[var(--pip-glow-green)] fa-spin text-4xl mb-4" />
              <p className="text-[var(--pip-glow-green)] animate-pulse">Loading token data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="min-h-[60vh] w-full flex items-center justify-center">
            <div className="text-center p-8 max-w-md">
              <p className="text-red-500 mb-4">{error}</p>
              <Link href="/" className="text-[var(--pip-glow-green)] hover:underline inline-flex items-center gap-2 border border-[var(--pip-glow-green)] py-2 px-4 rounded-sm hover:bg-[var(--pip-glow-green)] hover:text-black transition-colors">
                <span>Return to dashboard</span>
              </Link>
            </div>
          </div>
        ) : creation ? (
          <div className="relative z-10">
            {/* Go Back button relocated here */}
            <div className="flex justify-between items-center mb-6">
              <Link
                href="/creations/"
                className="text-[var(--pip-glow-green)] hover:opacity-80 flex items-center gap-1 border border-[var(--pip-glow-green)] px-3 py-1 rounded-none hover:bg-[var(--pip-glow-green)] hover:text-black transition-colors"
              >
                <span>← Go Back</span>
              </Link>

              {/* Token mint info - moved from below to here for balance */}
              <div className="text-sm text-[var(--pip-glow-green)] flex items-center gap-2">
                <FontAwesomeIcon icon={faTag} className="text-gray-400" />
                <span className="hidden sm:inline">Mint:</span>
                {creation?.creation?.mint ? (
                  <a
                    href={`https://solscan.io/token/${creation.creation.mint}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline truncate max-w-[120px] sm:max-w-[200px]"
                  >
                    {creation.creation.mint.substring(0, 8)}...{creation.creation.mint.substring(creation.creation.mint.length - 4)}
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="ml-1 text-xs" />
                  </a>
                ) : "N/A"}
              </div>
            </div>

            {/* Token Info Section */}
            <div className="mb-8 border border-[var(--pip-glow-green)] p-4 bg-black/20 rounded-none relative">
              {/* PipBoy-style section label */}
              <div className="absolute top-0 left-4 transform -translate-y-1/2 bg-black px-3 text-sm text-[var(--pip-glow-green)]">
                TOKEN INFO
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] gap-6 mt-2">
                {/* Token image - UPDATED STYLING */}
                <div className="mx-auto md:mx-0 w-full max-w-[150px] aspect-square relative rounded-none border-2 border-[var(--pip-glow-green)] bg-black/40 overflow-hidden">
                  {creation.creation?.metadata?.image && !imageError ? (
                    <Image
                      src={creation.creation.metadata.image}
                      alt={creation.creation?.metadata?.name || "Token image"}
                      fill
                      sizes="(max-width: 768px) 150px, 150px"
                      className="object-cover"
                      unoptimized
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[var(--pip-glow-green)]">
                      <FontAwesomeIcon icon={faUser} className="text-4xl mb-2 opacity-50" />
                      <span className="text-sm">No Image</span>
                    </div>
                  )}
                </div>

                {/* Token info */}
                <div>
                  {/* Token name and symbol */}
                  <h1 className="text-2xl md:text-3xl font-bold mb-3 text-[var(--pip-glow-green)]">
                    {creation.creation?.metadata?.name || "Unnamed Token"}
                    <span className="text-sm ml-2 font-normal bg-[var(--pip-glow-green)] text-black px-2 py-0.5 rounded-none">
                      {creation.creation?.metadata?.symbol || ""}
                    </span>
                  </h1>

                  {/* Keywords/Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {creation.creation?.keywords?.map((keyword: string) => (
                      <Link
                        href={`/keyword/${keyword}`}
                        key={keyword}
                        className="inline-block border border-[var(--pip-glow-green)] px-2 py-0.5 rounded-none text-sm hover:bg-[var(--pip-glow-green)] hover:text-black transition-colors"
                      >
                        #{keyword}
                      </Link>
                    ))}
                  </div>

                  {/* Description */}
                  <div className="mb-5 text-[var(--pip-glow-green)] border-l-2 border-[var(--pip-glow-green)] pl-3 py-1">
                    {creation.creation?.metadata?.description || "No description available"}
                  </div>

                  {/* Quick stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    <div className="border border-green-500 p-3 rounded-none">
                      <div className="text-xs text-green-500 mb-1 flex items-center gap-1">
                        <SolIcon size={12} className="text-green-500" />
                        <span>24h Buy Vol</span>
                      </div>
                      <div className="text-lg font-mono font-semibold flex items-center gap-1 text-green-500">
                        {formatNumber(creation.volume?.buy?.['24h'] || 0)}
                        <SolIcon size={16} className="ml-1 text-green-500" />
                      </div>
                    </div>
                    <div className="border border-red-500 p-3 rounded-none">
                      <div className="text-xs text-red-500 mb-1 flex items-center gap-1">
                        <SolIcon size={12} className="text-red-500" />
                        <span>24h Sell Vol</span>
                      </div>
                      <div className="text-lg font-mono font-semibold flex items-center gap-1 text-red-500">
                        {formatNumber(creation.volume?.sell?.['24h'] || 0)}
                        <SolIcon size={16} className="ml-1 text-red-500" />
                      </div>
                    </div>
                    <div className={`border p-3 rounded-none ${getNetVolume('24h') >= 0 ? 'border-green-500' : 'border-red-500'}`}>
                      <div className={`text-xs mb-1 flex items-center gap-1 ${getNetVolume('24h') >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        <SolIcon size={12} className={getNetVolume('24h') >= 0 ? 'text-green-500' : 'text-red-500'} />
                        <span>Net 24h</span>
                      </div>
                      <div className={`text-lg font-mono font-semibold flex items-center gap-1 ${getNetVolume('24h') >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {getNetVolume('24h') >= 0 ? '+' : ''}{formatNumber(getNetVolume('24h'))}
                        <SolIcon size={16} className={getNetVolume('24h') >= 0 ? 'text-green-500' : 'text-red-500'} />
                      </div>
                    </div>
                    <div className="border border-[var(--pip-glow-green)] p-3 rounded-none">
                      <div className="text-xs text-[var(--pip-glow-green)] mb-1 flex items-center gap-1">
                        <FontAwesomeIcon icon={faTwitter} className="w-3 h-3 text-[var(--pip-glow-green)]" />
                        <span>X Calls</span>
                      </div>
                      <div className="text-lg font-mono font-semibold text-[var(--pip-glow-green)] flex items-center">
                        {creation.calls?.length || 0}
                        <FontAwesomeIcon icon={faCommentDots} size="xs" className="ml-1 text-[var(--pip-glow-green)]" />
                      </div>
                    </div>
                  </div>

                  {/* Social links */}
                  <div className="flex flex-wrap gap-3 mb-5">
                    {creation.creation?.metadata?.website && (
                      <a
                        href={creation.creation.metadata.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--pip-glow-green)] hover:opacity-80 flex items-center gap-1 border border-[var(--pip-glow-green)] px-3 py-1 rounded-none hover:bg-[var(--pip-glow-green)] hover:text-black transition-colors"
                      >
                        <FontAwesomeIcon icon={faGlobe} />
                        <span>Website</span>
                      </a>
                    )}

                    {creation.creation?.metadata?.twitter && (
                      <a
                        href={creation.creation.metadata.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--pip-glow-green)] hover:opacity-80 flex items-center gap-1 border border-[var(--pip-glow-green)] px-3 py-1 rounded-none hover:bg-[var(--pip-glow-green)] hover:text-black transition-colors"
                      >
                        <FontAwesomeIcon icon={faTwitter} />
                        <span>Twitter</span>
                      </a>
                    )}

                    {creation.creation?.metadata?.telegram && (
                      <a
                        href={creation.creation.metadata.telegram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--pip-glow-green)] hover:opacity-80 flex items-center gap-1 border border-[var(--pip-glow-green)] px-3 py-1 rounded-none hover:bg-[var(--pip-glow-green)] hover:text-black transition-colors"
                      >
                        <FontAwesomeIcon icon={faTelegram} />
                        <span>Telegram</span>
                      </a>
                    )}
                  </div>

                  {/* Creation details */}
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-[var(--pip-glow-green)]">
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400" />
                      <span>Created: {formatDate(creation.creation?.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faChartLine} className="text-gray-400" />
                      <span>Last Trade: {getTimeSinceLastTrade()}</span>
                    </div>

                    {/* Migration Info */}
                    {creation.creation?.migration && (
                      <div className="flex items-center gap-2 col-span-2 mt-2 border-t border-[var(--pip-glow-green)]/30 pt-3">
                        <div className="bg-amber-500/20 border border-amber-400 py-2 px-3 rounded-none flex items-center gap-2 w-full">
                          <FontAwesomeIcon icon={faArrowsRotate} className="text-amber-400" />
                          <div className="flex flex-col">
                            <span className="text-amber-400 font-semibold text-sm">Token Migration Scheduled</span>
                            <span className="text-xs text-amber-300">
                              Migrating on {formatDate(creation.creation.migration.migratedAt)}
                            </span>
                          </div>
                          <a
                            href={`https://solscan.io/tx/${creation.creation.migration.signature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto text-xs text-amber-400 hover:underline flex items-center"
                          >
                            View TX
                            <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="ml-1 text-xs" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Trading statistics */}
            <div className="border border-[var(--pip-glow-green)] p-4 mb-6 bg-black/20 rounded-none relative">
              {/* PipBoy-style section label */}
              <div className="absolute top-0 left-4 transform -translate-y-1/2 bg-black px-3 text-sm text-[var(--pip-glow-green)]">
                TRADING DATA
              </div>
              <div className="mt-2">
                <h2 className="text-xl mb-4 text-[var(--pip-glow-green)] border-b border-[var(--pip-glow-green)] pb-2 flex items-center gap-2">
                  <FontAwesomeIcon icon={faChartLine} className="text-[var(--pip-glow-green)]" />
                  <span>Volume</span>
                </h2>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
                  {creation.volume && Object.keys(creation.volume.buy).map((period) => {
                    const periodKey = period as Period;
                    const netVolume = getNetVolume(periodKey);
                    const isPositive = netVolume >= 0;

                    return (
                      <div
                        key={`net-${period}`}
                        className={`border p-3 rounded-none ${isPositive ? 'border-green-500' : 'border-red-500'}`}
                      >
                        <div className={`text-sm mb-1 ${isPositive ? 'text-green-500' : 'text-red-500'} flex items-center gap-1`}>
                          <FontAwesomeIcon icon={getTimeIcon()} className="text-xs" />
                          <span>{period}</span>
                        </div>
                        <div className={`text-lg font-mono font-semibold flex items-center gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                          {isPositive ? '+' : ''}{formatNumber(netVolume)}
                          <SolIcon size={16} className={isPositive ? 'text-green-500' : 'text-red-500'} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h2 className="text-xl mb-4 text-[var(--pip-glow-green)] border-b border-[var(--pip-glow-green)] pb-2 flex items-center gap-2">
                      <FontAwesomeIcon icon={faChartLine} className="text-[var(--pip-glow-green)]" />
                      <span>Buy Volume</span>
                    </h2>
                    <div className="grid grid-cols-3 md:grid-cols-3 gap-3">
                      {creation.volume && Object.entries(creation.volume.buy).map(([period, value]) => (
                        <div key={`buy-${period}`} className="border border-green-500 p-3 rounded-none hover:bg-black/20 transition-colors">
                          <div className="text-sm text-green-500 mb-1 flex items-center gap-1">
                            <FontAwesomeIcon
                              icon={getTimeIcon()}
                              className="text-xs"
                            />
                            <span>{period}</span>
                          </div>
                          <div className="text-lg font-mono font-semibold flex items-center gap-1 text-green-500">
                            {formatNumber(value)}
                            <SolIcon size={16} className="ml-1 text-green-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl mb-4 text-[var(--pip-glow-green)] border-b border-[var(--pip-glow-green)] pb-2 flex items-center gap-2">
                      <FontAwesomeIcon icon={faChartLine} className="text-[var(--pip-glow-green)]" />
                      <span>Sell Volume</span>
                    </h2>
                    <div className="grid grid-cols-3 md:grid-cols-3 gap-3">
                      {creation.volume && Object.entries(creation.volume.sell).map(([period, value]) => (
                        <div key={`sell-${period}`} className="border border-red-500 p-3 rounded-none hover:bg-black/20 transition-colors">
                          <div className="text-sm text-red-500 mb-1 flex items-center gap-1">
                            <FontAwesomeIcon
                              icon={getTimeIcon()}
                              className="text-xs"
                            />
                            <span>{period}</span>
                          </div>
                          <div className="text-lg font-mono font-semibold flex items-center gap-1 text-red-500">
                            {formatNumber(value)}
                            <SolIcon size={16} className="ml-1 text-red-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Calls section */}
            <div className="border border-[var(--pip-glow-green)] p-4 mb-6 bg-black/20 rounded-none relative">
              {/* PipBoy-style section label */}
              <div className="absolute top-0 left-4 transform -translate-y-1/2 bg-black px-3 text-sm text-[var(--pip-glow-green)]">
                SOCIAL SIGNALS
              </div>
              <div className="mt-2">
                <div className="flex justify-between items-center mb-4 border-b border-[var(--pip-glow-green)] pb-2">
                  <h2 className="text-xl text-[var(--pip-glow-green)] flex items-center gap-2">
                    <FontAwesomeIcon icon={faCommentDots} />
                    <span>X Calls </span>
                    <span className="bg-[var(--pip-glow-green)] text-black text-sm px-2 py-0.5 rounded-none ml-2">
                      {/* Updated logic to handle pagination display */}
                      {creation.calls && creation.calls.length > 0 ? `Page ${currentPage}` : '0'}
                    </span>
                  </h2>
                </div>

                {/* Call items display */}
                {getCalls().length > 0 ? ( // Check length of the result of getCalls()
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {getCalls().map((callItem, index) => {
                      const call = callItem.call;
                      return (
                        <div key={`${call.username}-${call.createdAt}-${index}`} className="border border-[var(--pip-glow-green)] p-3 rounded-none hover:bg-black/20 transition-colors group"> {/* Improved key */}
                          <Link
                            href={`/kol/${call.username}`}
                            className="text-[var(--pip-glow-green)] hover:underline font-semibold flex items-center gap-1 mb-2"
                          >
                            <FontAwesomeIcon icon={faTwitter} className="text-blue-400" />
                            <span>@{call.username}</span>
                          </Link>
                          <div className="text-xs opacity-70 mb-2">{formatDate(call.createdAt)}</div>
                          {callItem.volumeChange1H !== undefined && (
                            <div className={`text-xs mb-2 ${callItem.volumeChange1H >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              Potential Brought Volume: {callItem.volumeChange1H >= 0 ? '+' : ''}{formatNumber(callItem.volumeChange1H)}
                              <SolIcon size={12} className="ml-1 inline" />
                            </div>
                          )}
                          <div className="flex justify-end">
                            <a
                              href={call.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-[var(--pip-glow-green)] rounded-none hover:underline transition-colors group-hover:text-[var(--pip-glow-green)] group-hover:brightness-125"
                            >
                              <span>View</span>
                              <FontAwesomeIcon icon={faArrowUpRightFromSquare} size="xs" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center p-8 text-gray-400 border border-dashed border-gray-700 rounded-none mb-4">
                    <FontAwesomeIcon icon={faCommentDots} className="text-4xl mb-3 opacity-30" />
                    {currentPage > 1 ? (
                      <p>No more calls found on page {currentPage}</p> // Changed message for clarity
                    ) : (
                      <p>No X calls recorded for this token yet</p> // Changed message for clarity
                    )}
                  </div>
                )}

                {/* Pagination - Updated disabled logic for Next button */}
                <div className="flex justify-center items-center gap-2 mt-6 border-t border-gray-700 pt-4">
                  <button
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 border border-[var(--pip-glow-green)] ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--pip-glow-green)] hover:text-black'} transition-colors text-[var(--pip-glow-green)] rounded-none`}
                  >
                    Prev
                  </button>

                  {/* Page number indicator */}
                  <div className="text-[var(--pip-glow-green)] mx-2 px-3 py-1">
                    Page {currentPage}
                  </div>

                  {/* Disable Next if the current fetched page has less than callsPerPage items */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!creation?.calls || creation.calls.length < callsPerPage}
                    className={`px-3 py-1 border border-[var(--pip-glow-green)] ${!creation?.calls || creation.calls.length < callsPerPage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--pip-glow-green)] hover:text-black'} transition-colors text-[var(--pip-glow-green)] rounded-none`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null} {/* Render null if !loading && !error && !creation */}
      </div>
    </PipBoyLayout>
  );
};

export default CreationPage;