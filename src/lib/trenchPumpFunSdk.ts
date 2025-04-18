/**
 * Trench PumpFun API SDK
 *
 * A client-side SDK for interacting with the Trench PumpFun API.
 * This SDK provides methods for all endpoints documented in the Trench PumpFun API.
 *
 * Features:
 * - Intelligent caching to reduce API calls
 * - Rate limiting to prevent API abuse
 * - Browser localStorage persistence for caches
 * - TypeScript interfaces aligned with API response formats
 * - Comprehensive access to all creation and keyword endpoints
 *
 * @version 1.1.0
 * @see https://api.trench.digital
 */

// type definitions for the sdk responses
export interface PaginationInfo {
  page: number;
  pageSize: number;
  // totalPages is not reliable since we don't know how many items total
  // hasMore property is replaced with logic based on array length
}

// volume data structure used in multiple entities
export interface VolumeData {
  "30m": number;
  "1h": number;
  "3h": number;
  "6h": number;
  "12h": number;
  "24h": number;
}

// creation metadata structure
export interface CreationMetadata {
  name?: string;
  symbol?: string;
  description?: string;
  image?: string;
  twitter?: string;
  website?: string;
  telegram?: string;
  createdOn?: string | null;
}

// call data structure
export interface CallData {
  mint: string;
  url: string;
  username: string;
  createdAt: string;
  text?: string;
  creation?: string;
}

// detailed creation structure based on API documentation
export interface CreationDetail {
  mint: string;
  bondingCurve: string;
  user: string;
  signature: string;
  metadata: CreationMetadata;
  keywords: string[] | null;
  migration: {
    signature: string;
    migratedAt: string;
  } | null;
  createdAt: string;
}

// simplified creation structure for lists
export interface Creation {
  mint: string;
  bondingCurve: string;
  user: string;
  signature: string;
  metadata: CreationMetadata;
  keywords: string[] | null;
  migration?: {
    signature: string;
    migratedAt: string;
  } | null;
  createdAt: string;
  // for convenience, volume data is sometimes included directly in some endpoints
  buyVolume?: VolumeData;
  sellVolume?: VolumeData;
  lastTradedAt?: string;
}

// full creation response with volume data
export interface CreationResponse {
  creation: CreationDetail;
  volume: {
    buy: VolumeData;
    sell: VolumeData;
    lastTradeDate: string | null;
  };
  callVolume: {
    callVolume: VolumeData;
    lastCallDate: string | null;
  };
  calls?: {
    call: CallData;
    volumeChange1H: number;
  }[];
  // for migration endpoint
  migrationSpeed?: number;
  migrationTimeFormatted?: string;
  migratedOn?: string;
}

// creation call with generated volume
export interface CreationCall {
  call: CallData;
  generatedVolume1H: number;
}

// creation with calls
export interface CreationWithCalls {
  creation: Creation;
  buyVolume: VolumeData;
  sellVolume: VolumeData;
  lastTradedAt: string;
  calls: CreationCall[];
}

// keyword detail structure from API docs
export interface KeywordDetail {
  keyword: string;
  description: string;
  embedding: number[] | null;
  createdAt: string;
}

// full keyword response with stats
export interface KeywordResponse {
  keyword: KeywordDetail;
  volume: {
    buy: VolumeData;
    sell: VolumeData;
    lastTradeDate: string;
  };
  callVolume?: {
    callVolume: VolumeData;
    lastTradeDate: string;
    lastCallMint: string;
  };
  migration: {
    count: number;
    meanDuration: number;
  };
  usage: {
    usage: VolumeData;
    lastUsageDate: string;
  };
  calls?: {
    call: CallData;
    volumeChange1H: number;
  }[];
}

// user calls response
export interface UserCallsResponse {
  creationCalls: {
    creation: Creation;
    call: CallData;
    generatedVolume: number;
  }[];
  keywordCalls: {
    keyword: string;
    calls: CallData[];
  }[];
  totalCalls: number;
  pagination: PaginationInfo;
}

// caller stats
export interface CallerStats {
  username: string;
  callCounts: VolumeData;
  totalMigrated: number;
}

export type Period = "30m" | "1h" | "3h" | "6h" | "12h" | "24h";
export type SortOrder = "volume" | "recent" | "calls" | "migration";

// error handler class
export class TrenchApiError extends Error {
  public readonly status: number;
  public readonly endpoint: string;

  constructor(message: string, status: number, endpoint: string) {
    super(message);
    this.name = "TrenchApiError";
    this.status = status;
    this.endpoint = endpoint;
    Object.setPrototypeOf(this, TrenchApiError.prototype);
  }
}

// creation with calls response from the API
export interface CreationWithCallsResponse {
  creation: {
    mint: string;
    name: string;
    symbol: string;
    image: string;
    user: string;
    bondingCurve: string;
    signature: string;
    metadata: CreationMetadata;
    createdAt: string;
    keywords: string[];
  };
  buyVolume: VolumeData;
  sellVolume: VolumeData;
  lastTradedAt: string;
  calls: {
    call: CallData;
    generatedVolume1H: number;
  }[];
}

// keyword call volume response type
export interface KeywordCallVolumeResponse {
  keyword: {
    keyword: string;
    description: string;
    createdAt: string;
    embedding: number[] | null;
  };
  callVolume: {
    callVolume: VolumeData;
    lastCallDate: string;
    lastCallMint: string;
  };
  migration: {
    count: number;
    meanDuration: number;
  };
}

// the main sdk class
export class TrenchPumpFunSDK {
  private readonly baseUrl: string;
  private readonly defaultHeaders: HeadersInit;
  private requestCache: Map<string, { data: unknown; timestamp: number }> =
    new Map();
  private readonly cacheTTL: number = 30000; // 30 seconds cache TTL
  private lastRequestTime: number = 0;
  private readonly MIN_REQUEST_INTERVAL = 500; // minimum time between requests in milliseconds
  // Default page size for pagination
  private readonly DEFAULT_PAGE_SIZE = 10;
  private inFlightRequests: Map<string, Promise<unknown>> = new Map();

  /**
   * constructs a new instance of the trench pumpfun sdk
   *
   * @param {Object} options - configuration options for the sdk
   * @param {string} [options.baseUrl] - custom base url for the api (default: https://api.trench.digital)
   * @param {HeadersInit} [options.headers] - custom headers to include in all requests
   * @param {number} [options.cacheTTL] - cache time-to-live in milliseconds (default: 30000ms)
   */
  constructor(
    options: {
      baseUrl?: string;
      headers?: HeadersInit;
      cacheTTL?: number;
    } = {}
  ) {
    this.baseUrl = options.baseUrl || "https://api.trench.digital/api";
    this.defaultHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    };
    if (options.cacheTTL) {
      this.cacheTTL = options.cacheTTL;
    }

    // initialize from browser cache if available
    this.initializeCacheFromBrowserStorage();
  }

  /**
   * initialize cache from browser storage
   * @private
   */
  private initializeCacheFromBrowserStorage(): void {
    if (typeof window === "undefined") {
      console.log(
        "[SDK] Running in a non-browser environment, skipping cache initialization"
      );
      return;
    }

    try {
      // Safely check for localStorage availability
      let hasLocalStorage = false;
      try {
        hasLocalStorage = Boolean(window.localStorage);
        window.localStorage.getItem("test");
      } catch (e) {
        console.warn("[SDK] localStorage not available:", e);
        return;
      }

      if (!hasLocalStorage) {
        console.warn("[SDK] localStorage not available");
        return;
      }

      const cachedData = localStorage.getItem("trench_sdk_cache");
      console.log("[SDK] Checking for cached data in localStorage");

      if (cachedData) {
        console.log("[SDK] Found cached data in localStorage");
        const parsedCache = JSON.parse(cachedData);

        // Convert the parsed cache back to a Map
        let validItems = 0;
        let expiredItems = 0;

        for (const [key, value] of Object.entries(parsedCache)) {
          this.requestCache.set(
            key,
            value as { data: unknown; timestamp: number }
          );
          validItems++;
        }

        // Clean up stale entries
        const now = Date.now();
        for (const [key, entry] of this.requestCache.entries()) {
          if (now - entry.timestamp > this.cacheTTL) {
            this.requestCache.delete(key);
            validItems--;
            expiredItems++;
          }
        }

        console.log(
          `[SDK] Loaded ${validItems} valid items from browser storage (removed ${expiredItems} expired items)`
        );
      } else {
        console.log("[SDK] No cached data found in localStorage");
      }
    } catch (error) {
      console.error("[SDK] Error loading cache from storage:", error);
      // If there's an error, clear our cache
      this.requestCache.clear();
    }
  }

  /**
   * rate limit requests to prevent abuse
   * @private
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.MIN_REQUEST_INTERVAL) {
      // Wait for the remaining time
      const delay = this.MIN_REQUEST_INTERVAL - elapsed;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * makes an api request with error handling and caching
   *
   * @private
   * @param {string} endpoint - api endpoint to call
   * @param {RequestInit} [options] - fetch options
   * @returns {Promise<any>} api response
   * @throws {TrenchApiError} if the api returns an error
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const cacheKey = `${endpoint}:${JSON.stringify(options)}`;

    // Check if we have a valid cached response
    const cachedItem = this.requestCache.get(cacheKey);
    if (cachedItem && Date.now() - cachedItem.timestamp < this.cacheTTL) {
      console.log(`[SDK] Using cached response for: ${endpoint}`);
      return cachedItem.data as T;
    }

    // Apply rate limiting
    await this.rateLimit();

    const url = `${this.baseUrl}${endpoint}`;
    const fetchOptions: RequestInit = {
      ...options,
      mode: "cors",
      credentials: "omit",
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
      // Use HTTP caching when possible
      cache: "default",
    };

    try {
      console.log(`[SDK] Fetching: ${endpoint}`);
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // If parsing error response as JSON fails, use default error message
        }
        throw new TrenchApiError(errorMessage, response.status, endpoint);
      }

      const data = await response.json();

      // Check if the API returned valid data
      if (data === null || data === undefined) {
        console.warn(
          `[SDK] API returned null or undefined data for ${endpoint}`
        );
        // Return empty array if the expected type is array-like (most endpoints)
        if (endpoint.includes("/creations") || endpoint.includes("/keywords")) {
          console.log(`[SDK] Returning empty array for ${endpoint}`);
          return [] as unknown as T;
        }
      }

      // Log the number of items if it's an array
      if (Array.isArray(data)) {
        console.log(`[SDK] Received ${data.length} items from ${endpoint}`);
      }

      // Cache the successful response
      this.requestCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      return data as T;
    } catch (error) {
      if (error instanceof TrenchApiError) {
        throw error;
      }
      throw new TrenchApiError(
        error instanceof Error ? error.message : "Unknown error",
        0,
        endpoint
      );
    }
  }

  /**
   * builds a url with query parameters
   *
   * @private
   * @param {string} endpoint - base endpoint
   * @param {Record<string, string | number | boolean | undefined>} params - query parameters
   * @returns {string} url with query parameters
   */
  private buildUrl(
    endpoint: string,
    params: Record<string, string | number | boolean | undefined> = {}
  ): string {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      // Only include defined non-null values
      if (value !== undefined && value !== null) {
        queryParams.set(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    const fullUrl = queryString ? `${endpoint}?${queryString}` : endpoint;
    console.log(`[SDK] Built URL: ${fullUrl}`, params);
    return fullUrl;
  }

  /**
   * clears the request cache
   */
  public clearCache(): void {
    this.requestCache.clear();
    console.log("[SDK] Cache cleared");
  }

  /**
   * manually sets a cached response for a given endpoint and options
   * this is useful for prefetching or sharing cache between components
   *
   * @param endpoint - the api endpoint
   * @param options - the request options
   * @param data - the data to cache
   * @param ttl - optional custom ttl in milliseconds
   */
  public setCachedResponse<T>(
    endpoint: string,
    options: RequestInit = {},
    data: T,
    _ttl: number = this.cacheTTL
  ): void {
    const cacheKey = `${endpoint}:${JSON.stringify(options)}`;
    this.requestCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
    console.log(`[SDK] Manually cached response for: ${endpoint}`);
  }

  /**
   * checks if a cached response exists and is still valid for a given endpoint and options
   *
   * @param endpoint - the api endpoint
   * @param options - the request options
   * @returns whether a valid cached response exists
   */
  public hasCachedResponse(
    endpoint: string,
    options: RequestInit = {}
  ): boolean {
    const cacheKey = `${endpoint}:${JSON.stringify(options)}`;
    const cachedItem = this.requestCache.get(cacheKey);
    return !!(cachedItem && Date.now() - cachedItem.timestamp < this.cacheTTL);
  }

  /**
   * Determines if there are more pages based on returned results length
   *
   * @private
   * @param {any[]} results - The array of results returned from the API
   * @returns {boolean} True if there might be more pages, false otherwise
   */
  private hasMorePages(results: unknown[]): boolean {
    if (!Array.isArray(results)) return false;

    // If we received a full page of results (DEFAULT_PAGE_SIZE),
    // there might be more pages. If we received fewer, we've reached the end.
    return results.length === this.DEFAULT_PAGE_SIZE;
  }

  // =====================================================================
  // health endpoints
  // =====================================================================

  /**
   * check if the api is operational
   *
   * @returns {Promise<{status: string}>} api health status
   */
  async getHealthStatus(): Promise<{ status: string }> {
    return this.request<{ status: string }>("/health");
  }

  // =====================================================================
  // creations endpoints
  // =====================================================================
  // These endpoints provide access to creation-related data including:
  // - Highest trading volume creations
  // - Most called creations
  // - Recently created creations
  // - Fastest migrated creations
  // - Details for specific creations

  /**
   * get detailed information about a specific creation by mint address
   *
   * endpoint: GET /api/creations/:mint
   *
   * @param {string} mint - the mint address of the creation to retrieve
   * @param {Object} options - options for the request
   * @param {number} [options.callsPage] - page number for calls pagination. Default: 0
   * @returns {Promise<CreationResponse>} creation details with volume and calls
   */
  async getCreation(
    mint: string,
    options: {
      callsPage?: number;
    } = {}
  ): Promise<CreationResponse> {
    const endpoint = this.buildUrl(`/creations/${mint}`, {
      callsPage: options.callsPage,
    });
    return this.request<CreationResponse>(endpoint);
  }

  /**
   * get a list of recent token creations
   *
   * endpoint: GET /api/creations/recent
   *
   * @param {Object} options - options for the request
   * @param {Period} [options.period] - time period to consider (30m, 1h, 3h, 6h, 12h, 24h). Default: 24h
   * @param {number} [options.page] - page number for pagination. Default: 0
   * @returns {Promise<CreationResponse[]>} list of recent creations
   */
  async getRecentCreations(
    options: {
      period?: Period;
      page?: number;
    } = {}
  ): Promise<CreationResponse[]> {
    const endpoint = this.buildUrl("/creations/recent", options);
    const response = await this.request<CreationResponse[]>(endpoint);

    // When we get an empty array, we've reached the end of results
    if (Array.isArray(response) && response.length === 0) {
      console.log("[SDK] End of results reached for", endpoint);
      this.setCachedResponse(`${endpoint}_hasMore`, {}, false);
    } else if (Array.isArray(response)) {
      // Set cached flag to indicate if there are more pages
      const hasMore = this.hasMorePages(response);
      this.setCachedResponse(`${endpoint}_hasMore`, {}, hasMore);
    }

    return response;
  }

  /**
   * get creations sorted by trading volume
   *
   * endpoint: GET /api/creations/volume
   *
   * @param {Object} options - options for the request
   * @param {Period} [options.period] - period to consider for volume (30m, 1h, 3h, 6h, 12h, 24h). Default: 24h
   * @param {number} [options.page] - page number for pagination. Default: 0
   * @returns {Promise<CreationResponse[]>} list of creations sorted by volume
   */
  async getCreationsByVolume(
    options: {
      period?: Period;
      page?: number;
    } = {}
  ): Promise<CreationResponse[]> {
    const endpoint = this.buildUrl("/creations/volume", options);
    const response = await this.request<CreationResponse[]>(endpoint);

    // When we get an empty array, we've reached the end of results
    if (Array.isArray(response) && response.length === 0) {
      console.log("[SDK] End of results reached for", endpoint);
      this.setCachedResponse(`${endpoint}_hasMore`, {}, false);
    } else if (Array.isArray(response)) {
      // Set cached flag to indicate if there are more pages
      const hasMore = this.hasMorePages(response);
      this.setCachedResponse(`${endpoint}_hasMore`, {}, hasMore);
    }

    return response;
  }

  /**
   * get creations sorted by number of calls
   *
   * endpoint: GET /api/creations/calls
   *
   * @param {Object} options - query options
   * @param {Period} [options.period] - time period to consider for calls (30m, 1h, 3h, 6h, 12h, 24h). Default: 24h
   * @param {number} [options.page] - page number for pagination. Default: 0
   * @returns {Promise<CreationWithCallsResponse[]>} list of most called creations
   */
  async getMostCalledCreations(
    options: {
      period?: Period;
      page?: number;
    } = {}
  ): Promise<CreationWithCallsResponse[]> {
    const endpoint = this.buildUrl("/creations/calls", options);
    const response = await this.request<CreationWithCallsResponse[]>(endpoint);

    // When we get an empty array, we've reached the end of results
    if (Array.isArray(response) && response.length === 0) {
      console.log("[SDK] End of results reached for", endpoint);
      this.setCachedResponse(`${endpoint}_hasMore`, {}, false);
    } else if (Array.isArray(response)) {
      // Set cached flag to indicate if there are more pages
      const hasMore = this.hasMorePages(response);
      this.setCachedResponse(`${endpoint}_hasMore`, {}, hasMore);
    }

    return response;
  }

  /**
   * get fastest migrated creations
   *
   * endpoint: GET /api/creations/migration
   *
   * @param {Object} options - query options
   * @param {Period} [options.period] - time period to consider for migration (30m, 1h, 3h, 6h, 12h, 24h). Default: 24h
   * @param {number} [options.page] - page number for pagination. Default: 0
   * @returns {Promise<CreationResponse[]>} list of fastest migrated creations with migration speed information
   */
  async getFastestMigratedCreations(
    options: {
      period?: Period;
      page?: number;
    } = {}
  ): Promise<CreationResponse[]> {
    const endpoint = this.buildUrl("/creations/migration", options);
    const response = await this.request<CreationResponse[]>(endpoint);

    // When we get an empty array, we've reached the end of results
    if (Array.isArray(response) && response.length === 0) {
      console.log("[SDK] End of results reached for", endpoint);
      this.setCachedResponse(`${endpoint}_hasMore`, {}, false);
    } else if (Array.isArray(response)) {
      // Set cached flag to indicate if there are more pages
      const hasMore = this.hasMorePages(response);
      this.setCachedResponse(`${endpoint}_hasMore`, {}, hasMore);
    }

    return response;
  }

  /**
   * get creations associated with a specific keyword
   *
   * endpoint: GET /api/creations/of
   *
   * @param {string} keyword - the keyword to search for
   * @param {Object} options - options for the request
   * @param {SortOrder} [options.sort] - sort method for creations (volume, calls, recent, migration). Default: volume
   * @param {Period} [options.period] - time period for data (30m, 1h, 3h, 6h, 12h, 24h). Default: 24h
   * @param {number} [options.page] - page number for pagination. Default: 0
   * @returns {Promise<CreationResponse[]>} list of creations matching the keyword
   */
  async getCreationsByKeyword(
    keyword: string,
    options: {
      sort?: SortOrder;
      period?: Period;
      page?: number;
    } = {}
  ): Promise<CreationResponse[]> {
    // Create a unique cache key for this request
    const cacheKey = `keyword_${keyword}_${JSON.stringify(options)}`;

    // Check if we have a valid cached response
    const cachedItem = this.requestCache.get(cacheKey);
    if (cachedItem && Date.now() - cachedItem.timestamp < this.cacheTTL) {
      console.log(`[SDK] Using cached response for keyword: ${keyword}`);
      return cachedItem.data as CreationResponse[];
    }

    // Check if there's an in-flight request for the same parameters
    const inFlightRequest = this.inFlightRequests.get(cacheKey);
    if (inFlightRequest) {
      console.log(`[SDK] Reusing in-flight request for keyword: ${keyword}`);
      return inFlightRequest as Promise<CreationResponse[]>;
    }

    // Create the new request
    const requestPromise = (async () => {
      try {
        const endpoint = this.buildUrl("/creations/of", {
          keyword,
          ...options,
        });

        // Apply rate limiting
        await this.rateLimit();

        const response = await this.request<CreationResponse[]>(endpoint);

        // When we get an empty array, we've reached the end of results
        if (Array.isArray(response) && response.length === 0) {
          console.log("[SDK] End of results reached for", endpoint);
          this.setCachedResponse(`${endpoint}_hasMore`, {}, false);
        } else if (Array.isArray(response)) {
          // Set cached flag to indicate if there are more pages
          const hasMore = this.hasMorePages(response);
          this.setCachedResponse(`${endpoint}_hasMore`, {}, hasMore);
        }

        // Cache the successful response
        this.requestCache.set(cacheKey, {
          data: response,
          timestamp: Date.now(),
        });

        return response;
      } finally {
        // Clean up the in-flight request
        this.inFlightRequests.delete(cacheKey);
      }
    })();

    // Store the in-flight request
    this.inFlightRequests.set(cacheKey, requestPromise);

    return requestPromise;
  }

  // =====================================================================
  // keywords endpoints
  // =====================================================================
  // These endpoints provide access to keyword-related data including:
  // - Keywords with highest trading volume
  // - Most used keywords
  // - Most migrated keywords
  // - Recently created keywords
  // - Details for specific keywords
  // - Keywords sorted by call volume

  /**
   * get detailed information about a specific keyword
   *
   * endpoint: GET /api/keywords/:keyword
   *
   * @param {string} keyword - the keyword to retrieve details for
   * @param {Object} options - options for the request
   * @param {number} [options.callsPage] - page number for calls pagination. Default: 0
   * @returns {Promise<KeywordResponse>} keyword details with stats
   */
  async getKeywordDetail(
    keyword: string,
    options: {
      callsPage?: number;
    } = {}
  ): Promise<KeywordResponse> {
    const endpoint = this.buildUrl(`/keywords/${keyword}`, {
      callsPage: options.callsPage,
    });
    return this.request<KeywordResponse>(endpoint);
  }

  /**
   * get a list of recently used keywords
   *
   * endpoint: GET /api/keywords/recent
   *
   * @param {Object} options - options for the request
   * @param {number} [options.page] - page number for pagination. Default: 0
   * @returns {Promise<KeywordResponse[]>} list of recent keywords with stats
   */
  async getRecentKeywords(
    options: {
      page?: number;
    } = {}
  ): Promise<KeywordResponse[]> {
    const endpoint = this.buildUrl("/keywords/recent", options);
    const response = await this.request<KeywordResponse[]>(endpoint);

    // When we get an empty array, we've reached the end of results
    if (Array.isArray(response) && response.length === 0) {
      console.log("[SDK] End of results reached for", endpoint);
      this.setCachedResponse(`${endpoint}_hasMore`, {}, false);
    } else if (Array.isArray(response)) {
      // Set cached flag to indicate if there are more pages
      const hasMore = this.hasMorePages(response);
      this.setCachedResponse(`${endpoint}_hasMore`, {}, hasMore);
    }

    return response;
  }

  /**
   * get keywords sorted by trading volume
   *
   * endpoint: GET /api/keywords/volume
   *
   * @param {Object} options - options for the request
   * @param {Period} [options.period] - period to consider for volume (30m, 1h, 3h, 6h, 12h, 24h). Default: 24h
   * @param {number} [options.page] - page number for pagination. Default: 0
   * @returns {Promise<KeywordResponse[]>} list of keywords sorted by volume
   */
  async getKeywordsByVolume(
    options: {
      period?: Period;
      page?: number;
    } = {}
  ): Promise<KeywordResponse[]> {
    const endpoint = this.buildUrl("/keywords/volume", options);
    const response = await this.request<KeywordResponse[]>(endpoint);

    // When we get an empty array, we've reached the end of results
    if (Array.isArray(response) && response.length === 0) {
      console.log("[SDK] End of results reached for", endpoint);
      this.setCachedResponse(`${endpoint}_hasMore`, {}, false);
      // This may be a good place to update UI in the future
    } else if (Array.isArray(response)) {
      // Set cached flag to indicate if there are more pages
      const hasMore = this.hasMorePages(response);
      // Store this information in the cache for any component that needs it
      this.setCachedResponse(`${endpoint}_hasMore`, {}, hasMore);
    }

    return response;
  }

  /**
   * get keywords sorted by usage frequency
   *
   * endpoint: GET /api/keywords/usage
   *
   * @param {Object} options - options for the request
   * @param {Period} [options.period] - period to consider for usage (30m, 1h, 3h, 6h, 12h, 24h). Default: 24h
   * @param {number} [options.page] - page number for pagination. Default: 0
   * @returns {Promise<KeywordResponse[]>} list of keywords sorted by usage
   */
  async getKeywordsByUsage(
    options: {
      period?: Period;
      page?: number;
    } = {}
  ): Promise<KeywordResponse[]> {
    const endpoint = this.buildUrl("/keywords/usage", options);
    const response = await this.request<KeywordResponse[]>(endpoint);

    // When we get an empty array, we've reached the end of results
    if (Array.isArray(response) && response.length === 0) {
      console.log("[SDK] End of results reached for", endpoint);
      this.setCachedResponse(`${endpoint}_hasMore`, {}, false);
    } else if (Array.isArray(response)) {
      // Set cached flag to indicate if there are more pages
      const hasMore = this.hasMorePages(response);
      this.setCachedResponse(`${endpoint}_hasMore`, {}, hasMore);
    }

    return response;
  }

  /**
   * get keywords sorted by migration metrics
   *
   * endpoint: GET /api/keywords/migration
   *
   * @param {Object} options - options for the request
   * @param {Period} [options.period] - period to consider for migration (30m, 1h, 3h, 6h, 12h, 24h). Default: 24h
   * @param {number} [options.page] - page number for pagination. Default: 0
   * @returns {Promise<KeywordResponse[]>} list of keywords sorted by migration
   */
  async getKeywordsByMigration(
    options: {
      period?: Period;
      page?: number;
    } = {}
  ): Promise<KeywordResponse[]> {
    const endpoint = this.buildUrl("/keywords/migration", options);
    const response = await this.request<KeywordResponse[]>(endpoint);

    // When we get an empty array, we've reached the end of results
    if (Array.isArray(response) && response.length === 0) {
      console.log("[SDK] End of results reached for", endpoint);
      this.setCachedResponse(`${endpoint}_hasMore`, {}, false);
    } else if (Array.isArray(response)) {
      // Set cached flag to indicate if there are more pages
      const hasMore = this.hasMorePages(response);
      this.setCachedResponse(`${endpoint}_hasMore`, {}, hasMore);
    }

    return response;
  }

  /**
   * get keywords sorted by call volume
   *
   * endpoint: GET /api/keywords/calls
   *
   * @param {Object} options - options for the request
   * @param {Period} [options.period] - period to consider for calls (30m, 1h, 3h, 6h, 12h, 24h). Default: 24h
   * @param {number} [options.page] - page number for pagination. Default: 0
   * @returns {Promise<KeywordCallVolumeResponse[]>} list of keywords sorted by call volume
   */
  async getKeywordsByCalls(
    options: {
      period?: Period;
      page?: number;
    } = {}
  ): Promise<KeywordCallVolumeResponse[]> {
    const endpoint = this.buildUrl("/keywords/calls", options);
    const response = await this.request<KeywordCallVolumeResponse[]>(endpoint);

    // When we get an empty array, we've reached the end of results
    if (Array.isArray(response) && response.length === 0) {
      console.log("[SDK] End of results reached for", endpoint);
      this.setCachedResponse(`${endpoint}_hasMore`, {}, false);
    } else if (Array.isArray(response)) {
      // Set cached flag to indicate if there are more pages
      const hasMore = this.hasMorePages(response);
      this.setCachedResponse(`${endpoint}_hasMore`, {}, hasMore);
    }

    return response;
  }
}

// create default instance
const trenchSDK = new TrenchPumpFunSDK();

// export default instance and class
export default trenchSDK;
