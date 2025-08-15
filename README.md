# Tapistry Analytics Platform

A privacy-first, high-performance web analytics platform delivering click heatmaps, session replays, and funnel analytics through a single JavaScript snippet.

## 🚀 Quick Start

### What's Built So Far

✅ **Phase 1 Foundation (Complete)**
- SDK core with event collection (clicks, page views, scroll tracking)
- Session management with 30-minute timeout
- Event batching and transport layer
- Privacy features (DNT respect, data masking)
- Monorepo structure with TypeScript

⏳ **Still Needed**
- Cloudflare Workers for data ingestion
- ClickHouse database setup
- Next.js dashboard
- Session replay (Phase 2)
- Funnel analytics (Phase 3)

## 📋 Prerequisites

Before you begin, you'll need accounts for these services:

1. **Cloudflare** (for Workers & R2 storage)
   - Sign up at [cloudflare.com](https://cloudflare.com)
   - You'll need your Account ID and API Token

2. **ClickHouse Cloud** (for analytics data)
   - Sign up at [clickhouse.cloud](https://clickhouse.cloud)
   - Create a new service and get connection details

3. **Neon** (for PostgreSQL metadata)
   - Sign up at [neon.tech](https://neon.tech)
   - Create a new project and get the connection string

4. **Vercel** (for dashboard hosting)
   - Sign up at [vercel.com](https://vercel.com)
   - Connect your GitHub account

## 🛠️ Local Development Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/jonathanleane/Tapistry.git
cd Tapistry

# Install dependencies
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root:

```env
# Cloudflare
CF_ACCOUNT_ID=your_account_id
CF_API_TOKEN=your_api_token
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key

# ClickHouse Cloud
CLICKHOUSE_HOST=your_host.clickhouse.cloud
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=your_password

# Neon PostgreSQL
DATABASE_URL=postgresql://user:pass@host/dbname

# Dashboard (for local development)
NEXTAUTH_SECRET=generate_a_secret_here
NEXTAUTH_URL=http://localhost:3000
```

### 3. Build the SDK

```bash
# Build shared types first
npm run build:shared

# Build the SDK
npm run build:sdk

# The SDK will be available at packages/sdk/dist/tapistry.js
```

## 🚧 Next Steps to Get Running

### Step 1: Set Up Cloudflare Workers (Required)

The SDK needs an ingestion endpoint to send data to. Create the Cloudflare Worker:

```bash
# Navigate to edge package
cd packages/edge

# Create the worker files (TODO: implement these)
# - src/index.ts (main worker)
# - src/routes/ingest.ts (handles /i endpoint)
# - src/validation.ts (validates events)
# - wrangler.toml (Cloudflare config)

# Deploy to Cloudflare
npx wrangler deploy
```

### Step 2: Initialize Databases (Required)

#### ClickHouse Setup
```sql
-- Run these in your ClickHouse Cloud console
-- See migrations/clickhouse/001_initial.sql (needs to be created)
```

#### Neon PostgreSQL Setup
```sql
-- Run these in your Neon console
-- See migrations/postgres/001_initial.sql (needs to be created)
```

### Step 3: Test the SDK

Create a test HTML file:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Tapistry Test</title>
</head>
<body>
  <h1>Testing Tapistry Analytics</h1>
  <button id="test-button">Click Me</button>
  
  <!-- Tapistry SDK -->
  <script>
    (function(w,d,s,u,k){w.tapistry=w.tapistry||function(){(w.tapistry.q=w.tapistry.q||[]).push(arguments)};
      var js=d.createElement(s);js.async=1;js.src=u;js.dataset.project=k;
      d.head.appendChild(js);
    })(window,document,'script','./packages/sdk/dist/tapistry.js','YOUR_PROJECT_KEY');
    
    tapistry('config', {
      apiUrl: 'http://localhost:8787', // Your local Cloudflare Worker
      debug: true
    });
  </script>
</body>
</html>
```

### Step 4: Build the Dashboard (Optional for now)

```bash
cd packages/dashboard

# Create Next.js app structure (TODO)
# Implement pages:
# - Overview
# - Heatmaps
# - Session Replays
# - Funnels

npm run dev
# Dashboard will be at http://localhost:3000
```

## 📁 Project Structure

```
Tapistry/
├── packages/
│   ├── sdk/              ✅ Client-side JavaScript SDK
│   ├── shared/           ✅ Shared TypeScript types
│   ├── edge/             ❌ Cloudflare Workers (TODO)
│   └── dashboard/        ❌ Next.js dashboard (TODO)
├── migrations/
│   ├── clickhouse/       ❌ ClickHouse schemas (TODO)
│   └── postgres/         ❌ Neon schemas (TODO)
├── plan.md               ✅ Detailed technical specification
├── CLAUDE.md            ✅ AI development guide
└── README.md            ✅ This file
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific package tests
npm run test --workspace=@tapistry/sdk

# Check bundle size
npm run size --workspace=@tapistry/sdk
```

## 📊 Current Implementation Status

### SDK Features
- ✅ Event collection (clicks, page views, scroll)
- ✅ Session management
- ✅ Event batching
- ✅ SPA route detection
- ✅ Privacy controls (DNT, masking)
- ❌ Session replay recording
- ❌ Custom event tracking
- ❌ User identification

### Infrastructure
- ❌ Cloudflare Worker ingestion
- ❌ ClickHouse event storage
- ❌ PostgreSQL metadata
- ❌ R2 replay storage
- ❌ Dashboard UI
- ❌ Authentication system

## 🤝 Contributing

This project is in active development. The Phase 1 SDK foundation is complete, but the backend infrastructure and dashboard still need to be built.

Priority tasks:
1. Implement Cloudflare Worker for data ingestion
2. Set up ClickHouse schemas and materialized views
3. Create basic dashboard with heatmap viewer
4. Add authentication system

See [plan.md](./plan.md) for the complete technical specification.

## 📝 License

Private project - not yet licensed for public use.

## 🆘 Troubleshooting

### SDK not loading?
- Check browser console for errors
- Verify project key is set
- Ensure Cloudflare Worker is deployed

### No data showing up?
- Check SDK debug mode: `tapistry('debug', true)`
- Verify ingestion endpoint is accessible
- Check browser network tab for failed requests

### Build errors?
- Run `npm run clean` and reinstall
- Ensure Node.js >= 18.0.0
- Check TypeScript errors: `npm run typecheck`

## 📚 Resources

- [Technical Specification](./plan.md) - Complete project plan
- [Development Guide](./CLAUDE.md) - AI assistant context
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers)
- [ClickHouse Docs](https://clickhouse.com/docs)
- [Next.js Docs](https://nextjs.org/docs)