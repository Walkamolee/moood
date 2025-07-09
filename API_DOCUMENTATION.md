# Money Mood API Documentation

> **Comprehensive API reference for Money Mood's financial data integration and security services**

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Plaid Integration API](#plaid-integration-api)
4. [Data Synchronization API](#data-synchronization-api)
5. [Security Services API](#security-services-api)
6. [Webhook Endpoints](#webhook-endpoints)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [API Versioning](#api-versioning)

## Overview

The Money Mood API provides secure access to financial data integration, real-time synchronization, and advanced security features. All APIs are designed with security-first principles and comply with PCI DSS, GDPR, and CCPA regulations.

### Base URLs
- **Production**: `https://api.moneymood.app/v1`
- **Staging**: `https://staging-api.moneymood.app/v1`
- **Development**: `https://dev-api.moneymood.app/v1`

### API Principles
- **RESTful Design**: Standard HTTP methods and status codes
- **JSON Format**: All requests and responses use JSON
- **Secure by Default**: All endpoints require authentication
- **Idempotent Operations**: Safe to retry requests
- **Comprehensive Error Handling**: Detailed error responses

## Authentication

### Biometric Authentication
All sensitive operations require biometric authentication in addition to standard API authentication.

```typescript
// Biometric authentication flow
const authResult = await biometricAuthService.authenticate(
  'Access financial data',
  'Use biometric authentication to continue'
);

if (authResult.success) {
  // Proceed with API call
  const response = await apiCall(authResult.token);
}
```

### API Key Authentication
```http
Authorization: Bearer <api_key>
X-User-ID: <user_id>
X-Request-ID: <unique_request_id>
```

### JWT Token Authentication
```http
Authorization: Bearer <jwt_token>
X-Biometric-Token: <biometric_auth_token>
```

## Plaid Integration API

### Create Link Token

Creates a secure link token for Plaid Link initialization.

**Endpoint**: `POST /plaid/link-token`

**Request**:
```json
{
  "userId": "user_12345",
  "clientName": "Money Mood",
  "countryCodes": ["US", "CA"],
  "language": "en",
  "products": ["transactions", "auth"],
  "webhook": "https://api.moneymood.app/webhooks/plaid"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "linkToken": "link-sandbox-12345",
    "expiration": "2024-12-31T23:59:59Z",
    "requestId": "req_12345"
  }
}
```

### Exchange Public Token

Exchanges a public token for an access token after successful Plaid Link.

**Endpoint**: `POST /plaid/exchange-token`

**Request**:
```json
{
  "publicToken": "public-sandbox-12345",
  "userId": "user_12345",
  "institutionId": "ins_12345",
  "accounts": [
    {
      "id": "account_12345",
      "name": "Checking Account",
      "type": "depository",
      "subtype": "checking"
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "accessToken": "access-sandbox-12345",
    "itemId": "item_12345",
    "providerId": "provider_12345",
    "accounts": [
      {
        "id": "account_12345",
        "providerId": "provider_12345",
        "name": "Checking Account",
        "type": "checking",
        "balance": 1250.75,
        "currency": "USD"
      }
    ]
  }
}
```

### Get Accounts

Retrieves account information for a connected financial institution.

**Endpoint**: `GET /plaid/accounts`

**Parameters**:
- `providerId` (required): Financial provider ID
- `includeBalances` (optional): Include current balances (default: true)

**Response**:
```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": "account_12345",
        "providerId": "provider_12345",
        "name": "Checking Account",
        "type": "checking",
        "balance": 1250.75,
        "availableBalance": 1250.75,
        "currency": "USD",
        "lastUpdated": "2024-01-15T10:30:00Z"
      }
    ],
    "institution": {
      "id": "ins_12345",
      "name": "Test Bank",
      "logo": "https://example.com/logo.png"
    }
  }
}
```

### Get Transactions

Retrieves transactions for specified accounts within a date range.

**Endpoint**: `GET /plaid/transactions`

**Parameters**:
- `accountIds` (required): Comma-separated account IDs
- `startDate` (required): Start date (YYYY-MM-DD)
- `endDate` (required): End date (YYYY-MM-DD)
- `count` (optional): Number of transactions (default: 100, max: 500)
- `offset` (optional): Pagination offset (default: 0)

**Response**:
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "transaction_12345",
        "accountId": "account_12345",
        "amount": 45.67,
        "description": "Starbucks Coffee",
        "merchantName": "Starbucks",
        "date": "2024-01-15",
        "isPending": false,
        "category": {
          "id": "category_12345",
          "name": "Food & Dining",
          "subcategory": "Coffee Shops"
        },
        "location": {
          "city": "New York",
          "state": "NY",
          "country": "US"
        }
      }
    ],
    "totalTransactions": 1,
    "hasMore": false
  }
}
```

## Data Synchronization API

### Start Sync Job

Initiates a data synchronization job for specified accounts.

**Endpoint**: `POST /sync/start`

**Request**:
```json
{
  "userId": "user_12345",
  "accountIds": ["account_12345", "account_67890"],
  "syncType": "incremental",
  "priority": "high",
  "options": {
    "includeTransactions": true,
    "includeBalances": true,
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "jobId": "sync_job_12345",
    "status": "queued",
    "priority": "high",
    "estimatedDuration": 30,
    "queuePosition": 2
  }
}
```

### Get Sync Status

Retrieves the status of a synchronization job.

**Endpoint**: `GET /sync/status/{jobId}`

**Response**:
```json
{
  "success": true,
  "data": {
    "jobId": "sync_job_12345",
    "status": "running",
    "progress": {
      "percentage": 65,
      "currentStep": "Processing transactions",
      "stepsCompleted": 3,
      "totalSteps": 5
    },
    "statistics": {
      "accountsProcessed": 2,
      "transactionsProcessed": 150,
      "transactionsAdded": 25,
      "transactionsUpdated": 5,
      "duplicatesDetected": 3
    },
    "startTime": "2024-01-15T10:30:00Z",
    "estimatedCompletion": "2024-01-15T10:32:00Z"
  }
}
```

### Resolve Data Conflict

Resolves a data conflict between local and provider data.

**Endpoint**: `POST /sync/resolve-conflict`

**Request**:
```json
{
  "conflictId": "conflict_12345",
  "resolution": "merge",
  "localData": {
    "id": "transaction_12345",
    "description": "Coffee Shop (edited)",
    "categoryId": "category_12345"
  },
  "providerData": {
    "id": "transaction_12345",
    "description": "Starbucks Coffee",
    "merchantName": "Starbucks"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "resolvedData": {
      "id": "transaction_12345",
      "description": "Coffee Shop (edited)",
      "merchantName": "Starbucks",
      "categoryId": "category_12345",
      "conflictResolution": "merge"
    }
  }
}
```

## Security Services API

### Biometric Authentication

Initiates biometric authentication for sensitive operations.

**Endpoint**: `POST /security/biometric-auth`

**Request**:
```json
{
  "userId": "user_12345",
  "operation": "view_transactions",
  "promptMessage": "Authenticate to view transactions",
  "options": {
    "allowFallback": true,
    "timeout": 30
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "authToken": "biometric_token_12345",
    "biometricType": "face_id",
    "expiresAt": "2024-01-15T11:00:00Z"
  }
}
```

### Get Security Settings

Retrieves security settings for a user.

**Endpoint**: `GET /security/settings/{userId}`

**Response**:
```json
{
  "success": true,
  "data": {
    "biometricEnabled": true,
    "biometricType": "face_id",
    "requireBiometricForTransactions": true,
    "requireBiometricForSettings": true,
    "sessionTimeout": 1800,
    "lastSecurityUpdate": "2024-01-15T09:00:00Z"
  }
}
```

### Update Security Preferences

Updates security preferences for a user.

**Endpoint**: `PUT /security/preferences/{userId}`

**Request**:
```json
{
  "requireBiometricForTransactions": true,
  "requireBiometricForSettings": true,
  "allowFallback": true,
  "sessionTimeout": 1800,
  "lockoutDuration": 300
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "updated": true,
    "preferences": {
      "requireBiometricForTransactions": true,
      "requireBiometricForSettings": true,
      "allowFallback": true,
      "sessionTimeout": 1800,
      "lockoutDuration": 300
    }
  }
}
```

## Webhook Endpoints

### Plaid Webhooks

Handles webhook notifications from Plaid for real-time updates.

**Endpoint**: `POST /webhooks/plaid`

**Request Headers**:
```http
Content-Type: application/json
Plaid-Verification: <webhook_verification_key>
```

**Transaction Update Webhook**:
```json
{
  "webhook_type": "TRANSACTIONS",
  "webhook_code": "DEFAULT_UPDATE",
  "item_id": "item_12345",
  "new_transactions": 5,
  "removed_transactions": []
}
```

**Item Error Webhook**:
```json
{
  "webhook_type": "ITEM",
  "webhook_code": "ERROR",
  "item_id": "item_12345",
  "error": {
    "error_code": "ITEM_LOGIN_REQUIRED",
    "error_message": "User needs to re-authenticate"
  }
}
```

### Sync Status Webhooks

Notifies clients of synchronization job status changes.

**Endpoint**: `POST /webhooks/sync-status`

**Request**:
```json
{
  "jobId": "sync_job_12345",
  "status": "completed",
  "userId": "user_12345",
  "statistics": {
    "accountsProcessed": 2,
    "transactionsProcessed": 150,
    "duration": 45
  }
}
```

## Error Handling

### Error Response Format

All API errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request is invalid",
    "details": {
      "field": "accountId",
      "reason": "Account ID is required"
    },
    "requestId": "req_12345",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Plaid-Specific Errors

| Code | Description | Resolution |
|------|-------------|------------|
| `ITEM_LOGIN_REQUIRED` | User needs to re-authenticate | Initiate Plaid Link update mode |
| `INSUFFICIENT_CREDENTIALS` | Invalid bank credentials | User must update credentials |
| `ITEM_LOCKED` | Account temporarily locked | Wait and retry later |
| `PRODUCTS_NOT_READY` | Data not yet available | Retry after delay |

## Rate Limiting

### Rate Limits

| Endpoint Category | Limit | Window |
|------------------|-------|--------|
| Authentication | 10 requests | 1 minute |
| Plaid Operations | 100 requests | 1 hour |
| Sync Operations | 50 requests | 1 hour |
| Webhook Endpoints | 1000 requests | 1 hour |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642694400
X-RateLimit-Window: 3600
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 100,
      "window": 3600,
      "retryAfter": 300
    }
  }
}
```

## API Versioning

### Version Strategy

- **Current Version**: v1
- **Versioning Method**: URL path versioning (`/v1/`, `/v2/`)
- **Backward Compatibility**: Maintained for 12 months
- **Deprecation Notice**: 6 months advance notice

### Version Headers

```http
API-Version: 1.0
Accept-Version: 1.0
```

### Migration Guide

When migrating between API versions:

1. **Review Breaking Changes**: Check the migration guide for your target version
2. **Test in Staging**: Validate all integrations in staging environment
3. **Update Client Code**: Modify API calls to use new version
4. **Monitor Metrics**: Watch for errors after deployment
5. **Rollback Plan**: Have a rollback strategy ready

### Deprecation Timeline

| Version | Release Date | Deprecation Date | End of Life |
|---------|--------------|------------------|-------------|
| v1.0 | 2024-01-01 | TBD | TBD |
| v0.9 | 2023-06-01 | 2024-06-01 | 2024-12-01 |

---

## Support

For API support and questions:
- **Documentation**: [https://docs.moneymood.app](https://docs.moneymood.app)
- **Developer Support**: developers@moneymood.app
- **Status Page**: [https://status.moneymood.app](https://status.moneymood.app)
- **GitHub Issues**: [https://github.com/moneymood/api/issues](https://github.com/moneymood/api/issues)

---

*Money Mood API Documentation - Version 1.0*
*Last Updated: January 15, 2024*

