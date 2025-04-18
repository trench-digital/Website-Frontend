"use client";

import PipBoyLayout from "@/components/PipBoyLayout";
import { useGlobalState } from "@/context/GlobalStateContext";
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
  faFilter,
  faBullhorn,
  faClock,
  faCalendarAlt,
  faBars,
  faChevronDown,
  faArrowRight,
  faChevronLeft,
  faChevronRight,
  faRocket,
} from "@fortawesome/free-solid-svg-icons";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import trenchSDK, {
  Period,
  KeywordResponse,
  SortOrder as SDKSortOrder,
  TrenchApiError,
  KeywordCallVolumeResponse,
} from "@/lib/trenchPumpFunSdk";

// Define a type for our processed keyword data
interface ProcessedKeyword {
  keyword: string;
  description: string;
  score: number;
  timestamp: number;
  trend: "hot" | "rising" | "cooling";
  usages: {
    "30m": number;
    "1h": number;
    "3h": number;
    "6h": number;
    "12h": number;
    "24h": number;
  };
  volume: {
    "30m": number;
    "1h": number;
    "3h": number;
    "6h": number;
    "12h": number;
    "24h": number;
  };
  buyVolume: {
    "30m": number;
    "1h": number;
    "3h": number;
    "6h": number;
    "12h": number;
    "24h": number;
  };
  sellVolume: {
    "30m": number;
    "1h": number;
    "3h": number;
    "6h": number;
    "12h": number;
    "24h": number;
  };
  calls: {
    "30m": number;
    "1h": number;
    "3h": number;
    "6h": number;
    "12h": number;
    "24h": number;
  };
  migrationDuration?: number;
  migrationCount?: number;
}

// Define time period type
type TimePeriod = Period;

// Define sort metric type
type SortMetric = "volume" | "usage" | "recent" | "calls" | "migration";

/**
 * TODO: Future API improvements
 *
 * When available, consider these improvements:
 * - Use proper SortOrder type for all endpoints
 * - Handle pagination information from API responses
 */

// Map our sort metric to SDK SortOrder when possible
const _mapSortMetricToSortOrder = (metric: SortMetric): SDKSortOrder => {
  switch (metric) {
    case "volume":
      return "volume";
    case "calls":
      return "calls";
    case "migration":
      return "migration";
    case "recent":
      return "recent";
    // 'usage' is not part of the SDK's SortOrder type
    default:
      return "volume";
  }
};

// Define pagination info type
interface PaginationInfo {
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Helper function to safely check sort metric
const isMigrationMetric = (metric: SortMetric): boolean => {
  return metric === "migration";
};

export default function Keywords() {
  const {} = useGlobalState();
  const [sortMetric, setSortMetric] = useState<SortMetric>("volume");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("24h");
  const [keywords, setKeywords] = useState<ProcessedKeyword[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [refreshCooldown, setRefreshCooldown] = useState<boolean>(false);
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const router = useRouter();
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Ref to track loading state for WebSocket
  const loadingRef = useRef(loading);

  // Ref to track the last request parameters to avoid duplicate requests
  const lastRequestRef = useRef<{
    metric: SortMetric;
    period: TimePeriod;
    page: number;
    timestamp: number;
  } | null>(null);

  // Add a ref to track request cache
  const requestCache = useRef<Map<string, any>>(new Map());

  // Add refs to track current sort metric and pagination page for WebSocket
  const sortMetricRef = useRef<SortMetric>(sortMetric);
  const paginationRef = useRef<PaginationInfo>(pagination);

  // Update the refs when their values change
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    sortMetricRef.current = sortMetric;
  }, [sortMetric]);

  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);

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

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch keywords from the API based on the selected sort metric
  const fetchKeywords = useCallback(
    async (
      metric: SortMetric = sortMetric,
      period: TimePeriod = timePeriod,
      page: number = pagination.currentPage
    ) => {
      console.debug(
        `[Keywords] Fetching with metric=${metric}, period=${period}, page=${page}`
      );

      // Request abort controller ekleyelim
      const controller = new AbortController();
      const signal = controller.signal;

      try {
        // Create a cache key based on the request parameters
        const cacheKey = JSON.stringify({ metric, period, page });

        // Check if we have cached data
        if (requestCache.current.has(cacheKey)) {
          console.debug("[Keywords] Using cached data for:", cacheKey);
          const cachedData = requestCache.current.get(cacheKey);
          setKeywords(cachedData);
          return;
        }

        // Update last request ref immediately to prevent duplicate calls
        lastRequestRef.current = {
          metric,
          period,
          page,
          timestamp: Date.now(),
        };

        setLoading(true);
        setError(null);

        // Use the appropriate SDK method based on the sort metric
        let keywordResponses: KeywordResponse[] | KeywordCallVolumeResponse[] =
          [];

        // Each metric uses a dedicated endpoint
        switch (metric) {
          case "volume":
            keywordResponses = await trenchSDK.getKeywordsByVolume({
              period,
              page,
            });
            break;
          case "usage":
            keywordResponses = await trenchSDK.getKeywordsByUsage({
              period,
              page,
            });
            break;
          case "calls":
            keywordResponses = await trenchSDK.getKeywordsByCalls({
              period,
              page,
            });
            break;
          case "migration":
            keywordResponses = await trenchSDK.getKeywordsByMigration({
              period,
              page,
            });

            // Validate migration data
            if (!Array.isArray(keywordResponses)) {
              console.error(
                "[Keywords] Invalid response from migration endpoint:",
                keywordResponses
              );
              throw new Error("Invalid API response structure");
            }

            // Filter out keywords with invalid migration data
            keywordResponses = keywordResponses.filter((item) => {
              const isValid =
                item.migration?.meanDuration !== undefined &&
                typeof item.migration.meanDuration === "number" &&
                item.migration.meanDuration >= 0;
              if (!isValid) {
                console.warn(
                  `[Keywords] Invalid migration data for keyword ${item.keyword.keyword}:`,
                  item.migration
                );
              }
              return isValid;
            });
            break;
          case "recent":
            keywordResponses = await trenchSDK.getRecentKeywords({
              page,
            });
            break;
          default:
            keywordResponses = await trenchSDK.getKeywordsByVolume({
              period,
              page,
            });
        }

        // Process optimization
        const processedKeywords: ProcessedKeyword[] = keywordResponses.reduce(
          (acc: ProcessedKeyword[], item) => {
            if (!item?.keyword?.keyword) {
              console.debug("[Keywords] Skipping item with missing keyword");
              return acc;
            }

            // Validation logic
            const isValid =
              metric === "calls"
                ? Boolean(
                    (item as KeywordCallVolumeResponse)?.callVolume?.callVolume
                  )
                : Boolean(
                    (item as KeywordResponse)?.volume?.buy &&
                      (item as KeywordResponse)?.volume?.sell &&
                      (item as KeywordResponse)?.usage?.usage
                  );

            if (!isValid) {
              console.debug(
                `[Keywords] Invalid data for keyword: ${item.keyword.keyword}`
              );
              return acc;
            }

            // Process valid item
            // Calculate total volume for each time period
            const volume: Record<TimePeriod, number> = {
              "30m": 0,
              "1h": 0,
              "3h": 0,
              "6h": 0,
              "12h": 0,
              "24h": 0,
            };

            // Initialize buy and sell volume objects with SDK data
            const buyVolume: Record<TimePeriod, number> = {
              "30m": 0,
              "1h": 0,
              "3h": 0,
              "6h": 0,
              "12h": 0,
              "24h": 0,
            };

            const sellVolume: Record<TimePeriod, number> = {
              "30m": 0,
              "1h": 0,
              "3h": 0,
              "6h": 0,
              "12h": 0,
              "24h": 0,
            };

            // Get usage counts from the SDK
            const usages: Record<TimePeriod, number> = {
              "30m": 0,
              "1h": 0,
              "3h": 0,
              "6h": 0,
              "12h": 0,
              "24h": 0,
            };

            // Get calls counts
            const calls: Record<TimePeriod, number> = {
              "30m": 0,
              "1h": 0,
              "3h": 0,
              "6h": 0,
              "12h": 0,
              "24h": 0,
            };

            if (metric === "calls") {
              const callItem = item as KeywordCallVolumeResponse;
              // For calls endpoint, we only have call volume data
              calls["30m"] = callItem.callVolume.callVolume["30m"] || 0;
              calls["1h"] = callItem.callVolume.callVolume["1h"] || 0;
              calls["3h"] = callItem.callVolume.callVolume["3h"] || 0;
              calls["6h"] = callItem.callVolume.callVolume["6h"] || 0;
              calls["12h"] = callItem.callVolume.callVolume["12h"] || 0;
              calls["24h"] = callItem.callVolume.callVolume["24h"] || 0;
            } else {
              const keywordItem = item as KeywordResponse;
              // For other endpoints, we have full data
              buyVolume["30m"] = keywordItem.volume.buy["30m"] || 0;
              buyVolume["1h"] = keywordItem.volume.buy["1h"] || 0;
              buyVolume["3h"] = keywordItem.volume.buy["3h"] || 0;
              buyVolume["6h"] = keywordItem.volume.buy["6h"] || 0;
              buyVolume["12h"] = keywordItem.volume.buy["12h"] || 0;
              buyVolume["24h"] = keywordItem.volume.buy["24h"] || 0;

              sellVolume["30m"] = keywordItem.volume.sell["30m"] || 0;
              sellVolume["1h"] = keywordItem.volume.sell["1h"] || 0;
              sellVolume["3h"] = keywordItem.volume.sell["3h"] || 0;
              sellVolume["6h"] = keywordItem.volume.sell["6h"] || 0;
              sellVolume["12h"] = keywordItem.volume.sell["12h"] || 0;
              sellVolume["24h"] = keywordItem.volume.sell["24h"] || 0;

              usages["30m"] = keywordItem.usage.usage["30m"] || 0;
              usages["1h"] = keywordItem.usage.usage["1h"] || 0;
              usages["3h"] = keywordItem.usage.usage["3h"] || 0;
              usages["6h"] = keywordItem.usage.usage["6h"] || 0;
              usages["12h"] = keywordItem.usage.usage["12h"] || 0;
              usages["24h"] = keywordItem.usage.usage["24h"] || 0;

              calls["30m"] = keywordItem.callVolume?.callVolume?.["30m"] || 0;
              calls["1h"] = keywordItem.callVolume?.callVolume?.["1h"] || 0;
              calls["3h"] = keywordItem.callVolume?.callVolume?.["3h"] || 0;
              calls["6h"] = keywordItem.callVolume?.callVolume?.["6h"] || 0;
              calls["12h"] = keywordItem.callVolume?.callVolume?.["12h"] || 0;
              calls["24h"] = keywordItem.callVolume?.callVolume?.["24h"] || 0;
            }

            // Calculate volume for each time period
            Object.keys(volume).forEach((period) => {
              const typedPeriod = period as TimePeriod;
              const buyVol = buyVolume[typedPeriod];
              const sellVol = sellVolume[typedPeriod];
              volume[typedPeriod] = buyVol + sellVol;
            });

            // Calculate score and determine trend based on the selected metric
            let score = 0;
            let trend: "hot" | "rising" | "cooling" = "cooling";

            if (metric === "volume" || metric === "recent") {
              // Calculate score based on 24h volume (normalized to 0-100)
              const totalVolume = volume["24h"];
              score = Math.min(Math.round((totalVolume / 10000) * 100), 100);

              // Determine trend based on volume changes
              if (volume["1h"] > volume["3h"] / 3) {
                trend = "hot";
              } else if (volume["6h"] > volume["24h"] / 4) {
                trend = "rising";
              }
            } else if (metric === "usage") {
              // Calculate score based on 24h usage (normalized to 0-100)
              const totalUsage = usages["24h"];
              score = Math.min(Math.round((totalUsage / 300) * 100), 100);

              // Determine trend based on usage changes
              if (usages["1h"] > usages["3h"] / 3) {
                trend = "hot";
              } else if (usages["6h"] > usages["24h"] / 4) {
                trend = "rising";
              }
            } else if (metric === "calls") {
              // Calculate score based on 24h calls (normalized to 0-100)
              const totalCalls = calls["24h"];
              score = Math.min(Math.round((totalCalls / 150) * 100), 100);

              // Determine trend based on calls changes
              if (calls["1h"] > calls["3h"] / 3) {
                trend = "hot";
              } else if (calls["6h"] > calls["24h"] / 4) {
                trend = "rising";
              }
            } else if (metric === "migration") {
              // Calculate score based on migration duration (normalized to 0-100)
              // Lower duration = higher score (faster migration is better)
              const migrationDuration = (item as KeywordResponse).migration
                ?.meanDuration;

              // Validate migration duration
              if (
                typeof migrationDuration !== "number" ||
                migrationDuration < 0
              ) {
                console.warn(
                  `[Keywords] Invalid migration duration for keyword ${item.keyword.keyword}:`,
                  migrationDuration
                );
                score = 0; // Set lowest score for invalid data
                trend = "cooling";
              } else {
                // Max score for migrations under 1 hour (3,600,000 ms)
                // Min score for migrations over 24 hours (86,400,000 ms)
                if (migrationDuration <= 3600000) {
                  score = 100;
                  trend = "hot";
                } else if (migrationDuration >= 86400000) {
                  score = 10;
                  trend = "cooling";
                } else {
                  // Linear scale between 1 hour and 24 hours
                  score =
                    100 -
                    Math.round(
                      ((migrationDuration - 3600000) / (86400000 - 3600000)) *
                        90
                    );
                  trend = "rising";
                }
              }
            }

            // Get timestamp from createdAt
            const timestamp = new Date(item.keyword.createdAt).getTime();

            acc.push({
              keyword: item.keyword.keyword,
              description: item.keyword.description || "",
              score,
              timestamp,
              trend,
              usages,
              volume,
              buyVolume,
              sellVolume,
              calls,
              migrationDuration:
                (item as KeywordResponse).migration?.meanDuration || 0, // Ensure we have a valid number
              migrationCount: (item as KeywordResponse).migration?.count || 0, // Store migration count
            });

            return acc;
          },
          []
        );

        // Update the pagination logic in fetchKeywords
        setPagination({
          currentPage: page,
          hasNextPage: keywordResponses.length > 0, // Enable next button only if we have results
          hasPrevPage: page > 0,
        });

        // Cache the processed keywords
        requestCache.current.set(cacheKey, processedKeywords);

        setKeywords(processedKeywords);
      } catch (err) {
        const errorMessage =
          err instanceof TrenchApiError
            ? `API error: ${err.message}`
            : err instanceof Error
            ? err.message
            : "Failed to fetch keywords";

        console.error("[Keywords] Error fetching keywords:", errorMessage);
        setError("Failed to fetch keywords. Please try again later.");

        if (process.env.NODE_ENV === "development") {
          // Add some placeholder keywords if the API fails in development
          const placeholders = [
            {
              keyword: "AI",
              description: "Artificial Intelligence tokens",
              timestamp: Date.now(),
              score: 95,
              trend: "hot" as const,
              usages: {
                "30m": 5,
                "1h": 15,
                "3h": 45,
                "6h": 87,
                "12h": 153,
                "24h": 273,
              },
              volume: {
                "30m": 500,
                "1h": 1500,
                "3h": 3500,
                "6h": 5000,
                "12h": 7500,
                "24h": 9500,
              },
              calls: {
                "30m": 8,
                "1h": 25,
                "3h": 65,
                "6h": 120,
                "12h": 180,
                "24h": 320,
              },
              migrationDuration: 3600000, // 1 hour in milliseconds
              migrationCount: 12, // Add migration count
              buyVolume: {
                "30m": 300,
                "1h": 900,
                "3h": 2100,
                "6h": 3000,
                "12h": 4500,
                "24h": 5700,
              },
              sellVolume: {
                "30m": 200,
                "1h": 600,
                "3h": 1400,
                "6h": 2000,
                "12h": 3000,
                "24h": 3800,
              },
            },
            {
              keyword: "MEME",
              description: "Meme-themed tokens",
              timestamp: Date.now() - 100000,
              score: 92,
              trend: "hot" as const,
              usages: {
                "30m": 4,
                "1h": 12,
                "3h": 38,
                "6h": 75,
                "12h": 140,
                "24h": 250,
              },
              volume: {
                "30m": 450,
                "1h": 1400,
                "3h": 3300,
                "6h": 4800,
                "12h": 7200,
                "24h": 9200,
              },
              calls: {
                "30m": 12,
                "1h": 35,
                "3h": 80,
                "6h": 145,
                "12h": 210,
                "24h": 280,
              },
              migrationDuration: 5400000, // 1.5 hours in milliseconds
              migrationCount: 8, // Add migration count
              buyVolume: {
                "30m": 250,
                "1h": 800,
                "3h": 1800,
                "6h": 2600,
                "12h": 4000,
                "24h": 5000,
              },
              sellVolume: {
                "30m": 200,
                "1h": 600,
                "3h": 1500,
                "6h": 2200,
                "12h": 3200,
                "24h": 4200,
              },
            },
            {
              keyword: "SOLANA",
              description: "Solana ecosystem tokens",
              timestamp: Date.now() - 200000,
              score: 88,
              trend: "rising" as const,
              usages: {
                "30m": 3,
                "1h": 10,
                "3h": 32,
                "6h": 68,
                "12h": 125,
                "24h": 220,
              },
              volume: {
                "30m": 400,
                "1h": 1300,
                "3h": 3100,
                "6h": 4500,
                "12h": 6800,
                "24h": 8800,
              },
              calls: {
                "30m": 6,
                "1h": 18,
                "3h": 45,
                "6h": 95,
                "12h": 150,
                "24h": 240,
              },
              migrationDuration: 7200000, // 2 hours in milliseconds
              migrationCount: 5, // Add migration count
              buyVolume: {
                "30m": 220,
                "1h": 700,
                "3h": 1700,
                "6h": 2500,
                "12h": 3700,
                "24h": 4800,
              },
              sellVolume: {
                "30m": 180,
                "1h": 600,
                "3h": 1400,
                "6h": 2000,
                "12h": 3100,
                "24h": 4000,
              },
            },
          ];

          setKeywords(placeholders);
        } else {
          // In production, don't show placeholder data
          setKeywords([]);
        }
      } finally {
        setLoading(false);
        controller.abort();
      }
    },
    [sortMetric, timePeriod, pagination.currentPage]
  );

  // Initial data fetch on component mount
  useEffect(() => {
    console.debug("[Keywords] Initial effect running");

    // Clear the entire request cache on initial page load
    requestCache.current.clear();
    console.debug("[Keywords] Request cache cleared on page load");

    fetchKeywords(sortMetric, timePeriod, 0); // Changed from 1 to 0 for zero-based pagination
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch when sortMetric or timePeriod changes
  useEffect(() => {
    // Skip the initial render
    if (!lastRequestRef.current || loading) return;

    // Only fetch if the metric or period is different from the last request
    const lastRequest = lastRequestRef.current;
    if (
      lastRequest.metric !== sortMetric ||
      lastRequest.period !== timePeriod
    ) {
      console.debug("[Keywords] Parameters changed, fetching new data");
      // Reset to page 0 when changing filters
      setPagination((prev) => ({
        ...prev,
        currentPage: 0, // Changed from 1 to 0 for zero-based pagination
        hasNextPage: true,
      }));
      fetchKeywords(sortMetric, timePeriod, 0); // Changed from 1 to 0 for zero-based pagination
    }
  }, [sortMetric, timePeriod, fetchKeywords, loading]);

  // Fetch when page changes
  useEffect(() => {
    // Skip the initial render
    if (!lastRequestRef.current || loading) return;

    // Only fetch if the page is different from the last request
    const lastRequest = lastRequestRef.current;
    if (lastRequest.page !== pagination.currentPage) {
      console.debug("[Keywords] Page changed, fetching new data");
      fetchKeywords(sortMetric, timePeriod, pagination.currentPage);
    }
  }, [pagination.currentPage, sortMetric, timePeriod, fetchKeywords, loading]);

  // Handle sort metric change
  const handleSortMetricChange = useCallback(
    (metric: SortMetric) => {
      // Only update if it's a different metric
      if (metric !== sortMetric) {
        console.debug(
          `[Keywords] Changing sort metric from ${sortMetric} to ${metric}`
        );

        // Clear the request cache for the new metric
        const cacheKeys = Array.from(requestCache.current.keys());
        cacheKeys.forEach((key) => {
          try {
            const cacheData = JSON.parse(key);
            if (cacheData.metric === metric) {
              console.debug("[Keywords] Clearing cache for key:", key);
              requestCache.current.delete(key);
            }
          } catch (_e) {
            // Skip invalid cache keys
          }
        });

        // Reset pagination to start page
        setPagination((prev) => ({
          ...prev,
          currentPage: 0,
          hasNextPage: true,
        }));

        setSortMetric(metric);
      }
    },
    [sortMetric]
  );

  // Handle pagination
  const handleNextPage = useCallback(() => {
    if (!loading) {
      // When going to the next page, always allow moving to next page
      // We'll determine if there are more results when we get the response
      const nextPage = pagination.currentPage + 1;

      // Update pagination immediately to prevent duplicate clicks
      setPagination((prev) => ({
        ...prev,
        currentPage: nextPage,
        hasNextPage: true, // Assume there are more pages until we know otherwise
      }));

      // fetchKeywords will update hasNextPage based on results
      fetchKeywords(sortMetric, timePeriod, nextPage);
    }
  }, [loading, pagination.currentPage, sortMetric, timePeriod, fetchKeywords]);

  const handlePrevPage = useCallback(() => {
    if (pagination.hasPrevPage && !loading) {
      setPagination((prev) => ({
        ...prev,
        currentPage: prev.currentPage - 1,
      }));
    }
  }, [pagination.hasPrevPage, loading]);

  // No need to sort keywords as the API endpoints already provide sorted data
  // Just use the keywords array directly
  const sortedKeywords = useMemo(() => {
    return keywords;
  }, [keywords]);

  // Handle refresh button click with debounce
  const handleRefresh = useCallback(() => {
    if (refreshCooldown || loading) {
      return;
    }

    fetchKeywords(sortMetric, timePeriod, pagination.currentPage);
    setRefreshCooldown(true);

    // Set a cooldown of 2 seconds to prevent rapid clicking
    setTimeout(() => {
      setRefreshCooldown(false);
    }, 2000);
  }, [
    refreshCooldown,
    loading,
    fetchKeywords,
    sortMetric,
    timePeriod,
    pagination.currentPage,
  ]);

  // Format volume for display - memoize to prevent unnecessary recalculations
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

  // Format migration duration for display
  const formatMigrationDuration = useCallback((duration?: number): string => {
    if (!duration) return "N/A";

    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

    if (hours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  }, []);

  // Get display value based on sort metric
  const getDisplayValue = useCallback(
    (item: ProcessedKeyword) => {
      if (sortMetric === "volume") {
        return (
          <div className="flex items-center">
            {formatVolume(item.volume[timePeriod])}
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
          </div>
        );
      } else if (sortMetric === "usage") {
        return (
          <div className="flex items-center">
            {item.usages[timePeriod]}
            <FontAwesomeIcon
              icon={faUsers}
              className="ml-1 text-[var(--pip-glow-green)]"
              style={{ width: "0.875rem", height: "0.875rem" }}
            />
          </div>
        );
      } else if (sortMetric === "calls") {
        return (
          <div className="flex items-center">
            {item.calls[timePeriod]}
            <FontAwesomeIcon
              icon={faBullhorn}
              className="ml-1 text-[var(--pip-glow-green)]"
              style={{ width: "0.875rem", height: "0.875rem" }}
            />
          </div>
        );
      } else if (sortMetric === "migration") {
        return (
          <div className="flex items-center">
            <span title="Average migration time">
              {formatMigrationDuration(item.migrationDuration)}
            </span>
            <FontAwesomeIcon
              icon={faClock}
              className="ml-1 text-[var(--pip-glow-green)]"
              style={{ width: "0.875rem", height: "0.875rem" }}
            />
          </div>
        );
      } else {
        // For 'recent' sort metric
        return (
          <div className="flex items-center">
            {formatVolume(item.volume[timePeriod])}
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
          </div>
        );
      }
    },
    [sortMetric, timePeriod, formatVolume, formatMigrationDuration]
  );

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchKeyword.trim()) {
      router.push(`/keyword/${encodeURIComponent(searchKeyword.trim())}`);
    }
  };

  return (
    <PipBoyLayout>
      <div className="pip-border p-4 md:p-6 w-full h-full overflow-auto">
        {/* Header with title and filter buttons */}
        <div className="flex justify-between items-center mb-6 border-b border-[var(--pip-glow-green)] pb-4">
          <h2 className="text-2xl md:text-3xl text-[var(--pip-glow-green)] drop-shadow-[0_0_4px_var(--pip-glow-green)] flex items-center">
            <FontAwesomeIcon
              icon={faHashtag}
              className="mr-3 text-[var(--pip-glow-green)]"
              style={{ width: "1.5rem", height: "1.5rem" }}
            />
            TRENDING KEYWORDS
          </h2>

          {/* Mobile dropdown menu */}
          <div className="md:hidden relative" ref={mobileMenuRef}>
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
                switch (sortMetric) {
                  case "volume":
                    return "Volume";
                  case "usage":
                    return "Usage";
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
              <div className="absolute right-0 top-full mt-1 bg-black border border-[var(--pip-glow-green)] rounded shadow-lg z-10 w-48">
                <div className="px-3 py-2 text-sm">
                  <label className="text-xs text-[var(--pip-glow-green)] block mb-1 font-bold">
                    Sort By
                  </label>
                  <button
                    onClick={() => {
                      handleSortMetricChange("volume");
                      setShowMobileMenu(false);
                    }}
                    className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors ${
                      sortMetric === "volume" ? "bg-[rgba(0,255,0,0.2)]" : ""
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={faChartLine}
                      className="mr-2"
                      style={{ width: "0.875rem", height: "0.875rem" }}
                    />
                    Volume
                  </button>
                  <button
                    onClick={() => {
                      handleSortMetricChange("usage");
                      setShowMobileMenu(false);
                    }}
                    className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors ${
                      sortMetric === "usage" ? "bg-[rgba(0,255,0,0.2)]" : ""
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={faUsers}
                      className="mr-2"
                      style={{ width: "0.875rem", height: "0.875rem" }}
                    />
                    Usage
                  </button>
                  <button
                    onClick={() => {
                      handleSortMetricChange("calls");
                      setShowMobileMenu(false);
                    }}
                    className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors ${
                      sortMetric === "calls" ? "bg-[rgba(0,255,0,0.2)]" : ""
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
                      handleSortMetricChange("migration");
                      setShowMobileMenu(false);
                    }}
                    className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors ${
                      sortMetric === "migration" ? "bg-[rgba(0,255,0,0.2)]" : ""
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={faRocket}
                      className="mr-2"
                      style={{ width: "0.875rem", height: "0.875rem" }}
                    />
                    Migration
                  </button>
                  <button
                    onClick={() => {
                      handleSortMetricChange("recent");
                      setShowMobileMenu(false);
                    }}
                    className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors ${
                      sortMetric === "recent" ? "bg-[rgba(0,255,0,0.2)]" : ""
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={faCalendarAlt}
                      className="mr-2"
                      style={{ width: "0.875rem", height: "0.875rem" }}
                    />
                    Recent
                  </button>
                </div>

                <div className="border-t border-[var(--pip-glow-green)] my-1"></div>

                {/* Time period filters in mobile dropdown */}
                <div className="px-3 py-2 text-sm">
                  <label className="text-xs text-[var(--pip-glow-green)] block mb-1 font-bold">
                    Time Period
                  </label>
                  <select
                    className="w-full border border-[var(--pip-glow-green)] px-2 py-1 text-xs rounded bg-black"
                    value={timePeriod}
                    onChange={(e) => {
                      setTimePeriod(e.target.value as TimePeriod);
                      setShowMobileMenu(true);
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

          {/* Desktop filter buttons */}
          <div className="hidden md:flex gap-2 flex-wrap justify-end">
            <button
              onClick={() => handleSortMetricChange("volume")}
              className={`border border-[var(--pip-glow-green)] px-3 py-1 text-sm rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors ${
                sortMetric === "volume" ? "bg-[rgba(0,255,0,0.2)]" : ""
              }`}
            >
              <FontAwesomeIcon
                icon={faChartLine}
                className="mr-2"
                style={{ width: "0.875rem", height: "0.875rem" }}
              />
              Volume
            </button>
            <button
              onClick={() => handleSortMetricChange("usage")}
              className={`border border-[var(--pip-glow-green)] px-3 py-1 text-sm rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors ${
                sortMetric === "usage" ? "bg-[rgba(0,255,0,0.2)]" : ""
              }`}
            >
              <FontAwesomeIcon
                icon={faUsers}
                className="mr-2"
                style={{ width: "0.875rem", height: "0.875rem" }}
              />
              Usage
            </button>
            <button
              onClick={() => handleSortMetricChange("calls")}
              className={`border border-[var(--pip-glow-green)] px-3 py-1 text-sm rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors ${
                sortMetric === "calls" ? "bg-[rgba(0,255,0,0.2)]" : ""
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
              onClick={() => handleSortMetricChange("migration")}
              className={`border border-[var(--pip-glow-green)] px-3 py-1 text-sm rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors ${
                sortMetric === "migration" ? "bg-[rgba(0,255,0,0.2)]" : ""
              }`}
            >
              <FontAwesomeIcon
                icon={faRocket}
                className="mr-2"
                style={{ width: "0.875rem", height: "0.875rem" }}
              />
              Migration
            </button>
            <button
              onClick={() => handleSortMetricChange("recent")}
              className={`border border-[var(--pip-glow-green)] px-3 py-1 text-sm rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors ${
                sortMetric === "recent" ? "bg-[rgba(0,255,0,0.2)]" : ""
              }`}
            >
              <FontAwesomeIcon
                icon={faCalendarAlt}
                className="mr-2"
                style={{ width: "0.875rem", height: "0.875rem" }}
              />
              Recent
            </button>
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
              {showFilters ? "Hide Filters" : "Filters"}
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search for a keyword..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full bg-black border border-[var(--pip-glow-green)] rounded px-3 py-2 text-[var(--pip-glow-green)] placeholder-[color:rgba(0,255,0,0.5)] focus:outline-none focus:shadow-[0_0_8px_var(--pip-glow-green)]"
              />
            </div>
            <button
              type="submit"
              className="border border-[var(--pip-glow-green)] bg-[rgba(0,255,0,0.1)] px-4 py-2 rounded hover:bg-[rgba(0,255,0,0.2)] text-[var(--pip-glow-green)] transition-colors"
            >
              <FontAwesomeIcon
                icon={faArrowRight}
                style={{ width: "0.875rem", height: "0.875rem" }}
              />
            </button>
          </form>
        </div>

        {/* Time period filter bar - only show in desktop view */}
        {showFilters && (
          <div className="mb-6 hidden md:block">
            <div className="border border-[var(--pip-glow-green)] rounded p-3 mb-2">
              <h3 className="text-md font-bold text-[var(--pip-glow-green)] mb-2">
                <FontAwesomeIcon
                  icon={faClock}
                  className="mr-2"
                  style={{ width: "0.875rem", height: "0.875rem" }}
                />
                Time Period
              </h3>
              <div className="grid grid-cols-6 gap-2">
                {(["30m", "1h", "3h", "6h", "12h", "24h"] as TimePeriod[]).map(
                  (period) => (
                    <button
                      key={period}
                      onClick={() => setTimePeriod(period)}
                      className={`border border-[var(--pip-glow-green)] px-2 py-1 text-xs rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors ${
                        timePeriod === period ? "bg-[rgba(0,255,0,0.2)]" : ""
                      }`}
                    >
                      {getTimePeriodLabel(period)}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FontAwesomeIcon
              icon={faSpinner}
              className="text-4xl text-[var(--pip-glow-green)] animate-spin mb-4"
              style={{ width: "1.5rem", height: "1.5rem" }}
            />
            <p className="text-[var(--pip-glow-green)]">
              Loading trending keywords...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              className="text-4xl text-yellow-400 mb-4"
              style={{ width: "1.5rem", height: "1.5rem" }}
            />
            <p className="text-yellow-400 mb-2">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-4 border border-[var(--pip-glow-green)] px-3 py-1 text-xs rounded hover:bg-[rgba(0,255,0,0.1)] transition-colors"
            >
              <FontAwesomeIcon
                icon={faSpinner}
                className="mr-2"
                style={{ width: "0.75rem", height: "0.75rem" }}
              />
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedKeywords.map((item, index) => (
                <Link
                  key={index}
                  href={`/keyword/${encodeURIComponent(item.keyword)}`}
                  className="block h-full"
                >
                  <div className="border border-[var(--pip-glow-green)] rounded p-4 hover:bg-[rgba(0,255,0,0.05)] transition-colors duration-300 cursor-pointer flex flex-col h-full">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center bg-[rgba(0,255,0,0.1)] rounded-full">
                          <span className="text-[var(--pip-glow-green)] font-bold text-base drop-shadow-[0_0_3px_var(--pip-glow-green)]">
                            #{index + 1}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white drop-shadow-[0_0_2px_var(--pip-glow-green)]">
                            {item.keyword.toUpperCase()}
                          </h3>
                          <p className="text-xs opacity-80">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-[var(--pip-glow-green)] flex items-center justify-end">
                          {getDisplayValue(item)}
                        </div>
                        <div className="text-xs">
                          {item.trend === "hot" ? (
                            <span className="text-green-400">
                              <FontAwesomeIcon
                                icon={faFire}
                                className="mr-1"
                                style={{ width: "0.75rem", height: "0.75rem" }}
                              />
                              Hot
                            </span>
                          ) : item.trend === "rising" ? (
                            <span className="text-yellow-400">
                              <FontAwesomeIcon
                                icon={faArrowUp}
                                className="mr-1"
                                style={{ width: "0.75rem", height: "0.75rem" }}
                              />
                              Rising
                            </span>
                          ) : (
                            <span className="text-gray-400">
                              <FontAwesomeIcon
                                icon={faArrowDown}
                                className="mr-1"
                                style={{ width: "0.75rem", height: "0.75rem" }}
                              />
                              Cooling
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex-1">
                      {sortMetric !== "usage" && sortMetric !== "calls" ? (
                        <>
                          {/* Volume Bar Container - Updated Styling with reduced height */}
                          <div className="w-full bg-[rgba(0,0,0,0.5)] border border-[var(--pip-glow-green)] rounded h-5 overflow-hidden flex relative shadow-[0_0_8px_rgba(0,255,0,0.3)_inset] shadow-inner text-xs font-bold">
                            {/* IIFE for bar logic */}
                            {(() => {
                              // Get buy and sell volumes for the current time period
                              const buyVolume = item.buyVolume[timePeriod];
                              const sellVolume = item.sellVolume[timePeriod];
                              const totalVolume = buyVolume + sellVolume;

                              // Calculate percentages, handle totalVolume = 0
                              let buyPercentage = 0.5;
                              let sellPercentage = 0.5;
                              if (totalVolume > 0) {
                                buyPercentage = buyVolume / totalVolume;
                                sellPercentage = sellVolume / totalVolume;
                              }

                              // Calculate widths with minimum visibility (e.g., 5%)
                              let buyWidthPercent = buyPercentage * 100;
                              let sellWidthPercent = sellPercentage * 100;
                              const minWidth = 5; // Minimum percentage width

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
                                sellWidthPercent = 100;
                                buyWidthPercent = 0;
                              } else {
                                // If both are 0, make them 50/50
                                buyWidthPercent = 50;
                                sellWidthPercent = 50;
                              }

                              // Format for display
                              const buyWidthStyle = `${buyWidthPercent}%`;
                              const sellWidthStyle = `${sellWidthPercent}%`;
                              const buyPercentText = `${(
                                buyPercentage * 100
                              ).toFixed(1)}%`;
                              const sellPercentText = `${(
                                sellPercentage * 100
                              ).toFixed(1)}%`;

                              // Determine rocket color
                              let rocketColorClass = "text-white"; // Default/equal
                              if (buyPercentage > sellPercentage + 0.001) { // Add small tolerance for floating point
                                rocketColorClass = "text-green-400";
                              } else if (sellPercentage > buyPercentage + 0.001) {
                                rocketColorClass = "text-red-400";
                              }

                              return (
                                <>
                                  {/* Buy Section - Added Arrow Icon, Left Align, Darker Green */}
                                  <div
                                    className="bg-green-700 h-full flex items-center justify-start text-white relative px-2 z-0"
                                    style={{ width: buyWidthStyle, transition: 'width 0.3s ease-in-out' }}
                                    title={`Buy Volume: ${formatVolume(
                                      buyVolume
                                    )} (${buyPercentText})`}
                                  >
                                    {buyWidthPercent >= 20 && ( // Show text and icon if wide enough
                                      <span className="flex items-center">
                                        <FontAwesomeIcon icon={faArrowUp} className="mr-1" style={{ width: '0.65rem', height: '0.65rem' }}/>
                                        {buyPercentText}
                                      </span>
                                    )}
                                  </div>

                                  {/* Sell Section - Added Arrow Icon & Darker Red, Right Align */}
                                  <div
                                    className="bg-red-700 h-full flex items-center justify-end text-white relative px-2 z-0"
                                    style={{ width: sellWidthStyle, transition: 'width 0.3s ease-in-out' }}
                                    title={`Sell Volume: ${formatVolume(
                                      sellVolume
                                    )} (${sellPercentText})`}
                                  >
                                    {sellWidthPercent >= 20 && ( // Show text and icon if wide enough
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
                                      style={{ left: buyWidthStyle, transform: 'translateX(-50%)', transition: 'left 0.3s ease-in-out' }} // Added transition
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
                                </>
                              );
                            })()}
                          </div>
                          {/* End Volume Bar Container */}

                          {/* Labels Below Bar - Keep existing structure */}
                          <div className="flex justify-between mt-1 text-xs">
                            <div className="flex items-center text-[var(--pip-glow-green)]">
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
                              <span>
                                {formatVolume(item.buyVolume[timePeriod])}
                              </span>
                            </div>
                            <div className="flex items-center text-amber-400">
                              <FontAwesomeIcon
                                icon={faRocket}
                                className="mr-1"
                                style={{ width: "0.75rem", height: "0.75rem" }}
                              />
                              {isMigrationMetric(sortMetric) ? (
                                <span>
                                  {item.migrationCount || 0} migrations
                                </span>
                              ) : (
                                <span>
                                  {formatMigrationDuration(
                                    item.migrationDuration
                                  )}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center text-red-400">
                              <span>
                                {formatVolume(item.sellVolume[timePeriod])}
                              </span>
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 20"
                                className="ml-1 text-red-400"
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
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-center text-xs">
                          <div className="flex items-center text-amber-400">
                            <FontAwesomeIcon
                              icon={faRocket}
                              className="mr-1"
                              style={{ width: "0.75rem", height: "0.75rem" }}
                            />
                            {isMigrationMetric(sortMetric) ? (
                              <span>
                                {item.migrationCount || 0} migrations ·{" "}
                                <span title="Average migration time">
                                  {formatMigrationDuration(
                                    item.migrationDuration
                                  )}
                                </span>
                              </span>
                            ) : (
                              <span>
                                {formatMigrationDuration(
                                  item.migrationDuration
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* View Details Button */}
                    <div className="mt-3 text-right">
                      <span className="inline-flex items-center text-xs text-[var(--pip-glow-green)] hover:text-white transition-colors">
                        View Details
                        <FontAwesomeIcon
                          icon={faArrowRight}
                          className="ml-1"
                          style={{ width: "0.75rem", height: "0.75rem" }}
                        />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="mt-6 flex justify-center items-center">
              <button
                onClick={handlePrevPage}
                disabled={!pagination.hasPrevPage || loading}
                className={`mr-4 px-3 py-2 border border-[var(--pip-glow-green)] rounded flex items-center ${
                  !pagination.hasPrevPage || loading
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
                disabled={loading}
                className={`ml-4 px-3 py-2 border border-[var(--pip-glow-green)] rounded flex items-center ${
                  loading
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
          </>
        )}

        <div className="mt-6 text-center text-sm opacity-70">
          <p>
            Keywords are extracted from token metadata and categorized by AI
          </p>
          <p className="mt-1">
            Data provided by Trench PumpFun API for the last{" "}
            {getTimePeriodLabel(timePeriod)}
          </p>
          {isMigrationMetric(sortMetric) && (
            <p className="mt-1">
              Migration sorting ranks keywords by number of token migrations.
              Numbers show migration count and average time between token
              creation and migration.
            </p>
          )}
          <button
            onClick={handleRefresh}
            disabled={loading || refreshCooldown}
            className={`mt-2 border border-[var(--pip-glow-green)] px-3 py-1 text-xs rounded transition-colors ${
              loading || refreshCooldown
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-[rgba(0,255,0,0.1)]"
            }`}
          >
            <FontAwesomeIcon
              icon={faSpinner}
              className={`mr-2 ${loading ? "animate-spin" : ""}`}
              style={{ width: "0.75rem", height: "0.75rem" }}
            />
            Refresh Data
          </button>
        </div>
      </div>
    </PipBoyLayout>
  );
}
