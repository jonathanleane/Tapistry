# Tapistry Analytics Platform - Development Guide

## ⚠️ IMPORTANT: Always refer to plan.md for detailed specifications
The [plan.md](./plan.md) file contains the complete technical specification with:
- Detailed requirements for each component
- Database schemas and API contracts
- Specific algorithms and implementations
- Performance targets and constraints
- Security and privacy requirements

This CLAUDE.md provides quick reference and context. When implementing ANY feature, ALWAYS check plan.md first for the authoritative specification.

## Project Overview
Building Tapistry, a privacy-first web analytics platform with heatmaps, session replays, and funnel analytics. Target: 5-10M monthly pageviews, single JS snippet installation.

## Tech Stack
- **Client SDK**: TypeScript, no runtime deps, <15KB gzipped
- **Edge**: Cloudflare Workers + Queues
- **Storage**: ClickHouse Cloud (events), Neon Postgres (metadata), R2 (replays)
- **Dashboard**: Next.js on Vercel
- **Languages**: TypeScript for all JavaScript code

## Project Structure
```
/
├── packages/
│   ├── sdk/              # Client SDK (TypeScript)
│   ├── edge/             # Cloudflare Workers
│   ├── dashboard/        # Next.js dashboard
│   └── shared/           # Shared types/utils
├── migrations/
│   ├── clickhouse/       # ClickHouse schemas
│   └── postgres/         # Neon schemas
└── docs/                 # Documentation
```

## Development Commands
```bash
# Install dependencies
npm install

# Development
npm run dev               # Start all services in dev mode
npm run dev:sdk          # SDK development with hot reload
npm run dev:edge         # Edge workers with wrangler
npm run dev:dashboard    # Next.js dashboard

# Testing
npm run test             # Run all tests
npm run test:unit        # Unit tests only
npm run test:e2e         # E2E tests with Playwright
npm run test:browser     # Cross-browser tests

# Build & Deploy
npm run build            # Build all packages
npm run deploy:staging   # Deploy to staging
npm run deploy:prod      # Deploy to production

# Code Quality
npm run lint             # ESLint check
npm run typecheck        # TypeScript type checking
npm run format           # Prettier formatting
```

## Implementation Phases

### Phase 1: Core Analytics & Heatmaps (Current)
- [ ] SDK core: session management, event batching, transport
- [ ] Click/tap tracking with normalized coordinates
- [ ] Scroll depth tracking
- [ ] SPA route detection
- [ ] Edge ingestion endpoints (/i for events)
- [ ] ClickHouse schema and materialized views
- [ ] Basic dashboard with heatmap viewer

### Phase 2: Session Replay
- [ ] DOM snapshot and mutation observer
- [ ] Replay chunking and compression
- [ ] R2 storage for replay segments
- [ ] Replay player with sandboxed iframe
- [ ] Privacy masking for sensitive data

### Phase 3: Funnels
- [ ] Funnel definition builder
- [ ] ClickHouse funnel queries
- [ ] Breakdown dimensions
- [ ] Export functionality

### Phase 4: Production Hardening
- [ ] Auth system (magic links)
- [ ] Rate limiting
- [ ] Monitoring and alerts
- [ ] Documentation
- [ ] Load testing

## Key Technical Decisions

### SDK Architecture
- Use queueable command pattern for early loading
- Lazy load replay recorder only when sampled
- Batch events (25-50 events or 50-100KB)
- Use sendBeacon with fetch fallback
- No external dependencies

### Data Pipeline
- Edge validation at Cloudflare Workers
- Queue events before ClickHouse insertion
- Idempotency via event_id deduplication
- Materialized views for heatmap tiles

### Privacy & Security
- Default masking for inputs/text
- Never store raw IPs
- Respect DNT header
- Project origin allowlists
- Sandboxed replay player

### Performance Targets
- SDK: <15KB initial, <1ms event overhead
- Ingestion: p95 <200ms
- Dashboard queries: p95 <1.5s
- Heatmap load: <2s
- Replay first frame: <2s

## Development Guidelines

### Code Style
- TypeScript strict mode
- Functional components (React)
- No unnecessary comments
- Prefer composition over inheritance
- Use existing patterns in codebase

### Testing Requirements
- Unit tests for all business logic
- E2E tests for critical flows
- Cross-browser testing for SDK
- Load testing before production

### Git Workflow
- Feature branches from main
- Conventional commits
- PR reviews required
- CI must pass before merge

## Environment Variables
```env
# Cloudflare
CF_ACCOUNT_ID=
CF_API_TOKEN=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=

# ClickHouse
CLICKHOUSE_HOST=
CLICKHOUSE_USER=
CLICKHOUSE_PASSWORD=

# Neon Postgres  
DATABASE_URL=

# Dashboard
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

## Common Tasks

### Adding a new event type
1. Define type in `packages/shared/types/events.ts`
2. Add collection logic in `packages/sdk/src/collectors/`
3. Update edge validation in `packages/edge/src/validators/`
4. Add to ClickHouse schema if needed
5. Update dashboard to display new event

### Debugging SDK issues
1. Enable debug mode: `tapistry('debug', true)`
2. Check browser console for events
3. Verify network tab for /i requests
4. Check edge worker logs in Cloudflare

### Performance optimization
1. Run bundle analyzer: `npm run analyze`
2. Check SDK size: `npm run size`
3. Profile with Chrome DevTools
4. Monitor ClickHouse query performance

## Important Notes
- Always run `npm run lint` and `npm run typecheck` before committing
- Keep SDK bundle under 15KB gzipped
- Test on real devices, not just Chrome
- Consider privacy implications for any new data collection
- Document any deviations from plan.md

## Resources
- **[Main Specification](./plan.md) - ALWAYS CHECK THIS FIRST**
- [ClickHouse Docs](https://clickhouse.com/docs)
- [Cloudflare Workers](https://developers.cloudflare.com/workers)
- [Next.js Docs](https://nextjs.org/docs)

## Specification Quick Reference
When implementing features, refer to these sections in plan.md:
- **SDK details**: Sections 3.1-3.9 (packaging, API, events, transport)
- **Database schemas**: Section 5 (ClickHouse tables, Postgres schema)
- **API contracts**: Section 6, Appendices A-B (JSON formats)
- **Algorithms**: Section 17 (heatmap tiling, selector generation, SPA detection)
- **Privacy/Security**: Sections 10-11 (masking, compliance, threat model)
- **Performance targets**: Section 12 (SLOs, capacity planning)