# Swagger/OpenAPI Documentation Setup

## Overview

This project includes Swagger/OpenAPI documentation for all API endpoints. The documentation is available at `/api/v1/docs` once the required packages are installed.

## Installation

To enable the Swagger UI, install the required packages:

```bash
npm install swagger-ui-express
npm install --save-dev @types/swagger-ui-express
```

## Files Created

1. **`swagger.json`** - Complete OpenAPI 3.0 specification for all endpoints
2. **`src/routes/docsRoutes.ts`** - Route handler for Swagger UI

## Endpoints

### Swagger UI
- **URL**: `http://localhost:5000/api/v1/docs`
- **Description**: Interactive API documentation interface

### Swagger JSON
- **URL**: `http://localhost:5000/api/v1/docs/json`
- **Description**: Raw OpenAPI JSON specification

## Current Status

The Swagger route is set up but requires the `swagger-ui-express` package to be installed. Currently, the `/docs` endpoint returns a message with instructions.

## After Installation

Once you install `swagger-ui-express`, update `src/routes/docsRoutes.ts`:

1. Uncomment the import statement:
```typescript
import swaggerUi from 'swagger-ui-express';
```

2. Uncomment the Swagger UI setup:
```typescript
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Quran App API Documentation',
}));
```

3. Remove or comment out the temporary endpoint.

## Documentation Coverage

The Swagger documentation includes:

- ✅ **Authentication** (7 endpoints)
  - Register, Login, Google/Apple Sign-In, Refresh Token, Get User, Update Profile, FCM Token

- ✅ **Quran** (15 endpoints)
  - Get Surahs, Get Surah by Number, Get Ayah, Search, Juz, Page, Manzil, Ruku, Hizb, Sajda, Meta, Editions

- ✅ **Hadiths** (6 endpoints)
  - Collections, Get by Collection, Chapters, Get by Chapter, Search, Get by ID

- ✅ **Duas** (5 endpoints)
  - Get All, Categories, Get by Category, Search, Get by ID

- ✅ **Prayer Times** (5 endpoints)
  - Get by Coordinates, Get by City, Monthly Calendar, Next Prayer, Qibla Direction

- ✅ **Bookmarks** (6 endpoints)
  - Create, Get All, Check, Get by ID, Update, Delete

- ✅ **AI Features** (3 endpoints)
  - Semantic Search, Ask Question, Chat

- ✅ **Health Check** (1 endpoint)

**Total: 48 documented endpoints**

## Features

- Complete request/response schemas
- Authentication requirements
- Query parameters
- Path parameters
- Error responses
- Example values
- Detailed descriptions

## Customization

You can customize the Swagger UI by modifying the options in `docsRoutes.ts`:

```typescript
swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Quran App API Documentation',
  customfavIcon: '/favicon.ico',
  // Add more customization options here
});
```

## Updating Documentation

To update the API documentation:

1. Edit `swagger.json` directly
2. Or use a tool like Swagger Editor
3. Ensure the JSON is valid
4. Restart the server

## Testing

Once Swagger UI is enabled, you can:

1. View all available endpoints
2. See request/response schemas
3. Test endpoints directly from the UI
4. View authentication requirements
5. See example requests and responses

---

**Note**: The Swagger documentation is automatically generated from the `swagger.json` file. Keep it updated as you add or modify endpoints.

