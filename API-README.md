# Trench PumpFun API Documentation V1

This API provides access to data about token creations, keywords, and related metrics on the Solana blockchain.

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Caching](#caching)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
  - [Creations](#creations)
  - [Keywords](#keywords)
  - [Calls](#calls)
- [WebSocket API](#websocket-api)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Base URL

All endpoints should be prefixed with the following base URL:

```
https://api.trench.digital
```

## Authentication

Currently, the API does not require authentication. This may change in future versions.

## Rate Limiting

Please be mindful of rate limits. Excessive requests may be throttled.

- Standard rate limit: 100 requests per minute per IP address
- If you exceed this limit, you will receive a `429 Too Many Requests` response

## Caching

All GET endpoints include cache headers. Responses may be cached for improved performance.

- `Cache-Control: public, max-age=60` - Responses can be cached for 60 seconds
- For high-traffic applications, consider implementing client-side caching

## Endpoints

### Health Check

#### Get API Health Status
`GET /api/health` - Check if the API is operational and get collection statistics.

**Response Structure**
```json
{
  "status": "ok",
  "collections": {
    "creations": 21175,
    "trades": 812185,
    "calls": 3195,
    "keywords": 10450
  }
}
```

The `collections` object provides the current count of documents in each collection, which can be useful for monitoring database growth and API usage.

### Creations

Endpoints for accessing token creation data.

#### Get Creation Detail
`GET /api/creations/:mint` - Get detailed information about a specific creation by mint address.

**Path Parameters**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mint` | string | Yes | The mint address of the creation to retrieve |

**Response Structure**
```json
{
  "creation": {
    "mint": "EEXiYJvQGykGNovExhr1YLCrEigK9pEdfnxQ1ZMSpump",
    "user": "HtGr5YgBWpL7tuwqdtgyEMkYVk2qXc36o3tixgNaSEk4",
    "bondingCurve": "4FiqzPEKoY8gdnVAVuMjboWs8KnhncgZ26wT9QQU65Xw",
    "signature": "52AENvqn7Wfdft9QDaY8yYtqKSgNHKGUcthJCDdSE7ACa9DB3kMkxwMdoxLNnSVRv3qEcwfmGKufpg4WJhk6NNvQ",
    "metadata": {
      "name": "JUSTICE FOR CHICAGO",
      "symbol": "JFC",
      "description": "JUSTICE FOR CHICAGO...",
      "image": "https://ipfs.io/ipfs/QmUE5JwKYZ3yQ44w5Qd7YtMqNknxNieTTsxj9csJ1a3ee8",
      "twitter": "https://x.com/JFC",
      "website": "https://website.com/JFC",
      "telegram": "https://t.me/JFC",
      "createdOn": "https://pump.fun"
    },
    "createdAt": "2025-03-19T21:44:23.888Z",
    "keywords": ["chicago", "for", "justice"]
  },
  "buyVolume": {
    "30m": 0,
    "1h": 0,
    "3h": 0,
    "6h": 0.2,
    "12h": 0.2,
    "24h": 0.2
  },
  "sellVolume": {
    "30m": 0,
    "1h": 0,
    "3h": 0,
    "6h": 0.200401552,
    "12h": 0.200401552,
    "24h": 0.200401552
  },
  "lastTradedAt": "2025-03-19T21:48:55.951Z",
  "calls": []
}
```

#### Get Recent Creations
`GET /api/creations/recent` - Get a list of recent token creations.

**Query Parameters**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `onlyMigrated` | boolean | No | `false` | Filter to only show migrated tokens |
| `limit` | integer | No | `100` | Maximum number of results to return (1-100) |

#### Get Creations by Volume
`GET /api/creations/volume` - Get creations sorted by trading volume.

**Query Parameters**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `24h` | period to consider for volume (`30m`, `1h`, `3h`, `6h`, `12h`, `24h`) |
| `limit` | integer | No | `100` | Maximum number of results to return (1-100) |

#### Get Most Called Creations
`GET /api/creations/calls` - Get creations sorted by number of calls.

**Query Parameters**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `24h` | period to consider for calls (`30m`, `1h`, `3h`, `6h`, `12h`, `24h`) |
| `limit` | integer | No | `100` | Maximum number of results to return (1-100) |

#### Get Creations by Keyword
`GET /api/creations/keyword` - Get creations associated with a specific keyword.

**Query Parameters**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `keyword` | string | Yes | - | The keyword to search for |
| `limit` | integer | No | `100` | Maximum number of results to return (1-100) |
| `sorting` | string | No | `volume` | Sort order (`volume`, `recent`, `calls`) |

### Keywords

Endpoints for accessing keyword data.

All keyword-related endpoints include the `averageMigrationDuration` field, which represents the average time in milliseconds between token creation and migration for tokens associated with a keyword. This metric helps identify trends in how quickly tokens with specific keywords typically migrate.

#### Get Keyword Detail
`GET /api/keywords/:keyword` - Get detailed information about a specific keyword.

**Path Parameters**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `keyword` | string | Yes | The keyword to retrieve details for |

**Response Structure**
```json
{
  "keyword": {
    "keyword": "ai",
    "description": "Artificial intelligence technology and innovations",
    "createdAt": "2025-03-17T23:32:35.503Z"
  },
  "buyVolume": {
    "30m": 0.100000001,
    "1h": 2.05019802,
    "3h": 2.05019802,
    "6h": 384.59786067,
    "12h": 1609.393321862,
    "24h": 4490.371212443
  },
  "sellVolume": {
    "30m": 1.263539221,
    "1h": 1.263539221,
    "3h": 1.765562783,
    "6h": 448.86169504,
    "12h": 1602.978354825,
    "24h": 4146.163217619
  },
  "usages": {
    "30m": 0,
    "1h": 0,
    "3h": 0,
    "6h": 25,
    "12h": 140,
    "24h": 254
  },
  "averageMigrationDuration": 6143842,
  "callCounts": {
    "30m": 0,
    "1h": 0,
    "3h": 0,
    "6h": 0,
    "12h": 3,
    "24h": 32
  }
}
```

#### Get Recent Keywords
`GET /api/keywords/recent` - Get a list of recently used keywords.

**Query Parameters**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | `100` | Maximum number of results to return (1-100) |

**Response Structure**
```json
[
  {
    "keyword": {
      "keyword": "easteregg",
      "description": "Hidden message, image, or feature in a video game, movie, etc.",
      "createdAt": "2025-03-20T02:03:50.307Z"
    },
    "usages": {
      "30m": 0,
      "1h": 0,
      "3h": 0,
      "6h": 1,
      "12h": 1,
      "24h": 1
    },
    "averageMigrationDuration": 0
  }
]
```

#### Get Keywords by Volume
`GET /api/keywords/volume` - Get keywords sorted by trading volume.

**Query Parameters**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `24h` | period to consider for volume (`30m`, `1h`, `3h`, `6h`, `12h`, `24h`) |
| `limit` | integer | No | `100` | Maximum number of results to return (1-100) |

#### Get Keywords by Usage
`GET /api/keywords/usage` - Get keywords sorted by usage frequency.

**Query Parameters**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `24h` | period to consider for usage (`30m`, `1h`, `3h`, `6h`, `12h`, `24h`) |
| `limit` | integer | No | `100` | Maximum number of results to return (1-100) |

#### Get Most Called Keywords
`GET /api/keywords/calls` - Get keywords sorted by number of calls.

**Query Parameters**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `24h` | period to consider for calls (`30m`, `1h`, `3h`, `6h`, `12h`, `24h`) |
| `limit` | integer | No | `100` | Maximum number of results to return (1-100) |

### Calls

Endpoints for accessing data related to calls (social media mentions).

#### Get User Calls
`GET /api/calls/:username` - Get calls made by a specific Twitter username.

**Path Parameters**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | string | Yes | The Twitter username to retrieve calls for (not case sensitive) |

**Query Parameters**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | `1` | Page number for pagination (starting from 1) |
| `pageSize` | integer | No | `20` | Number of items per page (1-100) |

**Response Structure**
The response includes creation calls, keyword calls, total calls count, and pagination information.

#### Get Best Callers
`GET /api/calls/best` - Get a list of users who have made the most calls, sorted by call count.

**Query Parameters**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `24h` | period to consider for calls (`30m`, `1h`, `3h`, `6h`, `12h`, `24h`) |
| `limit` | integer | No | `100` | Maximum number of results to return (1-100) |

**Response Structure**
```json
[
  {
    "username": "fake_aio",
    "callCounts": {
      "30m": 1,
      "1h": 6,
      "3h": 24,
      "6h": 42,
      "12h": 64,
      "24h": 104
    },
    "totalMigrated": 19,
    "generatedVolume": 13371.42578764
  }
]
```

## WebSocket API

The WebSocket API provides real-time updates for token categorizations, migrations, new keywords, and calls.

Connect to the WebSocket server at:

```
wss://api.trench.digital/api/thought
```

The server maintains connections with a ping-pong mechanism that sends a ping message every 1 minute. Clients don't need to respond to these messages, but they should keep the connection open.

For detailed information about message formats, event types, and implementation examples, please see the full documentation.

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of requests:

- `200 OK`: The request was successful.
- `400 Bad Request`: The request was invalid or cannot be served.
- `404 Not Found`: The requested resource does not exist.
- `429 Too Many Requests`: Rate limit exceeded.
- `500 Internal Server Error`: An error occurred on the server.

Error responses will include a JSON object with an `error` field containing a description of the error.

## Examples

### Check API health status
```bash
curl -X GET "https://api.trench.digital/api/health"
```

### Fetch a specific creation
```bash
curl -X GET "https://api.trench.digital/api/creations/EEXiYJvQGykGNovExhr1YLCrEigK9pEdfnxQ1ZMSpump"
```

### Get recent creations with a limit
```bash
curl -X GET "https://api.trench.digital/api/creations/recent?limit=10"
```

### Get creations for a specific keyword
```bash
curl -X GET "https://api.trench.digital/api/creations/keyword?keyword=solana&limit=5&sorting=volume"
```

### Get keywords sorted by volume in the last hour
```bash
curl -X GET "https://api.trench.digital/api/keywords/volume?period=1h&limit=20"
```

### Get details for a specific keyword
```bash
curl -X GET "https://api.trench.digital/api/keywords/ai"
```

### Get calls made by a specific Twitter user
```bash
curl -X GET "https://api.trench.digital/api/calls/fake_aio"
```

### Get paginated calls for a Twitter user
```bash
curl -X GET "https://api.trench.digital/api/calls/fake_aio?page=2&pageSize=10"
```

### Get the most active callers in the last 3 hours
```bash
curl -X GET "https://api.trench.digital/api/calls/best?period=3h&limit=10"
```

### JavaScript Example
```javascript
// Using fetch API
const getKeywordDetails = async (keyword) => {
  try {
    const response = await fetch(`https://api.trench.digital/api/keywords/${keyword}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log(`Keyword: ${data.keyword.keyword}`);
    console.log(`24h Buy Volume: ${data.buyVolume['24h']}`);
    console.log(`24h Sell Volume: ${data.sellVolume['24h']}`);
    console.log(`Usage in last 24h: ${data.usages['24h']}`);
    
    // Convert migration duration from milliseconds to more readable format
    const migrationHours = data.averageMigrationDuration / (1000 * 60 * 60);
    console.log(`Average migration duration: ${migrationHours.toFixed(2)} hours`);
    
    return data;
  } catch (error) {
    console.error(`Failed to fetch keyword details for ${keyword}:`, error);
  }
};

getKeywordDetails('ai');
``` 