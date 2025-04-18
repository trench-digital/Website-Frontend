# Keywords API Documentation

This document provides an overview of the available keyword-related API endpoints.

## Endpoints Overview

| Endpoint | Description |
|----------|-------------|
| `/api/keywords/volume` | Get keywords with highest trading volume |
| `/api/keywords/usage` | Get most used keywords |
| `/api/keywords/migration` | Get most migrated keywords |
| `/api/keywords/recent` | Get most recently created keywords |
| `/api/keywords/:keyword` | Get details for a specific keyword |
| `/api/keywords/calls` | Get keywords sorted by call volume |
| `/api/creations/calls` | Get most called creations |

## Endpoints

### 1. Get Keywords with Highest Trading Volume

**Endpoint:** `GET /api/keywords/volume`

**Query Parameters:**
- `period` (optional): Time period to aggregate volume data. Default: `24h`. 
  Possible values: `30m`, `1h`, `3h`, `6h`, `12h`, `24h`
- `page` (optional): Page number for pagination. Default: `0`

**Response:**
```json
[
  {
    "keyword": {
      "keyword": "string",
      "description": "string",
      "embedding": [number] | null,
      "createdAt": "ISO date string"
    },
    "volume": {
      "buy": {
        "30m": number,
        "1h": number,
        "3h": number,
        "6h": number,
        "12h": number,
        "24h": number
      },
      "sell": {
        "30m": number,
        "1h": number,
        "3h": number,
        "6h": number,
        "12h": number,
        "24h": number
      },
      "lastTradeDate": "string"  // empty if no calls found
    },
    "migration": {
      "count": number,
      "meanDuration": number
    },
    "usage": {
      "usage": {
        "30m": number,
        "1h": number,
        "3h": number,
        "6h": number,
        "12h": number,
        "24h": number
      },
      "lastUsageDate": "string"
    }
  }
]
```

### 2. Get Most Used Keywords

**Endpoint:** `GET /api/keywords/usage`

**Query Parameters:**
- `period` (optional): Time period for usage data. Default: `24h`. 
  Possible values: `30m`, `1h`, `3h`, `6h`, `12h`, `24h`
- `page` (optional): Page number for pagination. Default: `0`

**Response:** Same structure as `/api/keywords/volume`

### 3. Get Most Migrated Keywords

**Endpoint:** `GET /api/keywords/migration`

**Query Parameters:**
- `period` (optional): Time period for migration data. Default: `24h`. 
  Possible values: `30m`, `1h`, `3h`, `6h`, `12h`, `24h`
- `page` (optional): Page number for pagination. Default: `0`

**Response:** Same structure as `/api/keywords/volume`

### 4. Get Most Recent Keywords

**Endpoint:** `GET /api/keywords/recent`

**Query Parameters:**
- `page` (optional): Page number for pagination. Default: `0`

**Response:** Same structure as `/api/keywords/volume`

### 5. Get Keyword Details

**Endpoint:** `GET /api/keywords/:keyword`

**URL Parameters:**
- `keyword`: The keyword to get details for

**Query Parameters:**
- `callsPage` (optional): Page number for calls pagination. Default: `0`

**Response:**
```json
{
  "keyword": {
    "keyword": "string",
    "description": "string",
    "embedding": [number] | null,
    "createdAt": "ISO date string"
  },
  "volume": {
    "buy": {
      "30m": number,
      "1h": number,
      "3h": number,
      "6h": number,
      "12h": number,
      "24h": number
    },
    "sell": {
      "30m": number,
      "1h": number,
      "3h": number,
      "6h": number,
      "12h": number,
      "24h": number
    },
    "lastTradeDate": "string"  // empty if no calls found
  },
  "callVolume": {
    "callVolume": {
      "30m": number,
      "1h": number,
      "3h": number,
      "6h": number,
      "12h": number,
      "24h": number
    },
    "lastTradeDate": "string",  // empty if no calls found
    "lastCallMint": "string"
  },
  "migration": {
    "count": number,
    "meanDuration": number
  },
  "usage": {
    "usage": {
      "30m": number,
      "1h": number,
      "3h": number,
      "6h": number,
      "12h": number,
      "24h": number
    },
    "lastUsageDate": "string"
  },
  "calls": [
    {
      "call": {
        "mint": "string",
        "url": "string",
        "username": "string",
        "createdAt": "ISO date string"
      },
      "volumeChange1H": number
    }
  ]
}
```

### 6. Get Most Called Creations

**Endpoint:** `GET /api/creations/calls`

**Query Parameters:**
- `period` (optional): Time period to aggregate data. Default: `24h`. 
  Possible values: `30m`, `1h`, `3h`, `6h`, `12h`, `24h`
- `onlyMigrated` (optional): Filter for migrated creations only. Default: `false`
- `limit` (optional): Number of results to return. Default: `100`. Min: `1`, Max: `100`

**Response:**
```json
[
  {
    "creation": {
      "mint": "string",
      "name": "string",
      "symbol": "string",
      "image": "string",
      "user": "string",
      "bondingCurve": "string",
      "signature": "string",
      "metadata": {
        "name": "string",
        "symbol": "string",
        "description": "string",
        "image": "string",
        "twitter": "string",
        "website": "string",
        "telegram": "string",
        "createdOn": "string"
      },
      "createdAt": "ISO date string",
      "keywords": ["string"]
    },
    "buyVolume": {
      "30m": number,
      "1h": number,
      "3h": number,
      "6h": number,
      "12h": number,
      "24h": number
    },
    "sellVolume": {
      "30m": number,
      "1h": number,
      "3h": number,
      "6h": number,
      "12h": number,
      "24h": number
    },
    "lastTradedAt": "ISO date string",
    "calls": [
      {
        "call": {
          "mint": "string",
          "url": "string",
          "text": "string",
          "username": "string",
          "createdAt": "ISO date string",
          "creation": "ISO date string"
        },
        "generatedVolume1H": number
      }
    ]
  }
]
```
