# Creations API Documentation

This document provides an overview of the available creation-related API endpoints.

## Endpoints Overview

| Endpoint | Description |
|----------|-------------|
| `/api/creations/volume` | Get creations with highest trading volume |
| `/api/creations/calls` | Get most called creations |
| `/api/creations/recent` | Get most recently created creations |
| `/api/creations/migration` | Get fastest migrated creations |
| `/api/creations/:mint` | Get details for a specific creation |
| `/api/creations/of` | Get creations for a specific keyword |

## Endpoints

### 1. Get Creations with Highest Trading Volume

**Endpoint:** `GET /api/creations/volume`

**Query Parameters:**
- `period` (optional): Time period to aggregate volume data. Default: `24h`. 
  Possible values: `30m`, `1h`, `3h`, `6h`, `12h`, `24h`
- `page` (optional): Page number for pagination. Default: `0`

**Response:**
```json
[
  {
    "creation": {
      "mint": "string",
      "bondingCurve": "string",
      "user": "string",
      "signature": "string",
      "metadata": {
        "name": "string",
        "symbol": "string",
        "description": "string",
        "image": "string",
        "twitter": "string",
        "website": "string",
        "telegram": "string",
        "createdOn": "string" | null
      },
      "keywords": ["string"] | null,
      "migration": {
        "signature": "string",
        "migratedAt": "ISO date string"
      } | null,
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
      "lastTradeDate": "string" | null
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
      "lastCallDate": "string" | null
    }
  }
]
```

### 2. Get Most Called Creations

**Endpoint:** `GET /api/creations/calls`

**Query Parameters:**
- `period` (optional): Time period for call data. Default: `24h`. 
  Possible values: `30m`, `1h`, `3h`, `6h`, `12h`, `24h`
- `page` (optional): Page number for pagination. Default: `0`

**Response:** Same structure as `/api/creations/volume`

### 3. Get Most Recent Creations

**Endpoint:** `GET /api/creations/recent`

**Query Parameters:**
- `period` (optional): Time period for recent data. Default: `24h`. 
  Possible values: `30m`, `1h`, `3h`, `6h`, `12h`, `24h`
- `page` (optional): Page number for pagination. Default: `0`

**Response:** Same structure as `/api/creations/volume`

### 4. Get Fastest Migrated Creations

**Endpoint:** `GET /api/creations/migration`

**Query Parameters:**
- `period` (optional): Time period for migration data. Default: `24h`. 
  Possible values: `30m`, `1h`, `3h`, `6h`, `12h`, `24h`
- `page` (optional): Page number for pagination. Default: `0`

**Response:**
```json
[
  {
    "creation": {
      "mint": "string",
      "bondingCurve": "string",
      "user": "string",
      "signature": "string",
      "metadata": {
        "name": "string",
        "symbol": "string",
        "description": "string",
        "image": "string",
        "twitter": "string",
        "website": "string",
        "telegram": "string",
        "createdOn": "string" | null
      },
      "keywords": ["string"] | null,
      "migration": {
        "signature": "string",
        "migratedAt": "ISO date string"
      } | null,
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
      "lastTradeDate": "string" | null
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
      "lastCallDate": "string" | null
    },
    "migrationSpeed": number,
    "migrationTimeFormatted": "string",
    "migratedOn": "string"
  }
]
```

### 5. Get Creation Details

**Endpoint:** `GET /api/creations/:mint`

**URL Parameters:**
- `mint`: The creation mint address to get details for

**Query Parameters:**
- `callsPage` (optional): Page number for calls pagination. Default: `0`

**Response:**
```json
{
  "creation": {
    "mint": "string",
    "bondingCurve": "string",
    "user": "string",
    "signature": "string",
    "metadata": {
      "name": "string",
      "symbol": "string",
      "description": "string",
      "image": "string",
      "twitter": "string",
      "website": "string",
      "telegram": "string",
      "createdOn": "string" | null
    },
    "keywords": ["string"] | null,
    "migration": {
      "signature": "string",
      "migratedAt": "ISO date string"
    } | null,
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
    "lastTradeDate": "string" | null
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
    "lastCallDate": "string" | null
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

### 6. Get Creations of Keyword

**Endpoint:** `GET /api/creations/of`

**Query Parameters:**
- `keyword` (required): The keyword to get creations for
- `sort` (optional): Sort method for creations. Default: `volume`. 
  Possible values: `volume`, `calls`, `recent`, `migration`
- `period` (optional): Time period for data. Default: `24h`. 
  Possible values: `30m`, `1h`, `3h`, `6h`, `12h`, `24h`
- `page` (optional): Page number for pagination. Default: `0`

**Response:** Same structure as `/api/creations/volume`
