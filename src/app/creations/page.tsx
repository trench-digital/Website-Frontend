"use client";

import PipBoyLayout from "@/components/PipBoyLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCoins,
  faFilter,
  faSort,
  faArrowRight,
  faBullhorn,
  faSearch,
  faChevronLeft,
  faChevronRight,
  faClock,
  faCalendarAlt,
  faChevronDown,
  faBars,
  faArrowUp,
  faArrowDown,
  faRocket,
} from "@fortawesome/free-solid-svg-icons";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import trenchSDK, { type Period } from "@/lib";
import type {
  CreationResponse,
  CreationWithCallsResponse,
} from "@/lib/trenchPumpFunSdk";
import { useRouter } from "next/navigation";
import SafeImage from "@/components/common/SafeImage";
import React from "react";

// Extend the Creation type to include the fields we need
interface _ExtendedCreation {
  mint: string;
  name: string;
  symbol: string;
  image?: string;
  price?: number;
  change24h?: number;
  volume?: number;
  marketCap?: number;
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
  callCounts?: {
    "30m": number;
    "1h": number;
    "3h": number;
    "6h": number;
    "12h": number;
    "24h": number;
  };
  calls?: Record<string, unknown>[];
  callCount?: number;
  creation?: {
    mint?: string;
    keywords?: string[];
    metadata?: {
      name?: string;
      symbol?: string;
      description?: string;
      image?: string;
      twitter?: string;
      website?: string;
      telegram?: string;
    };
  };
  metadata?: {
    name?: string;
    symbol?: string;
    description?: string;
    image?: string;
    twitter?: string;
    website?: string;
    telegram?: string;
  };
  lastTradedAt?: string;
}

type Token = {
  id: string;
  name: string;
  symbol: string;
  image: string;
  price: number;
  change24h: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  marketCap: number;
  mint: string;
  description?: string;
  lastTradedAt?: string | null;
  callCount?: number;
  migrationSpeed?: number;
  migrationTimeFormatted?: string;
  migratedOn?: string;
};

// Define pagination info type
interface PaginationInfo {
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function Tokens() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [sortBy, setSortBy] = useState<
    "volume" | "recent" | "calls" | "migration"
  >("volume");
  const [isLoading, setIsLoading] = useState(false);
  const [period, setPeriod] = useState<Period>("24h");
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState<string>("");
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Replace the existing refs and add browser cache support
  const requestsInFlight = useRef<Set<string>>(new Set());
  // Define a type for the cached data structure
  type CachedResponse = {
    data: {
      creations: (CreationResponse | CreationWithCallsResponse)[];
    };
    timestamp: number;
  };
  const requestCache = useRef<Map<string, CachedResponse>>(new Map());
  const CACHE_TTL = 60000; // 1 minute in milliseconds - longer cache time
  const BROWSER_CACHE_KEY = "trench_tokens_cache";

  // Add a ref to track if component is mounted
  const isMountedRef = useRef(true);

  // Initialize cache from browser storage
  useEffect(() => {
    // Load cache from browser storage on mount
    const loadCacheFromStorage = () => {
      try {
        const cachedData = localStorage.getItem(BROWSER_CACHE_KEY);
        if (cachedData) {
          const parsedCache = JSON.parse(cachedData);

          // Convert the parsed cache (which is just an object) back to a Map
          const cacheMap = new Map();
          Object.entries(parsedCache).forEach(([key, value]) => {
            cacheMap.set(key, value);
          });

          // Clean up any stale entries
          const now = Date.now();
          for (const [key, entry] of cacheMap.entries()) {
            if (now - entry.timestamp > CACHE_TTL) {
              cacheMap.delete(key);
            }
          }

          requestCache.current = cacheMap;
        }
      } catch (error) {
        console.error("Error loading cache from storage:", error);
        // If there's an error, clear local storage
        localStorage.removeItem(BROWSER_CACHE_KEY);
      }
    };

    // First, clear any outdated cache
    const now = Date.now();
    const lastCacheClear = localStorage.getItem(
      "trench_tokens_cache_last_cleared"
    );
    const CACHE_CLEAR_INTERVAL = 1000 * 60 * 15; // 15 minutes

    if (
      !lastCacheClear ||
      now - parseInt(lastCacheClear) > CACHE_CLEAR_INTERVAL
    ) {
      console.log("Clearing outdated cache");
      localStorage.removeItem(BROWSER_CACHE_KEY);
      localStorage.setItem("trench_tokens_cache_last_cleared", now.toString());
      // Clear the in-memory cache too
      requestCache.current.clear();
    } else {
      // Load the existing cache
      loadCacheFromStorage();
    }
  }, []);

  // Save cache to browser storage when it changes
  const saveCacheToStorage = useCallback(() => {
    try {
      // Convert Map to a plain object for storage
      const cacheObject = Object.fromEntries(requestCache.current);
      localStorage.setItem(BROWSER_CACHE_KEY, JSON.stringify(cacheObject));
    } catch (error) {
      console.error("Error saving cache to storage:", error);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setShowFilters(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // Add a cleanup effect when component unmounts to cancel any in-flight requests
  useEffect(() => {
    return () => {
      console.log("Component unmounting - cleaning up in-flight requests");
      // Clear all in-flight requests to prevent state updates after unmount
      requestsInFlight.current.clear();
      isMountedRef.current = false;
    };
  }, []);

  // Process API data into component state
  const processApiData = useCallback(
    (
      creationsData: (CreationResponse | CreationWithCallsResponse)[],
      forcePage?: number
    ) => {
      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      console.log(
        "Processing API data, creations:",
        creationsData?.length || 0
      );

      // CRITICAL FIX: If we're on a page beyond page 0 and get an empty array,
      // we should go back to the previous page because we've gone too far
      if (
        forcePage &&
        forcePage > 0 &&
        (!creationsData || creationsData.length === 0)
      ) {
        console.log(
          "Empty data received for page > 0, reverting to previous page"
        );
        const prevPage = forcePage - 1;

        // Attempt to load the previous page
        setPagination({
          currentPage: prevPage,
          hasNextPage: false, // No next page since current page is empty
          hasPrevPage: prevPage > 0,
        });

        // Don't set tokens to empty array, keep current tokens
        // We'll fetch the previous page data in the useEffect
        return;
      }

      // Continue with normal processing if not an empty page > 0

      // Map creation data to tokens
      const formattedTokens: Token[] = creationsData.map(
        (creationResponse, index) => {
          // Handle different response types
          if ("creation" in creationResponse && "volume" in creationResponse) {
            // Regular CreationResponse
            const response = creationResponse as CreationResponse;
            const creation = response.creation;

            // Extract metadata
            const metadata = creation.metadata || {};

            // Get the mint address
            const mintAddress = creation.mint || "";

            // Get name and symbol with fallbacks
            const name = metadata.name || "";
            const symbol = metadata.symbol || "";
            const description = metadata.description || "";

            // Get image URL
            const image = metadata.image || "";

            // Get volume data from the response
            const volume = response.volume || {};
            const buyVolume = volume.buy?.[period] || 0;
            const sellVolume = volume.sell?.[period] || 0;

            // Get call data if available
            const callVolume = response.callVolume || {};
            let callCount = callVolume.callVolume?.[period] || 0;

            // Fallback to calls array length if available
            if (response.calls && Array.isArray(response.calls)) {
              callCount = response.calls.length;
            }

            // Extract migration data if available
            const migrationSpeed = response.migrationSpeed;
            const migrationTimeFormatted = response.migrationTimeFormatted;
            const migratedOn = response.migratedOn;

            return {
              id: mintAddress || `token-${index}`,
              mint: mintAddress,
              name: name,
              symbol: symbol,
              image: image,
              description: description,
              // Use actual data when available, or reasonable defaults
              price: 0, // Not provided by API
              change24h: 0, // Not provided by API
              volume: buyVolume + sellVolume,
              buyVolume: buyVolume,
              sellVolume: sellVolume,
              marketCap: 0, // Not provided by API
              lastTradedAt: volume.lastTradeDate,
              callCount: callCount,
              migrationSpeed: migrationSpeed,
              migrationTimeFormatted: migrationTimeFormatted,
              migratedOn: migratedOn,
            };
          } else {
            // CreationWithCallsResponse type
            const response = creationResponse as CreationWithCallsResponse;
            const creation = response.creation;
            const metadata = creation.metadata || {};

            // Extract volume data
            const buyVolume = response.buyVolume?.[period] || 0;
            const sellVolume = response.sellVolume?.[period] || 0;

            // Get call count from calls array
            const callCount = response.calls?.length || 0;

            return {
              id: creation.mint || `token-${index}`,
              mint: creation.mint,
              name: creation.name || metadata.name || "",
              symbol: creation.symbol || metadata.symbol || "",
              image: creation.image || metadata.image || "",
              description: metadata.description || "",
              price: 0,
              change24h: 0,
              volume: buyVolume + sellVolume,
              buyVolume: buyVolume,
              sellVolume: sellVolume,
              marketCap: 0,
              lastTradedAt: response.lastTradedAt,
              callCount: callCount,
              migrationSpeed: undefined,
              migrationTimeFormatted: undefined,
              migratedOn: undefined,
            };
          }
        }
      );

      console.log(
        "Data processing complete, setting tokens:",
        formattedTokens.length
      );
      setTokens(formattedTokens);

      // Update pagination info based on results
      // If the API returns an empty array, that means we've reached the last page + 1
      const hasMorePages = creationsData.length > 0;

      // Use the forced page if provided (for handling next/prev pages correctly)
      const pageToUse =
        forcePage !== undefined ? forcePage : pagination.currentPage;

      // Only update pagination if we're not dealing with an empty array on a page > 0
      // (we handled that case at the beginning of this function)
      if (creationsData.length > 0 || pageToUse === 0) {
        // Update pagination state
        setPagination({
          currentPage: pageToUse,
          hasNextPage: hasMorePages, // Only have next page if we got results
          hasPrevPage: pageToUse > 0,
        });
      }
    },
    [period]
  );

  // Load tokens data from API based on user actions
  const fetchData = useCallback(
    async (page: number = pagination.currentPage) => {
      console.log(`[fetchData] Starting. page: ${page}, sortBy: ${sortBy}, period: ${period}`);

      // Create a cache key based on the current filter parameters
      const cacheKey = JSON.stringify({ sortBy, period, page });

      // Log the current request parameters to debug
      console.log("Current request parameters:", { sortBy, period, page });

      // If an identical request is currently in flight, don't start a new one
      if (requestsInFlight.current.has(cacheKey)) {
        console.log(
          "Skipping duplicate request that is already in flight:",
          cacheKey
        );
        return;
      }

      // NEW: Check for any in-flight requests with similar parameters regardless of page
      // This provides extra protection against duplicate requests
      const hasConflictingRequest = Array.from(requestsInFlight.current).some(
        (key) => {
          try {
            const inFlightParams = JSON.parse(key);
            return (
              inFlightParams.sortBy === sortBy &&
              inFlightParams.period === period &&
              inFlightParams.page === page
            ); // Only consider exact page match as conflicting
          } catch {
            return false;
          }
        }
      );

      if (hasConflictingRequest) {
        console.log(
          "Skipping request due to conflicting in-flight request with similar parameters"
        );
        return;
      }

      // Check if we have a cached response that's still valid
      const cachedResponse = requestCache.current.get(cacheKey);
      if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_TTL) {
        console.log("Using cached response for:", { sortBy, period, page });
        // Process the cached data
        if (cachedResponse.data) {
          processApiData(
            cachedResponse.data.creations,
            page
          );
          return;
        }
      }

      // Mark this request as in-flight before any async operations
      requestsInFlight.current.add(cacheKey);
      console.log(
        "Added to requestsInFlight:",
        cacheKey,
        "Current in-flight requests:",
        Array.from(requestsInFlight.current)
      );

      // Set loading state
      setIsLoading(true);
      setError(null);

      console.log("Fetching data with filters:", {
        sortBy,
        period,
        page,
      });

      try {
        // First determine what data to fetch based on current filters
        let creationsData;

        // Get creations based on current sort
        if (sortBy === "volume") {
          console.log("[fetchData] Making API call: getCreationsByVolume");
          creationsData = await trenchSDK.getCreationsByVolume({
            period,
            page,
          });
          console.log(
            "Volume data fetched successfully, received items:",
            creationsData?.length || 0
          );
        } else if (sortBy === "calls") {
          console.log("[fetchData] Making API call: getMostCalledCreations");
          creationsData = await trenchSDK.getMostCalledCreations({
            period,
            page,
          });
          console.log(
            "Calls data fetched successfully, received items:",
            creationsData?.length || 0
          );
        } else if (sortBy === "migration") {
          console.log("[fetchData] Making API call: getFastestMigratedCreations");
          creationsData = await trenchSDK.getFastestMigratedCreations({
            period,
            page,
          });
          console.log(
            "Migration data fetched successfully, received items:",
            creationsData?.length || 0
          );
        } else if (sortBy === "recent") {
          console.log("[fetchData] Making API call: getRecentCreations");
          creationsData = await trenchSDK.getRecentCreations({
            period,
            page,
          });
          console.log(
            "Recent data fetched successfully, received items:",
            creationsData?.length || 0
          );
        } else {
          // Default case for unexpected sort values
          console.warn(
            "Unexpected sortBy value:",
            sortBy,
            "falling back to recent"
          );
          console.log("[fetchData] Making API call: getRecentCreations (fallback)");
          creationsData = await trenchSDK.getRecentCreations({
            period,
            page,
          });
          console.log(
            "Fallback recent data fetched, received items:",
            creationsData?.length || 0
          );
        }

        // Check if we got valid data back
        if (!creationsData || !Array.isArray(creationsData)) {
          console.error(
            "Invalid response from API, creationsData:",
            creationsData
          );
          throw new Error("Invalid API response structure");
        }

        // Save the response in cache
        requestCache.current.set(cacheKey, {
          data: {
            creations: creationsData,
          },
          timestamp: Date.now(),
        });

        // Process the data to update the UI - pass the page to ensure pagination updates correctly
        processApiData(creationsData, page);

        // Save the cache to browser storage
        saveCacheToStorage();

        console.log("Data fetch and processing complete for page:", page);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load tokens data. Please try again later.");
      } finally {
        // Remove this request from in-flight set
        requestsInFlight.current.delete(cacheKey);

        // Only update loading state if still mounted
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [sortBy, period, processApiData, saveCacheToStorage, pagination.currentPage]
  );

  // Add an effect to fetch data when pagination changes
  useEffect(() => {
    // This effect runs when pagination changes
    if (isMountedRef.current && pagination.currentPage >= 0) {
      console.log(
        "Pagination changed, fetching data for page:",
        pagination.currentPage
      );
      fetchData(pagination.currentPage);
    }
  }, [pagination.currentPage, fetchData]);

  // Add an effect to load data on mount and when filters change
  useEffect(() => {
    if (isMountedRef.current) {
      console.log(
        "Loading initial data or filter changes detected (sortBy/period)"
      );
      // Reset to page 0 when filters change
      const newPagination = {
        currentPage: 0,
        hasNextPage: true, // Assume has next page initially
        hasPrevPage: false,
      };
      setPagination(newPagination);

      // Directly fetch data for page 0 after resetting pagination
      // This ensures fetch happens even if currentPage was already 0
      console.log(`[useEffect] About to call fetchData(0) for period: ${period}`);
      fetchData(0);
    }
    // Intentionally excluding fetchData from dependency array here
    // to avoid potential loops if fetchData itself causes state changes
    // that would re-trigger this effect unnecessarily.
    // We only want this effect to run strictly on sortBy/period changes.
  }, [sortBy, period]); // Keep dependencies as sortBy, period

  // Pagination handlers with improved debouncing
  const handleNextPage = useCallback(() => {
    // Block multiple rapid clicks by checking both loading state and in-flight requests
    if (isLoading || Array.from(requestsInFlight.current).length > 0) {
      console.log(
        "Ignoring next page request while loading or requests in flight"
      );
      return;
    }

    // Don't proceed if there is no next page
    if (!pagination.hasNextPage) {
      console.log("No next page available, ignoring request");
      return;
    }

    const nextPage = pagination.currentPage + 1;
    console.log(`Moving to next page: ${nextPage}`);

    // Fetch the next page data - DO NOT update pagination here
    // Let fetchData and processApiData handle the pagination updates
    fetchData(nextPage);
  }, [isLoading, pagination.hasNextPage, pagination.currentPage, fetchData]);

  const handlePrevPage = useCallback(() => {
    // Block multiple rapid clicks by checking both pagination state, loading state, and in-flight requests
    if (
      !pagination.hasPrevPage ||
      isLoading ||
      Array.from(requestsInFlight.current).length > 0
    ) {
      console.log(
        "Ignoring prev page request while loading or requests in flight or no previous page"
      );
      return;
    }

    const prevPage = Math.max(0, pagination.currentPage - 1);
    console.log(`Moving to previous page: ${prevPage}`);

    // Fetch the previous page data - DO NOT update pagination here
    // Let fetchData and processApiData handle the pagination updates
    fetchData(prevPage);
  }, [pagination.hasPrevPage, isLoading, pagination.currentPage, fetchData]);

  // Handler for sorting button clicks with enhanced duplicate prevention
  const handleSortChange = (
    newSortBy: "volume" | "recent" | "calls" | "migration"
  ) => {
    if (newSortBy === sortBy) return; // No change

    console.log(`Changing sort from ${sortBy} to ${newSortBy}`);

    // Clear any cached data for the new sort and current period combination
    const newCacheKey = JSON.stringify({ sortBy: newSortBy, period, page: 0 });
    requestCache.current.delete(newCacheKey);

    // Also clear the existing cache for the current sort to ensure we get fresh data
    const oldCacheKey = JSON.stringify({
      sortBy,
      period,
      page: pagination.currentPage,
    });
    requestCache.current.delete(oldCacheKey);

    // Force clear any in-flight requests that might interfere
    Array.from(requestsInFlight.current).forEach((key) => {
      if (key.includes(`"sortBy":"${newSortBy}"`)) {
        console.log("Clearing potentially conflicting in-flight request:", key);
        requestsInFlight.current.delete(key);
      }
    });

    // Update the sort state which will trigger a data fetch via useEffect
    setSortBy(newSortBy);

    // Close dropdown when changing sort
    setShowFilters(false);
  };

  // Handler for period changes with enhanced duplicate prevention
  const handlePeriodChange = (newPeriod: Period) => {
    if (newPeriod === period) return; // No change

    console.log(`Changing period from ${period} to ${newPeriod}`);

    // Clear any cached data for the new period and current sort combination
    const newCacheKey = JSON.stringify({ sortBy, period: newPeriod, page: 0 });
    requestCache.current.delete(newCacheKey);

    // Also clear the existing cache for the current period to ensure we get fresh data
    const oldCacheKey = JSON.stringify({
      sortBy,
      period,
      page: pagination.currentPage,
    });
    requestCache.current.delete(oldCacheKey);

    // Force clear any in-flight requests that might interfere
    Array.from(requestsInFlight.current).forEach((key) => {
      if (key.includes(`"period":"${newPeriod}"`)) {
        console.log("Clearing potentially conflicting in-flight request:", key);
        requestsInFlight.current.delete(key);
      }
    });

    console.log(`[handlePeriodChange] About to setPeriod to: ${newPeriod}`);
    // Update the period state which will trigger a data fetch via useEffect
    setPeriod(newPeriod);
  };

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/creation/${encodeURIComponent(searchInput.trim())}`);
    }
  };

  // Get human-readable time period
  const getTimePeriodLabel = useCallback((period: Period): string => {
    switch (period) {
      case "30m":
        return "30 min";
      case "1h":
        return "1 hour";
      case "3h":
        return "3 hours";
      case "6h":
        return "6 hours";
      case "12h":
        return "12 hours";
      case "24h":
        return "24 hours";
    }
  }, []);

  // Format volume
  const formatVolume = (value: number | undefined) => {
    if (value === undefined || value === null || value === 0) return "No data";

    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}K`;
    } else {
      return `${value.toFixed(2)}`;
    }
  };

  // Function to determine if a migration was fast (under 1 hour)
  const isFastMigration = (migrationSpeed?: number): boolean => {
    if (!migrationSpeed) return false;
    return migrationSpeed < 3600000; // Less than 1 hour (in milliseconds)
  };

  // Calculate buy and sell volume percentages for the volume bar
  const getVolumeBarWidths = (token: Token) => {
    // Regular volume bar calculation for all sort types
    const buyVolume = token.buyVolume || 0;
    const sellVolume = token.sellVolume || 0;
    const totalVolume = buyVolume + sellVolume;

    if (totalVolume === 0) {
      // If there's no volume, show equal parts (50/50)
      return {
        buyWidth: "50%",
        sellWidth: "50%",
        buyPercent: 50,
        sellPercent: 50,
      };
    }

    // Calculate the relative proportions of buy and sell
    // This ensures the bars always add up to 100% of the width
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
      buyPercent: parseFloat((buyProportion * 100).toFixed(1)),
      sellPercent: parseFloat((sellProportion * 100).toFixed(1)),
    };
  };

  // Function to format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "No trade data";

    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    // Less than a minute
    if (diffInSeconds < 60) {
      return "Just now";
    }

    // Less than an hour
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    }

    // Less than a day
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    }

    // Less than a week
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }

    // Format as date
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Set mounted flag when component mounts
  useEffect(() => {
    isMountedRef.current = true;
    console.log("TOKENS page mounted");

    // Set a flag in session storage to indicate we've visited this page
    // This helps with debugging across page navigations
    try {
      sessionStorage.setItem("tokens_page_visited", "true");
      sessionStorage.setItem(
        "tokens_page_last_visit",
        new Date().toISOString()
      );
    } catch (_e) {
      // Ignore errors with sessionStorage
    }

    // Always clear in-flight requests on mount
    requestsInFlight.current.clear();

    // Clear token cache on page load
    console.log("Clearing token cache on page load");
    requestCache.current.clear();
    localStorage.removeItem(BROWSER_CACHE_KEY);

    // No longer triggering data fetch here - see the dependency effect below
    // which will handle the initial data fetch

    return () => {
      console.log("TOKENS page unmounted");
      isMountedRef.current = false;
      // Clear all in-flight requests when unmounting
      requestsInFlight.current.clear();
    };
  }, []);

  return (
    <PipBoyLayout>
      <div className="pip-border p-4 md:p-6 w-full h-full overflow-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-[var(--pip-glow-green)] pb-4">
          <div className="hidden md:block">
            <h2 className="text-2xl md:text-3xl text-[var(--pip-glow-green)] drop-shadow-[0_0_4px_var(--pip-glow-green)] flex items-center">
              <FontAwesomeIcon
                icon={faCoins}
                className="mr-3 text-[var(--pip-glow-green)]"
                style={{ width: "1.5rem", height: "1.5rem" }}
              />
              TRENDING TOKENS
            </h2>
          </div>

          {/* Desktop filter buttons */}
          <div className="hidden md:flex gap-2 flex-wrap justify-end mt-3 md:mt-0">
            <button
              onClick={() => handleSortChange("volume")}
              className={`border border-[var(--pip-glow-green)] px-3 py-1 text-sm rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors ${
                sortBy === "volume" ? "bg-[rgba(0,255,0,0.2)]" : ""
              }`}
            >
              <FontAwesomeIcon
                icon={faCoins}
                className="mr-2"
                style={{ width: "0.875rem", height: "0.875rem" }}
              />
              Volume
            </button>
            <button
              onClick={() => handleSortChange("calls")}
              className={`border border-[var(--pip-glow-green)] px-3 py-1 text-sm rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors ${
                sortBy === "calls" ? "bg-[rgba(0,255,0,0.2)]" : ""
              }`}
            >
              <FontAwesomeIcon
                icon={faBullhorn}
                className="mr-2"
                style={{ width: "0.875rem", height: "0.875rem" }}
              />
              Calls
            </button>
            <button
              onClick={() => handleSortChange("migration")}
              className={`border border-[var(--pip-glow-green)] px-3 py-1 text-sm rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors ${
                sortBy === "migration" ? "bg-[rgba(0,255,0,0.2)]" : ""
              }`}
            >
              <FontAwesomeIcon
                icon={faClock}
                className="mr-2"
                style={{ width: "0.875rem", height: "0.875rem" }}
              />
              Migration
            </button>
            <button
              onClick={() => handleSortChange("recent")}
              className={`border border-[var(--pip-glow-green)] px-3 py-1 text-sm rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors ${
                sortBy === "recent" ? "bg-[rgba(0,255,0,0.2)]" : ""
              }`}
            >
              <FontAwesomeIcon
                icon={faSort}
                className="mr-2"
                style={{ width: "0.875rem", height: "0.875rem" }}
              />
              Recent
            </button>
            <div className="relative" ref={filterDropdownRef}>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`border border-[var(--pip-glow-green)] px-3 py-1 text-sm rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors ${
                  showFilters ? "bg-[rgba(0,255,0,0.2)]" : ""
                }`}
              >
                <FontAwesomeIcon
                  icon={faFilter}
                  className="mr-2"
                  style={{ width: "0.875rem", height: "0.875rem" }}
                />
                Filters
              </button>
            </div>
          </div>

          {/* Mobile dropdown menu */}
          <div className="md:hidden flex w-full justify-between items-center">
            <h2 className="text-xl text-[var(--pip-glow-green)] drop-shadow-[0_0_4px_var(--pip-glow-green)] flex items-center">
              <FontAwesomeIcon
                icon={faCoins}
                className="mr-2 text-[var(--pip-glow-green)]"
                style={{ width: "1.2rem", height: "1.2rem" }}
              />
              TRENDING TOKENS
            </h2>

            <div className="relative" ref={mobileMenuRef}>
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="border border-[var(--pip-glow-green)] px-3 py-1 text-sm rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors flex items-center"
              >
                <FontAwesomeIcon
                  icon={faBars}
                  className="mr-2"
                  style={{ width: "0.875rem", height: "0.875rem" }}
                />
                {(() => {
                  switch (sortBy) {
                    case "volume":
                      return "Volume";
                    case "calls":
                      return "Calls";
                    case "migration":
                      return "Migration";
                    case "recent":
                      return "Recent";
                    default:
                      return "Sort";
                  }
                })()}
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className="ml-2"
                  style={{ width: "0.75rem", height: "0.75rem" }}
                />
              </button>

              {showMobileMenu && (
                <div className="absolute right-0 top-full mt-1 bg-black border border-[var(--pip-glow-green)] rounded shadow-lg z-10 w-40">
                  <div className="px-3 py-2">
                    <span className="text-xs font-bold text-[var(--pip-glow-green)] text-left block">
                      Sort By
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      handleSortChange("volume");
                      setShowMobileMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-[rgba(0,255,0,0.1)] transition-colors ${
                      sortBy === "volume" ? "bg-[rgba(0,255,0,0.2)]" : ""
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={faCoins}
                      className="mr-2"
                      style={{ width: "0.875rem", height: "0.875rem" }}
                    />
                    Volume
                  </button>
                  <button
                    onClick={() => {
                      handleSortChange("calls");
                      setShowMobileMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-[rgba(0,255,0,0.1)] transition-colors ${
                      sortBy === "calls" ? "bg-[rgba(0,255,0,0.2)]" : ""
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={faBullhorn}
                      className="mr-2"
                      style={{ width: "0.875rem", height: "0.875rem" }}
                    />
                    Calls
                  </button>
                  <button
                    onClick={() => {
                      handleSortChange("migration");
                      setShowMobileMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-[rgba(0,255,0,0.1)] transition-colors ${
                      sortBy === "migration" ? "bg-[rgba(0,255,0,0.2)]" : ""
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={faClock}
                      className="mr-2"
                      style={{ width: "0.875rem", height: "0.875rem" }}
                    />
                    Migration
                  </button>
                  <button
                    onClick={() => {
                      handleSortChange("recent");
                      setShowMobileMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-[rgba(0,255,0,0.1)] transition-colors ${
                      sortBy === "recent" ? "bg-[rgba(0,255,0,0.2)]" : ""
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={faSort}
                      className="mr-2"
                      style={{ width: "0.875rem", height: "0.875rem" }}
                    />
                    Recent
                  </button>
                  <div className="border-t border-[var(--pip-glow-green)] my-1"></div>
                  <div className="px-3 py-2 text-sm">
                    <label className="text-xs font-bold text-[var(--pip-glow-green)] block mb-1">
                      Time Period
                    </label>
                    <select
                      className="w-full border border-[var(--pip-glow-green)] px-2 py-1 text-xs rounded bg-black"
                      value={period}
                      onChange={(e) => {
                        const newPeriod = e.target.value as Period;
                        console.log(`[onChange] Period select changed: ${newPeriod}`);
                        handlePeriodChange(newPeriod);
                      }}
                    >
                      <option value="30m">30 minutes</option>
                      <option value="1h">1 hour</option>
                      <option value="3h">3 hours</option>
                      <option value="6h">6 hours</option>
                      <option value="12h">12 hours</option>
                      <option value="24h">24 hours</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Enter token mint address to view details..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-black border border-[var(--pip-glow-green)] rounded px-3 py-2 text-[var(--pip-glow-green)] placeholder-[color:rgba(0,255,0,0.5)] focus:outline-none focus:shadow-[0_0_8px_var(--pip-glow-green)]"
              />
            </div>
            <button
              type="submit"
              className="border border-[var(--pip-glow-green)] bg-[rgba(0,255,0,0.1)] px-4 py-2 rounded hover:bg-[rgba(0,255,0,0.2)] text-[var(--pip-glow-green)] transition-colors"
            >
              <FontAwesomeIcon
                icon={faSearch}
                style={{ width: "0.875rem", height: "0.875rem" }}
              />
            </button>
          </form>
        </div>

        {/* Time period filter bar - only show in desktop view */}
        {showFilters && (
          <div className="mb-6 hidden md:block">
            <div className="border border-[var(--pip-glow-green)] rounded p-3 mb-2">
              <h3 className="text-md text-[var(--pip-glow-green)] mb-2 font-bold">
                <FontAwesomeIcon
                  icon={faClock}
                  className="mr-2"
                  style={{ width: "0.875rem", height: "0.875rem" }}
                />
                Time Period
              </h3>
              <div className="grid grid-cols-6 gap-2">
                {(["30m", "1h", "3h", "6h", "12h", "24h"] as Period[]).map(
                  (timePeriod) => (
                    <button
                      key={timePeriod}
                      onClick={() => handlePeriodChange(timePeriod)}
                      className={`border border-[var(--pip-glow-green)] px-2 py-1 text-xs rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors ${
                        period === timePeriod ? "bg-[rgba(0,255,0,0.2)]" : ""
                      }`}
                    >
                      {getTimePeriodLabel(timePeriod)}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 mb-4 text-center text-red-400 border border-red-400 rounded">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-pulse text-[var(--pip-glow-green)]">
              Loading tokens data...
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tokens.length > 0 ? (
                tokens.map((token) => (
                  <Link
                    key={token.id}
                    href={
                      token.mint
                        ? `/creation/${encodeURIComponent(token.mint)}`
                        : "#"
                    }
                    className={`block h-full ${
                      !token.mint ? "pointer-events-none" : ""
                    }`}
                    onClick={(e) => {
                      if (!token.mint) {
                        e.preventDefault();
                      } else {
                        console.log("Token mint:", token.mint);
                        console.log(
                          "Link href:",
                          `/creation/${encodeURIComponent(token.mint)}`
                        );
                      }
                    }}
                  >
                    <div className="pip-border p-4 hover:bg-[#041607] transition-colors duration-300 h-full flex flex-col">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 relative bg-[rgba(0,255,0,0.1)] rounded-full flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full overflow-hidden">
                              <SafeImage
                                src={token.image}
                                alt={token.name}
                                width={40}
                                height={40}
                                className="object-cover"
                                fallbackSrc="/logo.png"
                                onImageError={(e) => {
                                  // Add a specific class to indicate it's a fallback if needed
                                  const target = e.target as HTMLImageElement;
                                  target.classList.add("image-fallback");
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white drop-shadow-[0_0_2px_var(--pip-glow-green)]">
                              {token.name}
                            </h3>
                            {token.description && (
                              <p className="text-xs opacity-80 truncate max-w-[200px]">
                                {token.description}
                              </p>
                            )}
                            <div className="flex gap-2 flex-wrap mt-1">
                              {/* Removed keyword rendering logic */}
                              {/* {token.keywords &&
                              Array.isArray(token.keywords) &&
                              token.keywords.length > 0
                                ? token.keywords.map((keyword, idx) => (
                                    <span
                                      key={idx}
                                      className="text-xs bg-[rgba(0,255,0,0.1)] px-2 py-0.5 rounded-full cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation(); // Prevent card click
                                        e.preventDefault(); // Prevent link navigation
                                        handleKeywordClick(keyword);
                                      }}
                                    >
                                      {keyword}
                                    </span>
                                  ))
                                : null} */}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold flex items-center justify-end">
                            {sortBy === "calls" ? (
                              <>
                                <span
                                  className="flex items-center"
                                  title={`Number of social media mentions (calls) in the last ${period}`}
                                >
                                  <span className="text-[var(--pip-glow-green)]">
                                    {token.callCount || 0}
                                  </span>
                                  <FontAwesomeIcon
                                    icon={faBullhorn}
                                    className="ml-1.5 text-[var(--pip-glow-green)]"
                                    style={{ width: "1rem", height: "1rem" }}
                                  />
                                </span>
                              </>
                            ) : sortBy === "migration" &&
                              token.migrationTimeFormatted ? (
                              <>
                                <span
                                  className="flex items-center"
                                  title="Migration Speed"
                                >
                                  <span
                                    className={
                                      isFastMigration(token.migrationSpeed)
                                        ? "text-green-400"
                                        : "text-amber-400"
                                    }
                                  >
                                    {token.migrationTimeFormatted}
                                  </span>
                                  <FontAwesomeIcon
                                    icon={faClock}
                                    className={`ml-1.5 ${
                                      isFastMigration(token.migrationSpeed)
                                        ? "text-green-400"
                                        : "text-amber-400"
                                    }`}
                                    style={{ width: "1rem", height: "1rem" }}
                                  />
                                </span>
                              </>
                            ) : (
                              <>
                                {formatVolume(token.volume)}
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 20"
                                  className="ml-1 text-[var(--pip-glow-green)]"
                                  style={{ minWidth: "16px" }}
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
                              </>
                            )}
                          </div>
                          <div className="text-xs text-[var(--pip-glow-green)] flex items-center justify-end">
                            {sortBy === "calls" ? (
                              <>
                                <FontAwesomeIcon
                                  icon={faBullhorn}
                                  className="mr-1"
                                  style={{
                                    width: "0.75rem",
                                    height: "0.75rem",
                                  }}
                                />
                                <span title="Time period for call count">{`${getTimePeriodLabel(period)}`}</span>
                              </>
                            ) : sortBy === "migration" && token.migratedOn ? (
                              <>
                                <FontAwesomeIcon
                                  icon={faCalendarAlt}
                                  className="mr-1"
                                  style={{
                                    width: "0.75rem",
                                    height: "0.75rem",
                                  }}
                                />
                                <span title="Migration Date">
                                  {formatDate(token.migratedOn)}
                                </span>
                              </>
                            ) : (
                              <>
                                <FontAwesomeIcon
                                  icon={faBullhorn}
                                  className="mr-1"
                                  style={{
                                    width: "0.75rem",
                                    height: "0.75rem",
                                  }}
                                />
                                {token.lastTradedAt
                                  ? formatDate(token.lastTradedAt)
                                  : "No trade data"}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex-1">
                        <div className="w-full bg-[rgba(0,0,0,0.5)] border border-[var(--pip-glow-green)] rounded h-5 overflow-hidden flex relative shadow-[0_0_8px_rgba(0,255,0,0.3)_inset] shadow-inner text-xs font-bold">
                          {(() => {
                            const buyVolume = token.buyVolume || 0;
                            const sellVolume = token.sellVolume || 0;
                            const totalVolume = buyVolume + sellVolume;

                            let buyProportion = 0.5;
                            let sellProportion = 0.5;

                            if (totalVolume > 0) {
                              buyProportion = buyVolume / totalVolume;
                              sellProportion = sellVolume / totalVolume;
                            }

                            const minWidth = 5;
                            let buyWidthPercent = buyProportion * 100;
                            let sellWidthPercent = sellProportion * 100;

                            const showDivider = buyVolume > 0 && sellVolume > 0;

                            if (showDivider) {
                              if (buyWidthPercent < minWidth) {
                                buyWidthPercent = minWidth;
                                sellWidthPercent = 100 - minWidth;
                              } else if (sellWidthPercent < minWidth) {
                                sellWidthPercent = minWidth;
                                buyWidthPercent = 100 - minWidth;
                              }
                            } else if (buyVolume > 0) {
                              buyWidthPercent = 100;
                              sellWidthPercent = 0;
                            } else if (sellVolume > 0) {
                              buyWidthPercent = 0;
                              sellWidthPercent = 100;
                            } else {
                              buyWidthPercent = 50;
                              sellWidthPercent = 50;
                            }

                            const buyWidthStyle = `${buyWidthPercent}%`;
                            const sellWidthStyle = `${sellWidthPercent}%`;
                            const buyPercentText = `${buyWidthPercent.toFixed(1)}%`;
                            const sellPercentText = `${sellWidthPercent.toFixed(1)}%`;

                            let rocketColorClass = "text-white";
                            const tolerance = 0.1;
                            if (buyWidthPercent > sellWidthPercent + tolerance) {
                              rocketColorClass = "text-green-400";
                            } else if (sellWidthPercent > buyWidthPercent + tolerance) {
                              rocketColorClass = "text-red-400";
                            }

                            return (
                              <React.Fragment>
                                <div
                                  className="bg-green-700 h-full flex items-center justify-start text-white relative px-2 z-0"
                                  style={{ width: buyWidthStyle, transition: 'width 0.3s ease-in-out' }}
                                  title={`Buy Volume: ${formatVolume(buyVolume)} (${buyPercentText})`}
                                >
                                  {buyWidthPercent >= 20 && (
                                    <span className="flex items-center">
                                      <FontAwesomeIcon icon={faArrowUp} className="mr-1" style={{ width: '0.65rem', height: '0.65rem' }}/>
                                      {buyPercentText}
                                    </span>
                                  )}
                                </div>

                                <div
                                  className="bg-red-700 h-full flex items-center justify-end text-white relative px-2 z-0"
                                  style={{ width: sellWidthStyle, transition: 'width 0.3s ease-in-out' }}
                                  title={`Sell Volume: ${formatVolume(sellVolume)} (${sellPercentText})`}
                                >
                                  {sellWidthPercent >= 20 && (
                                    <span className="flex items-center">
                                      {sellPercentText}
                                      <FontAwesomeIcon icon={faArrowDown} className="ml-1" style={{ width: '0.65rem', height: '0.65rem' }}/>
                                    </span>
                                  )}
                                </div>

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

                                <div
                                  className="absolute top-0 bottom-0 w-px bg-[rgba(0,255,0,0.4)] z-[5]"
                                  style={{ left: '50%', transform: 'translateX(-50%)', boxShadow: '0 0 2px rgba(0, 255, 0, 0.3)' }}
                                  title="50% Mark"
                                ></div>
                              </React.Fragment>
                            );
                          })()}
                        </div>

                        <div className="flex justify-between items-center mt-1 text-xs">
                          <div className="flex items-center text-xs text-green-400">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 20"
                              className="mr-1"
                              fill="currentColor"
                            >
                              <path d="M4.2 14.1c0.1-0.1 0.2-0.1 0.4-0.1h15.6c0.2 0 0.3 0.2 0.2 0.4l-3.4 3.4c-0.1 0.1-0.2 0.1-0.4 0.1H0.4c-0.2 0-0.3-0.2-0.2-0.4l4-3.4z" />
                              <path d="M4.2 0.1c0.1-0.1 0.2-0.1 0.4-0.1h15.6c0.2 0 0.3 0.2 0.2 0.4l-3.4 3.4c-0.1 0.1-0.2 0.1-0.4 0.1H0.4c-0.2 0-0.3-0.2-0.2-0.4l4-3.4z" />
                              <path d="M20 7.1c-0.1-0.1-0.2-0.1-0.4-0.1H4c-0.2 0-0.3 0.2-0.2 0.4l3.4 3.4c0.1 0.1 0.2 0.1 0.4 0.1h15.6c0.2 0 0.3-0.2 0.2-0.4L20 7.1z" />
                            </svg>
                            <span>{formatVolume(token.buyVolume)}</span>
                          </div>

                          <div className="text-xs opacity-70">
                            {token.symbol}
                          </div>

                          <div className="flex items-center text-xs text-red-500">
                            <span>{formatVolume(token.sellVolume)}</span>
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 20"
                              className="ml-1"
                              fill="currentColor"
                            >
                              <path d="M4.2 14.1c0.1-0.1 0.2-0.1 0.4-0.1h15.6c0.2 0 0.3 0.2 0.2 0.4l-3.4 3.4c-0.1 0.1-0.2 0.1-0.4 0.1H0.4c-0.2 0-0.3-0.2-0.2-0.4l4-3.4z" />
                              <path d="M4.2 0.1c0.1-0.1 0.2-0.1 0.4-0.1h15.6c0.2 0 0.3 0.2 0.2 0.4l-3.4 3.4c-0.1 0.1-0.2 0.1-0.4 0.1H0.4c-0.2 0-0.3-0.2-0.2-0.4l4-3.4z" />
                              <path d="M20 7.1c-0.1-0.1-0.2-0.1-0.4-0.1H4c-0.2 0-0.3 0.2-0.2 0.4l3.4 3.4c0.1 0.1 0.2 0.1 0.4 0.1h15.6c0.2 0 0.3-0.2 0.2-0.4L20 7.1z" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 text-right">
                        {token.mint ? (
                          <span className="text-xs text-[var(--pip-glow-green)] hover:text-white transition-colors inline-flex items-center">
                            View Details
                            <FontAwesomeIcon
                              icon={faArrowRight}
                              className="ml-1"
                              style={{ width: "0.75rem", height: "0.75rem" }}
                            />
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            No mint address
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center p-8">
                  No tokens found. Try adjusting your filters.
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {tokens.length > 0 && (
              <div className="mt-6 flex justify-center items-center">
                <button
                  onClick={handlePrevPage}
                  disabled={!pagination.hasPrevPage || isLoading}
                  className={`mr-4 px-3 py-2 border border-[var(--pip-glow-green)] rounded flex items-center ${
                    !pagination.hasPrevPage || isLoading
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-[rgba(0,255,0,0.1)]"
                  }`}
                >
                  <FontAwesomeIcon
                    icon={faChevronLeft}
                    className="mr-2"
                    style={{ width: "0.75rem", height: "0.75rem" }}
                  />
                  Prev
                </button>

                <div className="text-sm text-[var(--pip-glow-green)]">
                  Page {pagination.currentPage + 1}
                </div>

                <button
                  onClick={handleNextPage}
                  disabled={!pagination.hasNextPage || isLoading}
                  className={`ml-4 px-3 py-2 border border-[var(--pip-glow-green)] rounded flex items-center ${
                    !pagination.hasNextPage || isLoading
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-[rgba(0,255,0,0.1)]"
                  }`}
                >
                  Next
                  <FontAwesomeIcon
                    icon={faChevronRight}
                    className="ml-2"
                    style={{ width: "0.75rem", height: "0.75rem" }}
                  />
                </button>
              </div>
            )}
          </>
        )}

        <div className="mt-6 text-center text-sm opacity-70">
          <p>Token data is refreshed in real-time from Trench API</p>
          <p className="mt-1">Data provided for the last {getTimePeriodLabel(period)}</p>
        </div>
      </div>
    </PipBoyLayout>
  );
}
