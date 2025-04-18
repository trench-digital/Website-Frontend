'use client';

/**
 * Keyword Detail Page
 * 
 * This page displays detailed information about a specific keyword, including:
 * - Usage statistics
 * - Trading volume
 * - Related tokens
 * - Call data
 * 
 * The page uses the TrenchPumpFunSDK to fetch data from the Trench API.
 * 
 * Pagination:
 * - Uses zero-based pagination (page index starts at 0) for all SDK calls
 * - Implements "Load More" functionality to dynamically load additional tokens
 * - Tracks current page and whether more tokens are available
 */

import PipBoyLayout from "@/components/PipBoyLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faHashtag, 
  faArrowUp, 
  faArrowDown, 
  faSpinner, 
  faExclamationTriangle,
  faChartLine,
  faFire,
  faUsers,
  faBullhorn,
  faCoins,
  faClock,
  faArrowLeft,
  faCalendarAlt,
  faGlobe,
  faExternalLinkAlt,
  faTable,
  faThLarge,
  faArrowRight,
  faRocket
} from "@fortawesome/free-solid-svg-icons";
import { faTwitter as fabTwitter, faTelegram as fabTelegram } from "@fortawesome/free-brands-svg-icons";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import trenchSDK, { CreationResponse, SortOrder } from "@/lib/trenchPumpFunSdk";
import React from "react";

// Define types for the API response
interface KeywordData {
  keyword: {
    keyword: string;
    description: string;
    createdAt: string;
  };
  usages?: {
    "30m": number;
    "1h": number;
    "3h": number;
    "6h": number;
    "12h": number;
    "24h": number;
  };
  buyVolume?: {
    "30m": number;
    "1h": number;
    "3h": number;
    "6h": number;
    "12h": number;
    "24h": number;
  };
  sellVolume?: {
    "30m": number;
    "1h": number;
    "3h": number;
    "6h": number;
    "12h": number;
    "24h": number;
  };
  calls?: {
    "30m": number;
    "1h": number;
    "3h": number;
    "6h": number;
    "12h": number;
    "24h": number;
  };
  callCounts?: {
    "30m": number;
    "1h": number;
    "3h": number;
    "6h": number;
    "12h": number;
    "24h": number;
  };
  averageMigrationDuration?: number;
  tokens?: TokenData[];
}

// Interface for token data
interface TokenData {
    tokenAddress: string;
    name: string;
    symbol: string;
    createdAt: string;
    migratedAt?: string;
    volume?: number;
  buyVolume?: Record<TimePeriod, number>;
  sellVolume?: Record<TimePeriod, number>;
  description?: string;
  image?: string;
  twitter?: string;
  website?: string;
  telegram?: string;
  lastTradedAt?: string | null;
  isRecentlyTraded?: boolean;
  calls?: Record<TimePeriod, number>;
}

// Define time period type
type TimePeriod = '30m' | '1h' | '3h' | '6h' | '12h' | '24h';

export default function KeywordDetail() {
  const params = useParams();
  const keywordParam = params.keyword as string;
  const decodedKeyword = decodeURIComponent(keywordParam);
  
  const [keywordData, setKeywordData] = useState<KeywordData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tokensLoading, setTokensLoading] = useState<boolean>(false);
  const [tokensError, setTokensError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'tokens'>('overview');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('24h');
  const [sortBy, setSortBy] = useState<'volume' | 'calls' | 'recent' | 'migration'>('volume');
  const [_onlyMigrated, _setOnlyMigrated] = useState<boolean>(false);
  const [tokenView, setTokenView] = useState<'table' | 'grid'>('table');
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(0); // Zero-based indexing for the API
  const [hasMoreTokens, setHasMoreTokens] = useState<boolean>(true);
  
  // Add a ref to track the current page
  const currentPageRef = useRef(0);
  
  // Fetch related tokens for the keyword
  const fetchRelatedTokens = useCallback(async (pageIndex: number = 0, append: boolean = false) => {
    if (!decodedKeyword) return;
    
    // If we're not appending and the page index is 0, reset the current page ref
    if (!append && pageIndex === 0) {
      currentPageRef.current = 0;
    }
    
    // If we're trying to fetch a page that's not the next one, ignore the request
    if (pageIndex !== currentPageRef.current) {
      console.log(`[Tokens] Ignoring request for page ${pageIndex}, current page is ${currentPageRef.current}`);
      return;
    }
    
    setTokensLoading(true);
    setTokensError(null);
    
    try {
      // Determine the sorting parameter based on current sortBy state
      let sortParam: SortOrder = 'volume';
      if (sortBy === 'recent') {
        sortParam = 'recent';
      } else if (sortBy === 'calls') {
        sortParam = 'calls';
      } else if (sortBy === 'migration') {
        sortParam = 'migration';
      }
      
      // Fetch related tokens using the SDK
      console.log(`[Tokens] Fetching tokens with sort=${sortParam}, period=${timePeriod}, page=${pageIndex}`);
      const tokens = await trenchSDK.getCreationsByKeyword(decodedKeyword, {
        sort: sortParam,
        period: timePeriod,
        page: pageIndex
      });
      
      // Check if there are more tokens to fetch (based on the SDK's default page size)
      // If tokens is empty, set hasMoreTokens to false
      setHasMoreTokens(tokens && tokens.length > 0);
      
      if (!tokens || tokens.length === 0) {
        if (!append) {
          setKeywordData((prevData) => prevData ? { ...prevData, tokens: [] } : null);
        }
        setHasMoreTokens(false);
        return;
      }
      
      // Map the API response to our token data structure
      const mappedTokens: TokenData[] = tokens.map((item: CreationResponse) => {
        // Initialize buyVolume and sellVolume with default values for all time periods
        const buyVolume: Record<TimePeriod, number> = {
          '30m': 0,
          '1h': 0,
          '3h': 0,
          '6h': 0,
          '12h': 0,
          '24h': 0
        };
        
        const sellVolume: Record<TimePeriod, number> = {
          '30m': 0,
          '1h': 0,
          '3h': 0,
          '6h': 0,
          '12h': 0,
          '24h': 0
        };
        
        // Extract volumes for each time period
        (['30m', '1h', '3h', '6h', '12h', '24h'] as TimePeriod[]).forEach(period => {
          buyVolume[period] = item.volume?.buy[period] || 0;
          sellVolume[period] = item.volume?.sell[period] || 0;
        });
        
        // Calculate total volume (24h by default)
        const totalVolume = buyVolume['24h'] + sellVolume['24h'];
        
        // Extract metadata from the creation object
        const { metadata = {}, mint = '', createdAt = '' } = item.creation || {};
        
        // Check if the token has been traded recently
        const lastTradedAt = item.volume?.lastTradeDate ? new Date(item.volume.lastTradeDate) : null;
        const now = new Date();
        const isRecentlyTraded = lastTradedAt ? (now.getTime() - lastTradedAt.getTime() < 24 * 60 * 60 * 1000) : false;
        
        // Initialize calls with default values for each time period
        const calls: Record<TimePeriod, number> = {
          '30m': 0,
          '1h': 0,
          '3h': 0,
          '6h': 0,
          '12h': 0,
          '24h': 0
        };
        
        // Process calls if they exist
        if (item.callVolume && item.callVolume.callVolume) {
          Object.entries(item.callVolume.callVolume).forEach(([period, count]) => {
            calls[period as TimePeriod] = count;
          });
        }
        
        return {
          tokenAddress: mint,
          name: metadata.name || `${decodedKeyword} Token`,
          symbol: metadata.symbol || decodedKeyword.substring(0, 4).toUpperCase(),
          createdAt: createdAt || new Date().toISOString(),
          migratedAt: item.migrationSpeed ? item.migratedOn : undefined,
          volume: totalVolume,
          buyVolume,
          sellVolume,
          description: metadata.description,
          image: metadata.image,
          twitter: metadata.twitter,
          website: metadata.website,
          telegram: metadata.telegram,
          lastTradedAt: item.volume?.lastTradeDate,
          isRecentlyTraded,
          calls
        };
      });
      
      // Update the tokens in the state
      setKeywordData((prevData) => {
        if (!prevData) return null;
        return {
          ...prevData,
          tokens: append ? [...(prevData.tokens || []), ...mappedTokens] : mappedTokens
        };
      });
      
      // Increment the current page
      currentPageRef.current++;
    } catch (error) {
      console.error('[Tokens] Error fetching tokens:', error);
      setTokensError(error instanceof Error ? error.message : 'Failed to fetch tokens');
    } finally {
      setTokensLoading(false);
    }
  }, [decodedKeyword, sortBy, timePeriod]);
  
  // Function to load more tokens
  const loadMoreTokens = useCallback(() => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchRelatedTokens(nextPage, true); // Append new results to existing ones
  }, [currentPage, fetchRelatedTokens]);
  
  // Reset pagination and refetch tokens when filters change
  const resetAndFetchTokens = useCallback((loadingAlreadySet: boolean = false) => {
    setCurrentPage(0);
    setHasMoreTokens(true);
    // Clear existing tokens before fetching new ones
    setKeywordData(prevData => prevData ? { ...prevData, tokens: [] } : null);
    
    // If loading isn't already set, set it now before the fetch
    if (!loadingAlreadySet) {
      setTokensLoading(true);
    }
    
    fetchRelatedTokens(0, false);
  }, [fetchRelatedTokens]);
  
  // Fetch keyword details from the API
  const fetchKeywordDetails = useCallback(async () => {
    if (!decodedKeyword) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch keyword details using the SDK
      console.log(`[Keyword] Fetching keyword data for ${decodedKeyword} with period=${timePeriod}`);
      const data = await trenchSDK.getKeywordDetail(decodedKeyword, {
        callsPage: 0 // Using zero-based indexing
      });
      
      // Map SDK response to our KeywordData structure
      const keywordInfo: KeywordData = {
        keyword: {
          keyword: data.keyword.keyword,
          description: data.keyword.description,
          createdAt: data.keyword.createdAt
        },
        usages: data.usage?.usage,
        buyVolume: data.volume?.buy,
        sellVolume: data.volume?.sell,
        calls: data.callVolume?.callVolume,
        averageMigrationDuration: data.migration?.meanDuration
      };
      
      setKeywordData(keywordInfo);
      
      // Only fetch related tokens on initial load or when explicitly requested
      // Don't fetch tokens here as it will be handled separately based on the tab and filters
      if (isInitialLoad) {
        setIsInitialLoad(false);
        await fetchRelatedTokens(0, false); // Reset to first page on initial load
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch keyword details';
      setError('Failed to fetch keyword details. Please try again later.');
      console.error(errorMessage);
      
      // In development mode, create placeholder data
      if (process.env.NODE_ENV === 'development') {
        setKeywordData({
          keyword: {
            keyword: decodedKeyword,
            description: `${decodedKeyword} tokens and related projects`,
            createdAt: new Date().toISOString()
          },
          usages: {
            "30m": 5,
            "1h": 15,
            "3h": 45,
            "6h": 87,
            "12h": 153,
            "24h": 273
          },
          buyVolume: {
            "30m": 500,
            "1h": 1500,
            "3h": 3500,
            "6h": 5000,
            "12h": 7500,
            "24h": 9500
          },
          sellVolume: {
            "30m": 200,
            "1h": 600,
            "3h": 1400,
            "6h": 2000,
            "12h": 3000,
            "24h": 3800
          },
          calls: {
            "30m": 8,
            "1h": 25,
            "3h": 65,
            "6h": 120,
            "12h": 180,
            "24h": 320
          },
          averageMigrationDuration: 3600000, // 1 hour in milliseconds
          tokens: [
            {
              tokenAddress: "abc123",
              name: `${decodedKeyword} Token`,
              symbol: decodedKeyword.substring(0, 4).toUpperCase(),
              createdAt: new Date(Date.now() - 86400000).toISOString(),
              migratedAt: new Date(Date.now() - 43200000).toISOString()
            },
            {
              tokenAddress: "def456",
              name: `Super ${decodedKeyword}`,
              symbol: `S${decodedKeyword.substring(0, 3).toUpperCase()}`,
              createdAt: new Date(Date.now() - 172800000).toISOString()
            }
          ]
        });
      }
    } finally {
      setLoading(false);
    }
  }, [decodedKeyword, timePeriod, fetchRelatedTokens, isInitialLoad]);
  
  // Format volume for display
  const formatVolume = useCallback((volume: number): string => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(2)}K`;
    } else {
      return volume.toFixed(2);
    }
  }, []);
  
  // Get human-readable time period
  const getTimePeriodLabel = useCallback((period: TimePeriod): string => {
    switch (period) {
      case '30m': return '30 min';
      case '1h': return '1 hour';
      case '3h': return '3 hours';
      case '6h': return '6 hours';
      case '12h': return '12 hours';
      case '24h': return '24 hours';
    }
  }, []);
  
  // Format migration duration for display
  const formatMigrationDuration = useCallback((duration: number | undefined): string => {
    if (!duration) return 'N/A';
    
    const days = Math.floor(duration / (1000 * 60 * 60 * 24));
    const hours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      if (hours === 0) {
        return `${days}d`;
      } else {
        return `${days}d ${hours}h`;
      }
    } else if (hours > 0) {
      if (minutes === 0) {
        return `${hours}h`;
      } else {
        return `${hours}h ${minutes}m`;
      }
    } else {
      return `${minutes}m`;
    }
  }, []);
  
  // Format date for display
  const formatDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);
  
  // Calculate trend based on data
  const calculateTrend = useCallback((): 'hot' | 'rising' | 'cooling' => {
    if (!keywordData) return 'cooling';
    
    const buyVolume = keywordData.buyVolume || { '1h': 0, '3h': 0, '24h': 0 };
    const sellVolume = keywordData.sellVolume || { '1h': 0, '3h': 0, '24h': 0 };
    
    // Calculate total volume for each period
    const volume = {
      '1h': (buyVolume['1h'] || 0) + (sellVolume['1h'] || 0),
      '3h': (buyVolume['3h'] || 0) + (sellVolume['3h'] || 0),
      '24h': (buyVolume['24h'] || 0) + (sellVolume['24h'] || 0)
    };
    
    if (volume['1h'] > volume['3h'] / 3) {
      return 'hot';
    } else if (volume['3h'] > volume['24h'] / 8) {
      return 'rising';
    } else {
      return 'cooling';
    }
  }, [keywordData]);
  
  // Initial load on component mount
  useEffect(() => {
    let isMounted = true;
    
    const initialFetch = async () => {
      await fetchKeywordDetails();
      if (!isMounted) return;
    };
    
    initialFetch();
    
    return () => {
      isMounted = false;
    };
  }, [fetchKeywordDetails]);
  
  // Fetch when time period changes
  useEffect(() => {
    fetchKeywordDetails();
  }, [timePeriod, fetchKeywordDetails]);
  
  // Fix the useEffect for fetching tokens to be more efficient
  // Fetch tokens when tab, sort, or filter changes
  useEffect(() => {
    if (selectedTab === 'tokens' && !isInitialLoad) {
      console.log(`[Tokens] Tab is selected and not initial load - fetching tokens with filters`);
      setTokensLoading(true); // Set loading state first
      resetAndFetchTokens(true); // Reset pagination when filters change, loading already set
    }
  }, [selectedTab, sortBy, timePeriod, _onlyMigrated, resetAndFetchTokens, isInitialLoad]);
  
  // Note: We avoid duplicate requests to the API by:
  // 1. Only fetching tokens during initial load OR when the tokens tab is selected
  // 2. Using isInitialLoad flag to prevent double-fetching during initial page load
  // 3. Removing direct fetchRelatedTokens call from filter button click handlers
  // This ensures the "creations/of" endpoint is only called when necessary
  
  // Calculate buy and sell volume percentages for the volume bar
  const getVolumeBarWidths = useCallback(() => {
    if (!keywordData) {
      return {
        buyWidth: '50%',
        sellWidth: '50%',
        buyVolume: 0,
        sellVolume: 0
      };
    }
    
    // Get the buy and sell volumes for the selected time period
    const buyVolume = keywordData.buyVolume?.[timePeriod] || 0;
    const sellVolume = keywordData.sellVolume?.[timePeriod] || 0;
    const totalVolume = buyVolume + sellVolume;
    
    if (totalVolume === 0) {
      // If there's no volume, show equal parts (50/50)
      return {
        buyWidth: '50%',
        sellWidth: '50%',
        buyVolume: 0,
        sellVolume: 0
      };
    }
    
    // Calculate the relative proportions of buy and sell
    const buyProportion = buyVolume / totalVolume;
    const sellProportion = sellVolume / totalVolume;
    
    // Ensure each section has a minimum width for visibility
    // Only apply this if both volumes are non-zero
    let buyWidthPercent = buyProportion * 100;
    let sellWidthPercent = sellProportion * 100;
    
    if (buyVolume > 0 && sellVolume > 0) {
      // Ensure each section has at least 5% width for visibility
      const minWidth = 5;
      
      if (buyWidthPercent < minWidth) {
        buyWidthPercent = minWidth;
        sellWidthPercent = 100 - minWidth;
      } else if (sellWidthPercent < minWidth) {
        sellWidthPercent = minWidth;
        buyWidthPercent = 100 - minWidth;
      }
    }
    
    return {
      buyWidth: `${buyWidthPercent}%`,
      sellWidth: `${sellWidthPercent}%`,
      buyVolume,
      sellVolume
    };
  }, [keywordData, timePeriod]);
  
  const trend = calculateTrend();
  
  // Update the sort button click handlers
  const handleSortClick = useCallback((newSortBy: 'volume' | 'calls' | 'recent' | 'migration') => {
    setSortBy(newSortBy);
    
    // Set loading state first before clearing tokens
    setTokensLoading(true);
    // Small timeout to ensure loading state is rendered before clearing tokens
    setTimeout(() => {
      resetAndFetchTokens(true); // Pass true to indicate loading is already set
    }, 10);
  }, [sortBy, resetAndFetchTokens]);
  
  return (
    <PipBoyLayout>
      <div className="pip-border p-4 md:p-6 w-full h-full overflow-auto">
        {/* Header with back button and title */}
        <div className="flex justify-between items-center mb-6 border-b border-[var(--pip-glow-green)] pb-4">
          <div className="flex items-center">
            <Link href="/keywords" className="mr-4 text-[var(--pip-glow-green)] hover:text-white transition-colors">
              <FontAwesomeIcon 
                icon={faArrowLeft} 
                className="text-[var(--pip-glow-green)]" 
                style={{ width: '1.25rem', height: '1.25rem' }} 
              />
            </Link>
            <h2 className="text-2xl md:text-3xl text-[var(--pip-glow-green)] drop-shadow-[0_0_4px_var(--pip-glow-green)] flex items-center">
              <FontAwesomeIcon 
                icon={faHashtag} 
                className="mr-3 text-[var(--pip-glow-green)]" 
                style={{ width: '1.5rem', height: '1.5rem' }} 
              />
              {decodedKeyword.toUpperCase()}
            </h2>
          </div>
          
          {/* Time period selector */}
          <div className="hidden md:flex gap-2 justify-end ml-auto">
            {(['30m', '1h', '3h', '6h', '12h', '24h'] as TimePeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => {
                  if (selectedTab === 'tokens') {
                    setTokensLoading(true);
                  }
                  setTimePeriod(period);
                }}
                className={`border border-[var(--pip-glow-green)] px-2 py-1 text-xs rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors ${timePeriod === period ? 'bg-[rgba(0,255,0,0.2)]' : ''}`}
              >
                {getTimePeriodLabel(period)}
              </button>
            ))}
          </div>
        </div>
        
        {/* Mobile time period selector */}
        <div className="md:hidden mb-4">
          <div className="grid grid-cols-6 gap-1">
            {(['30m', '1h', '3h', '6h', '12h', '24h'] as TimePeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => {
                  if (selectedTab === 'tokens') {
                    setTokensLoading(true);
                  }
                  setTimePeriod(period);
                }}
                className={`border border-[var(--pip-glow-green)] px-1 py-1 text-xs rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors ${timePeriod === period ? 'bg-[rgba(0,255,0,0.2)]' : ''}`}
              >
                {getTimePeriodLabel(period)}
              </button>
            ))}
          </div>
        </div>
        
        {/* Tab navigation */}
        <div className="mb-6 border-b border-[var(--pip-glow-green)]">
          <div className="flex">
            <button
              onClick={() => setSelectedTab('overview')}
              className={`px-4 py-2 text-sm font-medium ${selectedTab === 'overview' ? 'border-b-2 border-[var(--pip-glow-green)] text-[var(--pip-glow-green)]' : 'text-gray-400 hover:text-white'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setSelectedTab('tokens')}
              className={`px-4 py-2 text-sm font-medium ${selectedTab === 'tokens' ? 'border-b-2 border-[var(--pip-glow-green)] text-[var(--pip-glow-green)]' : 'text-gray-400 hover:text-white'}`}
            >
              Related Tokens
            </button>
          </div>
        </div>
        
        {/* Loading state */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FontAwesomeIcon 
              icon={faSpinner} 
              className="text-4xl text-[var(--pip-glow-green)] animate-spin mb-4"
              style={{ width: '1.5rem', height: '1.5rem' }}
            />
            <p className="text-[var(--pip-glow-green)]">Loading keyword details...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FontAwesomeIcon 
              icon={faExclamationTriangle} 
              className="text-4xl text-yellow-400 mb-4"
              style={{ width: '1.5rem', height: '1.5rem' }}
            />
            <p className="text-yellow-400 mb-2">{error}</p>
            <button 
              onClick={() => fetchKeywordDetails()} 
              className="mt-4 border border-[var(--pip-glow-green)] px-3 py-1 text-xs rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors"
            >
              <FontAwesomeIcon icon={faSpinner} className="mr-2" style={{ width: '0.75rem', height: '0.75rem' }} />
              Try Again
            </button>
          </div>
        ) : keywordData ? (
          <div>
            {selectedTab === 'overview' ? (
              /* Overview Tab Content */
              <div>
                {/* Keyword Information */}
                <div className="mb-8 border border-[var(--pip-glow-green)] rounded p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl text-white drop-shadow-[0_0_2px_var(--pip-glow-green)] mb-1">
                        #{keywordData.keyword.keyword.toUpperCase()}
                      </h3>
                      <p className="text-sm text-gray-300">{keywordData.keyword.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs flex items-center justify-end mb-1">
                        <FontAwesomeIcon icon={faCalendarAlt} className="mr-1" style={{ width: '0.75rem', height: '0.75rem' }} />
                        First seen: {formatDate(keywordData.keyword.createdAt)}
                      </div>
                      <div className="text-sm">
                        {trend === 'hot' ? (
                          <span className="bg-green-900 bg-opacity-30 text-green-400 px-2 py-1 rounded-full text-xs flex items-center justify-center">
                            <FontAwesomeIcon icon={faFire} className="mr-1" style={{ width: '0.75rem', height: '0.75rem' }} />
                            Hot
                          </span>
                        ) : trend === 'rising' ? (
                          <span className="bg-yellow-900 bg-opacity-30 text-yellow-400 px-2 py-1 rounded-full text-xs flex items-center justify-center">
                            <FontAwesomeIcon icon={faArrowUp} className="mr-1" style={{ width: '0.75rem', height: '0.75rem' }} />
                            Rising
                          </span>
                        ) : (
                          <span className="bg-gray-900 bg-opacity-30 text-gray-400 px-2 py-1 rounded-full text-xs flex items-center justify-center">
                            <FontAwesomeIcon icon={faArrowDown} className="mr-1" style={{ width: '0.75rem', height: '0.75rem' }} />
                            Cooling
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Volume Section */}
                  <div className="mb-6">
                    <h4 className="text-sm text-[var(--pip-glow-green)] mb-2 flex items-center">
                      <FontAwesomeIcon icon={faChartLine} className="mr-2" style={{ width: '0.875rem', height: '0.875rem' }} />
                      Volume ({getTimePeriodLabel(timePeriod)})
                    </h4>
                    
                    {/* Updated Volume Bar */}
                    <div className="w-full bg-[rgba(0,0,0,0.5)] border border-[var(--pip-glow-green)] rounded h-6 overflow-hidden flex relative shadow-[0_0_8px_rgba(0,255,0,0.3)_inset] shadow-inner mb-2 text-xs font-bold">
                      {(() => {
                        const { buyWidth, sellWidth, buyVolume, sellVolume } = getVolumeBarWidths();
                        const totalVolume = buyVolume + sellVolume;
                        const buyPercent = totalVolume > 0 ? (buyVolume / totalVolume * 100) : 50;
                        const sellPercent = totalVolume > 0 ? (sellVolume / totalVolume * 100) : 50;
                        const showDivider = buyVolume > 0 && sellVolume > 0;
                        
                        // Determine rocket color based on percentages
                        const rocketColorClass = 
                          buyPercent > sellPercent ? 'text-[var(--pip-glow-green)]' : 
                          buyPercent < sellPercent ? 'text-red-500' : 
                          'text-white'; // Equal case

                        return (
                          <React.Fragment>
                            {/* Buy Section */}
                            <div 
                              className="bg-green-700 h-full flex items-center justify-center text-white relative px-2 z-0"
                              style={{ 
                                width: buyWidth,
                                transition: 'width 0.3s ease-in-out'
                              }}
                              title={`Buy Volume: ${formatVolume(buyVolume)} (${buyPercent.toFixed(1)}%)`}
                            >
                              <FontAwesomeIcon icon={faArrowUp} className="mr-1 text-white" style={{ width: '0.65rem', height: '0.65rem' }} /> 
                              <span className="z-10 relative drop-shadow-[1px_1px_1px_rgba(0,0,0,0.5)] mr-1">BUY</span>
                              <span className="z-10 relative">{buyPercent.toFixed(0)}%</span>
                            </div>
                            
                            {/* Sell Section */}
                            <div 
                              className="bg-red-700 h-full flex items-center justify-center text-white relative px-2 z-0"
                              style={{ 
                                width: sellWidth,
                                transition: 'width 0.3s ease-in-out'
                              }}
                              title={`Sell Volume: ${formatVolume(sellVolume)} (${sellPercent.toFixed(1)}%)`}
                            >
                              <FontAwesomeIcon icon={faArrowDown} className="mr-1 text-white" style={{ width: '0.65rem', height: '0.65rem' }} />
                              <span className="z-10 relative drop-shadow-[1px_1px_1px_rgba(0,0,0,0.5)] mr-1">SELL</span>
                              <span className="z-10 relative">{sellPercent.toFixed(0)}%</span>
                            </div>

                            {/* Dynamic Divider with Rocket Icon - Conditionally colored */}        
                            {showDivider && (
                              <div
                                className="absolute top-0 bottom-0 w-4 flex items-center justify-center z-10"
                                style={{ 
                                  left: buyWidth, 
                                  transform: 'translateX(-50%)',
                                }}
                              >
                                <FontAwesomeIcon 
                                  icon={faRocket} 
                                  className={`${rocketColorClass} drop-shadow-[0_0_3px_var(--pip-glow-green)]`} // Apply conditional color class
                                  style={{ width: '0.75rem', height: '0.75rem' }} 
                                />
                              </div>
                            )}

                            {/* Fixed 50% Marker */}
                            <div
                              className="absolute top-0 bottom-0 w-px bg-[rgba(0,255,0,0.4)] z-[5]" 
                              style={{
                                left: '50%',
                                transform: 'translateX(-50%)',
                                boxShadow: '0 0 2px rgba(0, 255, 0, 0.3)'
                              }}
                              title="50% Mark"
                            ></div>
                          </React.Fragment>
                        );
                      })()}
                    </div>
                    
                    <div className="flex justify-between text-sm mt-1">
                      <div>
                        <span className="text-[var(--pip-glow-green)] font-medium">Buy: </span>
                        <span className="text-white flex items-center">
                          <svg 
                            width="14" 
                            height="14" 
                            viewBox="0 0 24 20" 
                            className="mr-1 text-[var(--pip-glow-green)]"
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
                          {formatVolume(keywordData.buyVolume?.[timePeriod] || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--pip-glow-green)] font-medium">Total: </span>
                        <span className="text-white flex items-center">
                          <svg 
                            width="14" 
                            height="14" 
                            viewBox="0 0 24 20" 
                            className="mr-1 text-[var(--pip-glow-green)]"
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
                          {formatVolume((keywordData.buyVolume?.[timePeriod] || 0) + (keywordData.sellVolume?.[timePeriod] || 0))}
                        </span>
                      </div>
                      <div>
                        <span className="text-red-500 font-medium">Sell: </span>
                        <span className="text-white flex items-center">
                          <svg 
                            width="14" 
                            height="14" 
                            viewBox="0 0 24 20" 
                            className="mr-1 text-red-400"
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
                          {formatVolume(keywordData.sellVolume?.[timePeriod] || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Usage Stats */}
                    <div className="border border-[var(--pip-glow-green)] rounded p-3">
                      <h4 className="text-sm text-[var(--pip-glow-green)] mb-2 flex items-center">
                        <FontAwesomeIcon icon={faUsers} className="mr-2" style={{ width: '0.875rem', height: '0.875rem' }} />
                        Usage
                      </h4>
                      <div className="text-2xl font-bold text-white mb-2">
                        {keywordData?.usages?.[timePeriod] || 0}
                      </div>
                      <div className="text-xs text-gray-400">
                        Mentions in {getTimePeriodLabel(timePeriod)}
                      </div>
                    </div>
                    
                    {/* Calls Stats */}
                    <div className="border border-[var(--pip-glow-green)] rounded p-3">
                      <h4 className="text-sm text-[var(--pip-glow-green)] mb-2 flex items-center">
                        <FontAwesomeIcon icon={faBullhorn} className="mr-2" style={{ width: '0.875rem', height: '0.875rem' }} />
                        Calls
                      </h4>
                      <div className="text-2xl font-bold text-white mb-2">
                        {keywordData?.callCounts?.[timePeriod] || keywordData?.calls?.[timePeriod] || 0}
                      </div>
                      <div className="text-xs text-gray-400">
                        Call posts in {getTimePeriodLabel(timePeriod)}
                      </div>
                    </div>
                    
                    {/* Volume Stats */}
                    <div className="border border-[var(--pip-glow-green)] rounded p-3">
                      <h4 className="text-sm text-[var(--pip-glow-green)] mb-2 flex items-center">
                        <FontAwesomeIcon icon={faChartLine} className="mr-2" style={{ width: '0.875rem', height: '0.875rem' }} />
                        Volume
                      </h4>
                      <div className="text-2xl font-bold text-white mb-2 flex items-center">
                        <svg 
                          width="14" 
                          height="14" 
                          viewBox="0 0 24 20" 
                          className="mr-1 text-[var(--pip-glow-green)]"
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
                        {formatVolume((keywordData?.buyVolume?.[timePeriod] || 0) + (keywordData?.sellVolume?.[timePeriod] || 0))}
                      </div>
                      <div className="text-xs text-gray-400">
                        Total in {getTimePeriodLabel(timePeriod)}
                      </div>
                    </div>
                    
                    {/* Migration Speed */}
                    <div className="border border-[var(--pip-glow-green)] rounded p-3">
                      <h4 className="text-sm text-[var(--pip-glow-green)] mb-2 flex items-center">
                        <FontAwesomeIcon icon={faClock} className="mr-2" style={{ width: '0.875rem', height: '0.875rem' }} />
                        Migration Speed
                      </h4>
                      <div className="text-2xl font-bold text-white mb-2">
                        {formatMigrationDuration(keywordData?.averageMigrationDuration)}
                      </div>
                      <div className="text-xs text-gray-400">
                        Average time to token migration
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Time Period Analysis */}
                <div className="mb-8 border border-[var(--pip-glow-green)] rounded p-4">
                  <h3 className="text-lg text-[var(--pip-glow-green)] mb-4 flex items-center">
                    <FontAwesomeIcon icon={faChartLine} className="mr-2" style={{ width: '1rem', height: '1rem' }} />
                    Historical Data
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--pip-glow-green)] border-opacity-50">
                          <th className="text-left py-2 px-3">Time Period</th>
                          <th className="text-right py-2 px-3">Volume</th>
                          <th className="text-right py-2 px-3">Usage</th>
                          <th className="text-right py-2 px-3">Calls</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(['30m', '1h', '3h', '6h', '12h', '24h'] as TimePeriod[]).map((period) => {
                          const totalVolume = (keywordData?.buyVolume?.[period] || 0) + (keywordData?.sellVolume?.[period] || 0);
                          return (
                            <tr 
                              key={period} 
                              className={`border-b border-gray-800 hover:bg-[rgba(0,255,0,0.05)] ${period === timePeriod ? 'bg-[rgba(0,255,0,0.1)]' : ''}`}
                            >
                              <td className="py-2 px-3">{getTimePeriodLabel(period)}</td>
                              <td className="text-right py-2 px-3">
                                <div className="flex items-center justify-end">
                                  <svg 
                                    width="14" 
                                    height="14" 
                                    viewBox="0 0 24 20" 
                                    className="mr-1 text-[var(--pip-glow-green)]"
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
                                  {formatVolume(totalVolume)}
                                </div>
                              </td>
                              <td className="text-right py-2 px-3">{keywordData?.usages?.[period] || 0}</td>
                              <td className="text-right py-2 px-3">{keywordData?.callCounts?.[period] || keywordData?.calls?.[period] || 0}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Related Calls Section */}
                <div className="mb-8 border border-[var(--pip-glow-green)] rounded p-4">
                  <h3 className="text-lg text-[var(--pip-glow-green)] mb-4 flex items-center">
                    <FontAwesomeIcon icon={faBullhorn} className="mr-2" style={{ width: '1rem', height: '1rem' }} />
                    Related Calls
                  </h3>
                  
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm text-[var(--pip-glow-green)]">Call Activity</h4>
                      <div className="text-xs text-gray-400">
                        Last {getTimePeriodLabel(timePeriod)}
                      </div>
                    </div>
                    
                    <div className="w-full bg-[rgba(0,255,0,0.1)] rounded-full h-3 overflow-hidden shadow-inner mb-2">
                      <div 
                        className="bg-[var(--pip-glow-green)] h-3 rounded-full" 
                        style={{ 
                          width: `${Math.min(((keywordData?.callCounts?.[timePeriod] || keywordData?.calls?.[timePeriod] || 0) / 150 * 100), 100)}%`
                        }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>0</span>
                      <span>50</span>
                      <span>100</span>
                      <span>150+</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="border border-[var(--pip-glow-green)] rounded p-3">
                      <h4 className="text-sm text-[var(--pip-glow-green)] mb-2">Call Metrics</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Calls:</span>
                          <span className="text-white">{keywordData?.callCounts?.[timePeriod] || keywordData?.calls?.[timePeriod] || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Avg. Volume per Call:</span>
                          <span className="text-white flex items-center">
                            <svg 
                              width="12" 
                              height="12" 
                              viewBox="0 0 24 20" 
                              className="mr-1 text-[var(--pip-glow-green)]"
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
                            {formatVolume(
                              (keywordData?.callCounts?.[timePeriod] || keywordData?.calls?.[timePeriod] || 0) > 0
                                ? ((keywordData?.buyVolume?.[timePeriod] || 0) + (keywordData?.sellVolume?.[timePeriod] || 0)) / 
                                  (keywordData?.callCounts?.[timePeriod] || keywordData?.calls?.[timePeriod] || 1)
                                : 0
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Call Trend:</span>
                          <span className={`${
                            (keywordData?.callCounts?.['1h'] || keywordData?.calls?.['1h'] || 0) > 
                            (keywordData?.callCounts?.['3h'] || keywordData?.calls?.['3h'] || 0) / 3
                              ? 'text-green-400'
                              : (keywordData?.callCounts?.['6h'] || keywordData?.calls?.['6h'] || 0) > 
                                (keywordData?.callCounts?.['24h'] || keywordData?.calls?.['24h'] || 0) / 4
                                ? 'text-yellow-400'
                                : 'text-gray-400'
                          }`}>
                            {(keywordData?.callCounts?.['1h'] || keywordData?.calls?.['1h'] || 0) > 
                             (keywordData?.callCounts?.['3h'] || keywordData?.calls?.['3h'] || 0) / 3
                              ? 'Increasing'
                              : (keywordData?.callCounts?.['6h'] || keywordData?.calls?.['6h'] || 0) > 
                                (keywordData?.callCounts?.['24h'] || keywordData?.calls?.['24h'] || 0) / 4
                                ? 'Steady'
                                : 'Decreasing'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Tokens Tab Content */
              <div>
                <div className="mb-6 px-2">
                  <h3 className="text-lg text-[var(--pip-glow-green)] flex items-center mb-3">
                    <FontAwesomeIcon icon={faCoins} className="mr-2" style={{ width: '1rem', height: '1rem' }} />
                    Related Tokens
                  </h3>
                  
                  {/* Description and filters container with improved layout */}
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    {/* Description with more space */}
                    <div className="max-w-full lg:max-w-[40%] lg:pr-4">
                      <p className="text-sm text-gray-300">
                        Tokens associated with the {keywordData.keyword.keyword.toUpperCase()} keyword
                      </p>
                    </div>
                    
                    {/* Filter controls container - right aligned on desktop */}
                    <div className="w-full lg:w-auto lg:ml-auto">
                      {/* All filters in a single row */}
                      <div className="flex flex-wrap gap-4 items-center justify-end">
                        {/* Sort Options */}
                        <div className="filter-group">
                          <div className="text-xs text-gray-400 mb-1.5 font-medium">Sort by</div>
                          <div className="flex flex-wrap gap-1.5">
                            <button 
                              onClick={() => handleSortClick('volume')}
                              className={`px-2 py-1 text-xs rounded-md border transition-all flex items-center ${
                                sortBy === 'volume' 
                                  ? 'border-[var(--pip-glow-green)] bg-[rgba(0,255,0,0.15)] text-white shadow-[0_0_5px_rgba(0,255,0,0.2)]' 
                                  : 'border-gray-700 hover:border-[var(--pip-glow-green)] hover:bg-[rgba(0,255,0,0.05)]'
                              }`}
                              title="Sort by trading volume"
                            >
                              <FontAwesomeIcon icon={faChartLine} className="mr-1" style={{ width: '0.75rem', height: '0.75rem' }} />
                              Volume
                            </button>
                            <button 
                              onClick={() => handleSortClick('calls')}
                              className={`px-2 py-1 text-xs rounded-md border transition-all flex items-center ${
                                sortBy === 'calls' 
                                  ? 'border-[var(--pip-glow-green)] bg-[rgba(0,255,0,0.15)] text-white shadow-[0_0_5px_rgba(0,255,0,0.2)]' 
                                  : 'border-gray-700 hover:border-[var(--pip-glow-green)] hover:bg-[rgba(0,255,0,0.05)]'
                              }`}
                              title="Sort by call frequency"
                            >
                              <FontAwesomeIcon icon={faBullhorn} className="mr-1" style={{ width: '0.75rem', height: '0.75rem' }} />
                              Calls
                            </button>
                            <button 
                              onClick={() => handleSortClick('migration')}
                              className={`px-2 py-1 text-xs rounded-md border transition-all flex items-center ${
                                sortBy === 'migration' 
                                  ? 'border-[var(--pip-glow-green)] bg-[rgba(0,255,0,0.15)] text-white shadow-[0_0_5px_rgba(0,255,0,0.2)]' 
                                  : 'border-gray-700 hover:border-[var(--pip-glow-green)] hover:bg-[rgba(0,255,0,0.05)]'
                              }`}
                              title="Sort by migration speed"
                            >
                              <FontAwesomeIcon icon={faCoins} className="mr-1" style={{ width: '0.75rem', height: '0.75rem' }} />
                              Migration
                            </button>
                            <button 
                              onClick={() => handleSortClick('recent')}
                              className={`px-2 py-1 text-xs rounded-md border transition-all flex items-center ${
                                sortBy === 'recent' 
                                  ? 'border-[var(--pip-glow-green)] bg-[rgba(0,255,0,0.15)] text-white shadow-[0_0_5px_rgba(0,255,0,0.2)]' 
                                  : 'border-gray-700 hover:border-[var(--pip-glow-green)] hover:bg-[rgba(0,255,0,0.05)]'
                              }`}
                              title="Sort by creation date"
                            >
                              <FontAwesomeIcon icon={faClock} className="mr-1" style={{ width: '0.75rem', height: '0.75rem' }} />
                              Recent
                            </button>
                          </div>
                        </div>
                        
                        {/* View Toggle */}
                        <div className="filter-group">
                          <div className="text-xs text-gray-400 mb-1.5 font-medium">View</div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setTokenView('table')}
                              className={`px-2 py-1 text-xs rounded-md border transition-all flex items-center ${
                                tokenView === 'table'
                                  ? 'border-[var(--pip-glow-green)] bg-[rgba(0,255,0,0.15)] text-white shadow-[0_0_5px_rgba(0,255,0,0.2)]'
                                  : 'border-gray-700 hover:border-[var(--pip-glow-green)] hover:bg-[rgba(0,255,0,0.05)]'
                              }`}
                              title="Table view"
                            >
                              <FontAwesomeIcon icon={faTable} className="mr-1" style={{ width: '0.75rem', height: '0.75rem' }} />
                              Table
                            </button>
                            <button
                              onClick={() => setTokenView('grid')}
                              className={`px-2 py-1 text-xs rounded-md border transition-all flex items-center ${
                                tokenView === 'grid'
                                  ? 'border-[var(--pip-glow-green)] bg-[rgba(0,255,0,0.15)] text-white shadow-[0_0_5px_rgba(0,255,0,0.2)]'
                                  : 'border-gray-700 hover:border-[var(--pip-glow-green)] hover:bg-[rgba(0,255,0,0.05)]'
                              }`}
                              title="Grid view"
                            >
                              <FontAwesomeIcon icon={faThLarge} className="mr-1" style={{ width: '0.75rem', height: '0.75rem' }} />
                              Grid
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {tokensLoading ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <FontAwesomeIcon 
                      icon={faSpinner} 
                      className="text-3xl text-[var(--pip-glow-green)] animate-spin mb-3"
                      style={{ width: '1.25rem', height: '1.25rem' }}
                    />
                    <p className="text-[var(--pip-glow-green)]">Loading related tokens...</p>
                  </div>
                ) : tokensError ? (
                  <div className="border border-[var(--pip-glow-green)] rounded p-6 text-center">
                    <FontAwesomeIcon 
                      icon={faExclamationTriangle} 
                      className="text-3xl text-yellow-400 mb-3"
                      style={{ width: '1.25rem', height: '1.25rem' }}
                    />
                    <p className="text-yellow-400 mb-2">{tokensError}</p>
                    <button 
                      onClick={() => resetAndFetchTokens()} 
                      className="mt-3 border border-[var(--pip-glow-green)] px-3 py-1 text-xs rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors"
                    >
                      <FontAwesomeIcon icon={faSpinner} className="mr-2" style={{ width: '0.75rem', height: '0.75rem' }} />
                      Try Again
                    </button>
                  </div>
                ) : keywordData.tokens && keywordData.tokens.length > 0 ? (
                  <div className="border border-[var(--pip-glow-green)] rounded overflow-hidden">
                    {tokenView === 'table' ? (
                      <>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--pip-glow-green)] bg-[rgba(0,255,0,0.1)]">
                            <th className="text-left py-3 px-4">Token</th>
                            <th className="text-left py-3 px-4 hidden md:table-cell">Symbol</th>
                              <th className="text-right py-3 px-4 hidden md:table-cell">Volume ({getTimePeriodLabel(timePeriod)})</th>
                              <th className="text-right py-3 px-4 hidden md:table-cell">Buy/Sell Ratio</th>
                              <th className="text-right py-3 px-4 hidden md:table-cell">Calls</th>
                            <th className="text-right py-3 px-4">Created</th>
                              <th className="text-right py-3 px-4">Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {keywordData.tokens
                              .sort((a, b) => {
                                const aVol = (a.buyVolume?.[timePeriod] || 0) + (a.sellVolume?.[timePeriod] || 0);
                                const bVol = (b.buyVolume?.[timePeriod] || 0) + (b.sellVolume?.[timePeriod] || 0);
                                
                                const aCreated = new Date(a.createdAt).getTime();
                                const bCreated = new Date(b.createdAt).getTime();
                                
                                const aCalls = a.calls?.[timePeriod] || 0;
                                const bCalls = b.calls?.[timePeriod] || 0;
                                
                                const aMigration = a.migratedAt ? new Date(a.migratedAt).getTime() : 0;
                                const bMigration = b.migratedAt ? new Date(b.migratedAt).getTime() : 0;

                                // Apply sorting based on selected criteria
                                if (sortBy === 'volume') {
                                  return bVol - aVol;
                                } else if (sortBy === 'recent') {
                                  return bCreated - aCreated;
                                } else if (sortBy === 'calls') {
                                  return bCalls - aCalls;
                                } else if (sortBy === 'migration') {
                                  return bMigration - aMigration;
                                }
                                
                                return 0;
                              })
                              .map((token, index) => {
                                  // Token row rendering remains the same
                                const buyVol = token.buyVolume?.[timePeriod] || 0;
                                const sellVol = token.sellVolume?.[timePeriod] || 0;
                                const totalVol = buyVol + sellVol;
                                const buyRatio = totalVol > 0 ? (buyVol / totalVol) * 100 : 50;
                                
                                return (
                              <tr 
                                key={index} 
                                className="border-b border-gray-800 hover:bg-[rgba(0,255,0,0.05)] transition-colors"
                              >
                                <td className="py-3 px-4">
                                        {/* Token cell content */}
                                  <div className="flex items-center">
                                          {token.image ? (
                                            <img 
                                              src={token.image} 
                                              alt={token.name} 
                                              className="w-6 h-6 rounded-full mr-2 object-cover"
                                              onError={() => {
                                                // Update tokens if image fails to load
                                                const updatedTokens = keywordData.tokens?.map(t => 
                                                  t.tokenAddress === token.tokenAddress 
                                                    ? { ...t, image: undefined } 
                                                    : t
                                                );
                                                if (updatedTokens && keywordData) {
                                                  setKeywordData({ ...keywordData, tokens: updatedTokens });
                                                }
                                              }}
                                            />
                                          ) : (
                                            <div 
                                              className="w-6 h-6 rounded-full bg-[rgba(0,255,0,0.1)] flex items-center justify-center mr-2"
                                            >
                                      <span className="text-xs text-[var(--pip-glow-green)]">
                                        {token.symbol.charAt(0)}
                                      </span>
                                    </div>
                                          )}
                                          <div>
                                            {/* Token name and links */}
                                            <div className="flex items-center">
                                    <span className="text-white">{token.name}</span>
                                              <div className="flex ml-3 space-x-3">
                                                {/* Social links */}
                                                <a 
                                                  href={`https://pump.fun/coin/${token.tokenAddress}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-[var(--pip-glow-green)] hover:text-white transition-colors"
                                                  title="Pump.fun"
                                                >
                                                  <FontAwesomeIcon icon={faCoins} className="w-3 h-3" />
                                                </a>
                                                {token.twitter && (
                                                  <a 
                                                    href={token.twitter.startsWith('http') ? token.twitter : `https://twitter.com/${token.twitter.replace('@', '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[var(--pip-glow-green)] hover:text-white transition-colors"
                                                    title="Twitter"
                                                  >
                                                    <FontAwesomeIcon icon={fabTwitter} className="w-3 h-3" />
                                                  </a>
                                                )}
                                                {token.website && (
                                                  <a 
                                                    href={token.website.startsWith('http') ? token.website : `https://${token.website}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[var(--pip-glow-green)] hover:text-white transition-colors"
                                                    title="Website"
                                                  >
                                                    <FontAwesomeIcon icon={faGlobe} className="w-3 h-3" />
                                                  </a>
                                                )}
                                                {token.telegram && (
                                                  <a 
                                                    href={token.telegram.startsWith('http') ? token.telegram : `https://t.me/${token.telegram.replace('@', '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[var(--pip-glow-green)] hover:text-white transition-colors"
                                                    title="Telegram"
                                                  >
                                                    <FontAwesomeIcon icon={fabTelegram} className="w-3 h-3" />
                                                  </a>
                                                )}
                                              </div>
                                            </div>
                                            {token.description ? (
                                              <span className="text-xs text-gray-400 block truncate max-w-[200px]">
                                                {token.description}
                                              </span>
                                            ) : null}
                                          </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4 hidden md:table-cell text-gray-300">{token.symbol}</td>
                                <td className="py-3 px-4 text-right hidden md:table-cell">
                                        {totalVol > 0 ? (
                                  <div className="flex items-center justify-end">
                                    <svg 
                                          width="14" 
                                          height="14" 
                                    viewBox="0 0 24 20" 
                                    className="mr-1 text-[var(--pip-glow-green)]"
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
                                        {formatVolume(totalVol)}
                                  </div>
                                ) : (
                                  <span className="text-gray-500">N/A</span>
                                )}
                              </td>
                                    <td className="py-3 px-4 text-right hidden md:table-cell">
                                      {totalVol > 0 ? (
                                        <div>
                                          <div className="w-full bg-[rgba(255,0,0,0.2)] rounded-full h-1.5 overflow-hidden flex shadow-inner mb-1">
                                            <div 
                                              className="bg-[var(--pip-glow-green)] h-1.5 rounded-full" 
                                              style={{ width: `${buyRatio}%` }}
                                            ></div>
                                          </div>
                                          <div className="text-xs flex justify-between">
                                            <span className="text-[var(--pip-glow-green)]">{buyRatio.toFixed(0)}%</span>
                                            <span className="text-red-400">{(100 - buyRatio).toFixed(0)}%</span>
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-gray-500">-</span>
                              )}
                            </td>
                                    <td className="py-3 px-4 text-right hidden md:table-cell">
                                      {token.calls?.[timePeriod] || 0}
                                    </td>
                                    <td className="py-3 px-4 text-right text-gray-300">{formatDate(token.createdAt)}</td>
                                    <td className="py-3 px-4 text-right">
                                      <Link 
                                        href={`/creation/${token.tokenAddress}`}
                                        className="inline-flex items-center text-[var(--pip-glow-green)] hover:text-white transition-colors"
                                      >
                                        <span className="mr-1">View</span>
                                        <FontAwesomeIcon icon={faExternalLinkAlt} className="w-3 h-3" />
                                      </Link>
                                    </td>
                                </tr>
                                    );
                                  })}
                        </tbody>
                      </table>
                        
                        {/* Pagination Controls for Table View */}
                        <div className="flex justify-center items-center p-4 border-t border-gray-800">
                          {tokensLoading && currentPage > 0 ? (
                            <div className="flex items-center text-[var(--pip-glow-green)]">
                              <FontAwesomeIcon 
                                icon={faSpinner} 
                                className="animate-spin mr-2"
                                style={{ width: '0.875rem', height: '0.875rem' }}
                              />
                              Loading more tokens...
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <div className="flex gap-2">
                                {currentPage > 0 && (
                                  <button
                                    onClick={() => {
                                      setCurrentPage(prev => prev - 1);
                                      fetchRelatedTokens(currentPage - 1, false);
                                    }}
                                    className="border border-[var(--pip-glow-green)] px-4 py-2 rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors flex items-center"
                                    disabled={tokensLoading}
                                  >
                                    <FontAwesomeIcon 
                                      icon={faArrowLeft} 
                                      className="mr-2"
                                      style={{ width: '0.75rem', height: '0.75rem' }}
                                    />
                                    <span>Previous</span>
                                  </button>
                                )}
                                <div className="flex items-center px-3">
                                  <span className="text-[var(--pip-glow-green)]">Page: {currentPage + 1}</span>
                                </div>
                                {hasMoreTokens && (
                                  <button
                                    onClick={loadMoreTokens}
                                    className="border border-[var(--pip-glow-green)] px-4 py-2 rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors flex items-center"
                                    disabled={tokensLoading}
                                  >
                                    <span>Next</span>
                                    <FontAwesomeIcon 
                                      icon={faArrowRight} 
                                      className="ml-2"
                                      style={{ width: '0.75rem', height: '0.75rem' }}
                                    />
                                  </button>
                                )}
                              </div>
                              {!hasMoreTokens && keywordData.tokens && keywordData.tokens.length > 0 && (
                                <span className="text-gray-500 text-sm mt-2">No more tokens to load</span>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Grid view - content stays the same */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                        {keywordData.tokens
                          .sort((a, b) => {
                            const aVol = (a.buyVolume?.[timePeriod] || 0) + (a.sellVolume?.[timePeriod] || 0);
                            const bVol = (b.buyVolume?.[timePeriod] || 0) + (b.sellVolume?.[timePeriod] || 0);
                            
                            const aCreated = new Date(a.createdAt).getTime();
                            const bCreated = new Date(b.createdAt).getTime();
                            
                            const aCalls = a.calls?.[timePeriod] || 0;
                            const bCalls = b.calls?.[timePeriod] || 0;
                            
                            const aMigration = a.migratedAt ? new Date(a.migratedAt).getTime() : 0;
                            const bMigration = b.migratedAt ? new Date(b.migratedAt).getTime() : 0;

                            // Apply sorting based on selected criteria
                            if (sortBy === 'volume') {
                              return bVol - aVol;
                            } else if (sortBy === 'recent') {
                              return bCreated - aCreated;
                            } else if (sortBy === 'calls') {
                              return bCalls - aCalls;
                            } else if (sortBy === 'migration') {
                              return bMigration - aMigration;
                            }
                            
                            return 0;
                          })
                          .map((token, index) => {
                              // Same token card code
                            const buyVol = token.buyVolume?.[timePeriod] || 0;
                            const sellVol = token.sellVolume?.[timePeriod] || 0;
                            const totalVol = buyVol + sellVol;
                            const buyRatio = totalVol > 0 ? (buyVol / totalVol) * 100 : 50;
                            const calls = token.calls?.[timePeriod] || 0;
                            
                            return (
                              <div key={index} className="border border-[var(--pip-glow-green)] rounded-lg p-4 bg-[rgba(0,0,0,0.4)] hover:bg-[rgba(0,255,0,0.05)] transition-colors flex flex-col h-full">
                                {/* Token header with image */}
                                <div className="flex items-center mb-3">
                                  {token.image ? (
                                    <img 
                                      src={token.image} 
                                      alt={token.name} 
                                      className="w-8 h-8 rounded-full mr-3 object-cover"
                                      onError={() => {
                                        const updatedTokens = keywordData.tokens?.map(t => 
                                          t.tokenAddress === token.tokenAddress 
                                            ? { ...t, image: undefined } 
                                            : t
                                        );
                                        if (updatedTokens && keywordData) {
                                          setKeywordData({ ...keywordData, tokens: updatedTokens });
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-[rgba(0,255,0,0.1)] flex items-center justify-center mr-3">
                                      <span className="text-sm text-[var(--pip-glow-green)]">
                                        {token.symbol.charAt(0)}
                                      </span>
                                    </div>
                                  )}
                                  <div>
                                    <h4 className="text-white font-medium">{token.name}</h4>
                                    <span className="text-xs text-gray-400">{token.symbol}</span>
                                  </div>
                                </div>
                                
                                {/* Stats */}
                                <div className="space-y-2 mb-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-400">Volume</span>
                                    <span className="text-sm text-white flex items-center">
                                      <svg 
                                        width="12" 
                                        height="12" 
                                        viewBox="0 0 24 20" 
                                        className="mr-1 text-[var(--pip-glow-green)]"
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
                                      {formatVolume(totalVol)}
                                    </span>
                                  </div>
                                  
                                  {totalVol > 0 && (
                                    <div>
                                      <div className="w-full bg-[rgba(255,0,0,0.2)] rounded-full h-1.5 overflow-hidden flex shadow-inner mb-1">
                                        <div 
                                          className="bg-[var(--pip-glow-green)] h-1.5 rounded-full" 
                                          style={{ width: `${buyRatio}%` }}
                                        ></div>
                                      </div>
                                      <div className="text-xs flex justify-between">
                                        <span className="text-[var(--pip-glow-green)]">{buyRatio.toFixed(0)}%</span>
                                        <span className="text-red-400">{(100 - buyRatio).toFixed(0)}%</span>
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-400">Calls</span>
                                    <span className="text-sm text-white">{calls}</span>
                                  </div>
                                  
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-400">Created</span>
                                    <span className="text-sm text-gray-300">{formatDate(token.createdAt)}</span>
                                  </div>
                                </div>
                                
                                {/* Links */}
                                <div className="mt-auto pt-3 border-t border-gray-800">
                                  <div className="flex justify-between items-center">
                                    <Link 
                                      href={`/creation/${token.tokenAddress}`}
                                      className="text-xs text-[var(--pip-glow-green)] hover:text-white transition-colors flex items-center"
                                    >
                                      <span className="mr-1">View Details</span>
                                      <FontAwesomeIcon icon={faExternalLinkAlt} className="w-3 h-3" />
                                    </Link>
                                    <div className="flex space-x-3">
                                      <a 
                                        href={`https://pump.fun/coin/${token.tokenAddress}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[var(--pip-glow-green)] hover:text-white transition-colors"
                                        title="Pump.fun"
                                      >
                                        <FontAwesomeIcon icon={faCoins} className="w-3 h-3" />
                                      </a>
                                      {token.twitter && (
                                        <a 
                                          href={token.twitter.startsWith('http') ? token.twitter : `https://twitter.com/${token.twitter.replace('@', '')}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[var(--pip-glow-green)] hover:text-white transition-colors"
                                          title="Twitter"
                                        >
                                          <FontAwesomeIcon icon={fabTwitter} className="w-3 h-3" />
                                        </a>
                                      )}
                                      {token.website && (
                                        <a 
                                          href={token.website.startsWith('http') ? token.website : `https://${token.website}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[var(--pip-glow-green)] hover:text-white transition-colors"
                                          title="Website"
                                        >
                                          <FontAwesomeIcon icon={faGlobe} className="w-3 h-3" />
                                        </a>
                                      )}
                                      {token.telegram && (
                                        <a 
                                          href={token.telegram.startsWith('http') ? token.telegram : `https://t.me/${token.telegram.replace('@', '')}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[var(--pip-glow-green)] hover:text-white transition-colors"
                                          title="Telegram"
                                        >
                                          <FontAwesomeIcon icon={fabTelegram} className="w-3 h-3" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                      
                        {/* Pagination Controls for Grid View */}
                        <div className="flex justify-center items-center p-4 border-t border-gray-800">
                          {tokensLoading && currentPage > 0 ? (
                            <div className="flex items-center text-[var(--pip-glow-green)]">
                                      <FontAwesomeIcon 
                                icon={faSpinner} 
                                className="animate-spin mr-2"
                                style={{ width: '0.875rem', height: '0.875rem' }}
                              />
                              Loading more tokens...
                                    </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <div className="flex gap-2">
                                {currentPage > 0 && (
                                  <button
                                    onClick={() => {
                                      setCurrentPage(prev => prev - 1);
                                      fetchRelatedTokens(currentPage - 1, false);
                                    }}
                                    className="border border-[var(--pip-glow-green)] px-4 py-2 rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors flex items-center"
                                    disabled={tokensLoading}
                                  >
                                    <FontAwesomeIcon 
                                      icon={faArrowLeft} 
                                      className="mr-2"
                                      style={{ width: '0.75rem', height: '0.75rem' }}
                                    />
                                    <span>Previous</span>
                                  </button>
                                )}
                                <div className="flex items-center px-3">
                                  <span className="text-[var(--pip-glow-green)]">{currentPage + 1}</span>
                                </div>
                                {hasMoreTokens && (
                                  <button
                                    onClick={loadMoreTokens}
                                    className="border border-[var(--pip-glow-green)] px-4 py-2 rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors flex items-center"
                                    disabled={tokensLoading}
                                  >
                                    <span>Next</span>
                                    <FontAwesomeIcon 
                                      icon={faArrowRight} 
                                      className="ml-2"
                                      style={{ width: '0.75rem', height: '0.75rem' }}
                                    />
                                  </button>
                                )}
                              </div>
                              {!hasMoreTokens && keywordData.tokens && keywordData.tokens.length > 0 && (
                                <span className="text-gray-500 text-sm mt-2">No more tokens to load</span>
                              )}
                            </div>
                                    )}
                                  </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="border border-[var(--pip-glow-green)] rounded p-6 text-center">
                    <p className="text-gray-400">No tokens found for this keyword</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FontAwesomeIcon 
              icon={faExclamationTriangle} 
              className="text-4xl text-yellow-400 mb-4"
              style={{ width: '1.5rem', height: '1.5rem' }}
            />
            <p className="text-yellow-400 mb-2">Keyword not found</p>
            <Link
              href="/keywords"
              className="mt-4 border border-[var(--pip-glow-green)] px-3 py-1 text-sm rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" style={{ width: '0.75rem', height: '0.75rem' }} />
              Back to Keywords
            </Link>
          </div>
        )}
      </div>
    </PipBoyLayout>
  );
} 