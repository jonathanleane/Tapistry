Tapistry Analytics Platform – Comprehensive Technical Specification (v0.9, August 15, 2025)

Executive summary
- Goal: Build Tapistry, a privacy‑first, high‑performance web analytics platform delivering click heatmaps, session replays, and funnel analytics through a single JavaScript snippet. Designed for 5–10M monthly pageviews across your sites, with room to scale.
- Constraints and defaults:
  - Managed infra OK (Cloudflare, ClickHouse Cloud, Neon Postgres, Vercel, R2).
  - Replays sampled by default at 30%.
  - No strict data‑residency required.
  - Install friction: single snippet, sane defaults, no code changes for common use cases.
- Phased delivery:
  - Phase 1 (Weeks 1–3): Heatmaps (clicks, scroll), dashboard, ingestion, basic analytics.
  - Phase 2 (Weeks 4–6): Session replay capture, storage, and player.
  - Phase 3 (Weeks 7–8): Funnels with breakdowns.
  - Phase 4 (Weeks 9–10): Production hardening, auth, rate limiting, docs, monitoring.

Section 0 – Assumptions to finalize
- Scale unit: This spec assumes “5M pageviews/month initially; 10M pageviews/month within 12 months.” If instead those numbers are sessions, sampling/quotas must be adjusted.
- Initial domains: Provide the first 3–5 domains for origin allowlists and CSP examples.
- Overlay mode: Some sites set X‑Frame‑Options/Frame‑Ancestors to block iframing; Tapistry will support three heatmap overlay modes: Live Iframe Overlay (default), Static Snapshot Overlay, and Bookmarklet Overlay (for sites with strict framing).
- Privacy defaults: Consent not required globally; SDK respects Do Not Track and provides consent API for those who want to integrate a CMP.

1) Product goals and non‑goals
- Goals
  - One‑line install for actionable insights: heatmaps, replays (sampled), funnels, simple dashboards.
  - Low client overhead (<15 KB gzipped initial, minimal CPU).
  - Accurate SPA route tracking; solid handling of modern frontend stacks.
  - Privacy-first defaults: masking; avoid sensitive data by design.
  - Fast UI: heatmap load <2 s; replay first frame <2 s; funnel queries <2 s for typical ranges.
- Non‑goals (MVP)
  - Native mobile SDKs (Phase 3+).
  - Advanced ML insights (rage/dead click detection in Phase 2+).
  - Team RBAC, SSO/SAML, billing (Phase 2/4+).
  - Server‑side analytics (log ingestion) beyond client JS.

2) Core features
- Heatmaps
  - Click/tap density with 64×64 tile grid aggregation, KDE blur in viewer.
  - Scroll maps: 0–100% depth histogram; optional “attention” estimate.
  - Device segmentation: desktop/mobile/tablet; viewport width buckets.
  - Element mode: per‑selector counts via selector hashes.
- Session replay
  - DOM snapshot + mutations; masked inputs and text by default.
  - Events: snapshot, mutation, input (masked), scroll, viewport, meta.
  - Sampling: default 30% of sessions; per‑project configurable.
  - Player: sandboxed iframe, timeline, skip inactivity, jump to interactions.
- Funnels
  - Steps: URL rules, click on selector, or custom track events.
  - Options: strict/loose order; max time between steps; session window.
  - Breakdowns: device class, country, referrer, UTM source/medium/campaign; first vs returning.
- Dashboard
  - Overview (traffic, top pages, referrers).
  - Heatmaps (path/date/device filters; overlay modes; export PNG/CSV).
  - Replays (filters, list, player).
  - Funnels (builder, results, breakdowns).
  - Settings (keys, masking, sampling, retention, origins, consent).
- Privacy and security
  - Masking defaults; data minimization; DNT; region‑aware consent hooks.
  - Secure by default: project origin allowlists; SRI; TLS; encryption at rest.

3) Client SDK specification
3.1 Packaging and delivery
- Builds: ESM module (modern), IIFE nomodule (legacy). No runtime deps.
- Size budgets: initial loader ≤15 KB gz; replay recorder loaded lazily only when sampled.
- CDN: cdn.tapistry.app with immutable, long‑cache assets; SRI hashes published.
- Browser support baseline: Chrome/Edge/Firefox last 2; Safari last 2; iOS Safari 14+; Android Chrome 9+.

3.2 Loader snippet (public)
- Behavior: queues commands until SDK loads; optional pre‑config.
- Example:

<script>
  (function(w,d,s,u,k){w.tapistry=w.tapistry||function(){(w.tapistry.q=w.tapistry.q||[]).push(arguments)};
    var js=d.createElement(s);js.async=1;js.src=u;js.dataset.project=k;js.crossOrigin='anonymous';js.integrity='SRI_HASH';
    d.head.appendChild(js);
  })(window,document,'script','https://cdn.tapistry.app/v1.js','YOUR_PROJECT_KEY');

  tapistry('config', {
    replaySampleRate: 0.30,
    sampleRate: 1.0,
    maskText: true,
    respectDNT: true,
    maxEventsPerSession: 5000,
    maxReplayBytesPerSession: 3_000_000,
    mousemove: { enabled:false, hz:5 },     // off by default
    scroll: { milestones:[25,50,75,90,100] }
  });
</script>

3.3 Public SDK API (queueable commands)
- config(options)
- identify(userId, traits?)
- track(name, properties?)
- page(nameOrPath?, properties?)    // manual override; auto for most SPAs
- setConsent({ analytics:boolean, replay:boolean })
- reset()                           // clears ids; starts new session
- debug(enable:boolean)

3.4 Initialization and sessionization
- Anonymous and session IDs:
  - anonymous_id: UUID v4 persisted in first‑party storage (cookie or localStorage). Cross‑domain linking optional via URL decorator (phase 2+).
  - session_id: UUID v4; new session after 30 min inactivity or upon reset.
- DNT and consent:
  - If respectDNT true and navigator.doNotTrack is “1”, no events/replay.
  - If setConsent called with analytics:false, disable analytics; with replay:false, disable recording.
- Time sync:
  - Server returns Date header; SDK stores clock skew; event_time = client_ts + skew.

3.5 Event collection modules
- Page/router
  - Auto page_view on load and History API changes (pushState/replaceState/popstate/hashchange).
  - SPA route detection debounced (200 ms) to collapse rapid changes.
  - Captures: url, path, title, referrer, UTM params (allowlist), viewport, device class.
- Click/tap
  - Pointerdown/click/touchend; capture normalized coords x,y in 0..1 of viewport; element selector; element bounding rect; button; text snippet hash.
  - Debounce double clicks; suppress events inside [data-tapistry-ignore].
- Scroll
  - Continuous sampling off; record milestones (e.g., 25/50/75/90/100%).
  - Optional attention samples (every 1–2 s while viewport moving).
- Mousemove (optional)
  - If enabled, sample at 5–10 Hz max; capture normalized x,y only; auto‑enable for short windows when user is idle near important elements (phase 2+).
- Replay recorder (lazy)
  - Loaded when session chosen by replaySampleRate.
  - Captures: snapshot, mutation, input (masked), scroll, viewport.
  - Throttling: emit at most 1 replay chunk/second and 3 MB compressed per session (configurable).
  - Exclusions: never inside password fields; ignore cross‑origin iframes; respect [data-tapistry-mask] and [data-tapistry-ignore] subtree.
- Device/UA
  - Lightweight device class detection (viewport + UA hints); avoid heavy UA parsers on client.

3.6 Privacy/masking
- Defaults:
  - Always redact: input[type=password], elements with autocomplete=cc-number, cvv patterns, IBAN/SSN patterns, emails.
  - Mask text nodes under input, textarea, contenteditable; blur via CSS overlay in replay player.
- Config:
  - maskText (boolean); allowSelectors[] (whitelist), maskSelectors[] (blacklist).
  - URL sanitizer: drop sensitive query params; per‑project allowlist (utm_, gclid, fbclid, etc.).

3.7 Transport and reliability
- Batching: send after 25–50 events or 50–100 KB, whichever first; flush on pagehide/visibilitychange.
- Primary: navigator.sendBeacon; fallback: fetch({ keepalive:true }).
- Offline: store a small queue in memory only; do not persist to storage to avoid PII risk. Discard when offline longer than 60 s (configurable).
- Backoff: exponential (200 ms → 10 s), jitter; drop after N retries; record client‑side error metric.

3.8 Performance budgets
- Event handler overhead: median ≤1 ms; ≤60 events/sec cap per session.
- GC pressure minimal; avoid closures in hot paths; object pools for event records.
- Avoid reading layout in hot paths; use passive event listeners where possible.

3.9 Selector generation
- Strategy: prefer stable IDs (id attribute), then data‑ attributes, then role/name, then nth‑child ladder; never include text literals; store selector_hash (UInt64) for grouping; keep full selector string as nullable for debugging only (sampled).

4) Edge ingestion and queueing
4.1 Endpoints
- POST /i (analytics events)
  - Headers: X-Project-Key (public project key); Content-Type: application/json; X-Client-Time: ms since epoch (optional).
  - Body: { sdk:{ver}, client:{tz, lang}, events:[…] }
  - Response: { accepted, rejected, errors:[…], server_time }
- POST /r (replay chunks)
  - Headers: X-Project-Key; Content-Encoding: gzip (optional); Content-Type: application/json or application/octet-stream for JSONL.
  - Body: { session_id, chunk_index, from_ms, to_ms, size, events:[…] } or streamed JSONL.
  - Response: { accepted:true, next_chunk: n+1 }
- OPTIONS for CORS preflight permitted origins (see allowlist).

4.2 Validation and enrichment (Cloudflare Worker)
- Validate key → resolve project_id and settings from CF KV/Cache/Neon.
- JSON schema validation (fast path; Zod/Valibot in Worker).
- Geo enrichment: CF request.cf.country; store only country code. Optionally region/city later.
- UA parsing: minimal device class on edge; full UA stored raw for offline parsing if needed.
- Bot heuristics: CF Bot score if available; else user‑agent patterns, extreme rates, headless signals; annotate bot_score 0–100.
- DNT/consent enforcement: drop if configured.

4.3 Rate limiting and idempotency
- Limits (default):
  - /i: per project 2k req/s; per IP 200 req/s; per session 60 events/s.
  - /r: per project 500 chunks/s; per session 1 chunk/s; 3 MB compressed cap.
- Idempotency:
  - event_id UUID required for each event; Redis/CF KV short‑term “seen” set with 48h TTL; drop duplicates.
  - replay chunk key: (project_id, session_id, chunk_index) unique; Replacing/ignore duplicates in index.

4.4 Queue and consumers
- Cloudflare Queues for both /i and /r; distinct queues.
- Consumers (Workers/Pages Functions or Durable Objects) batch writes to ClickHouse every 200–500 ms or at 1–2 MB payloads, with retries and backpressure to prevent CH overload.
- Retries: exponential with DLQ (secondary Queue) if ClickHouse or R2 transient failures occur.

5) Storage layer
5.1 ClickHouse schema (events-first)
- Events table (MergeTree). Keep schema query‑friendly for funnels and heatmaps.

CREATE TABLE events (
  event_date Date DEFAULT toDate(event_time),
  event_time DateTime64(3),
  ingest_ts DateTime DEFAULT now(),
  event_id UUID,
  project_id String,
  session_id String,
  anonymous_id String,
  user_id LowCardinality(Nullable(String)),
  type LowCardinality(String),           -- page_view, click, scroll, custom, replay_meta
  url String,
  path String,
  title String,
  referrer String,
  utm Map(String, String),
  device_class LowCardinality(String),   -- 'desktop','mobile','tablet'
  ua String,
  country FixedString(2),
  viewport_w UInt16,
  viewport_h UInt16,
  x Nullable(Float32),                   -- normalized 0..1 (click/move)
  y Nullable(Float32),
  selector_hash Nullable(UInt64),
  selector Nullable(String),             -- optional, for debugging
  props JSON
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_date)
ORDER BY (project_id, event_date, session_id, event_time)
TTL event_time + toIntervalDay(180);

- Indices and projections
  - Data skipping index for path:

ALTER TABLE events ADD INDEX idx_path path TYPE minmax GRANULARITY 1;

  - Optional projection for fast “top pages” and “referrer” queries.

- Heatmap tiles (AggregatingMergeTree, hourly buckets)

CREATE TABLE heatmap_tiles (
  project_id String,
  path String,
  device_class LowCardinality(String),
  viewport_bucket LowCardinality(String),
  ts_hour DateTime,
  tile_x UInt8,
  tile_y UInt8,
  clicks SimpleAggregateFunction(sum, UInt64)
)
ENGINE = AggregatingMergeTree
PARTITION BY toYYYYMM(ts_hour)
ORDER BY (project_id, path, device_class, viewport_bucket, ts_hour, tile_x, tile_y);

CREATE VIEW vw_bucket AS SELECT 1; -- placeholder for documentation

CREATE MATERIALIZED VIEW mv_click_tiles TO heatmap_tiles AS
SELECT
  project_id,
  normalized_path(path) AS path,
  device_class,
  vw_bucket(viewport_w) AS viewport_bucket,
  toStartOfHour(event_time) AS ts_hour,
  toUInt8(floor(x*64)) AS tile_x,
  toUInt8(floor(y*64)) AS tile_y,
  toUInt64(count()) AS clicks
FROM events
WHERE type = 'click' AND x >= 0 AND y >= 0
GROUP BY project_id, path, device_class, viewport_bucket, ts_hour, tile_x, tile_y;

- Scroll depth histogram

CREATE TABLE scroll_depth (
  project_id String,
  path String,
  device_class LowCardinality(String),
  ts_hour DateTime,
  depth_pct UInt8,                            -- 0..100
  views SimpleAggregateFunction(sum, UInt64)
)
ENGINE = AggregatingMergeTree
PARTITION BY toYYYYMM(ts_hour)
ORDER BY (project_id, path, device_class, ts_hour, depth_pct);

CREATE MATERIALIZED VIEW mv_scroll_depth TO scroll_depth AS
SELECT
  project_id,
  normalized_path(path) AS path,
  device_class,
  toStartOfHour(event_time) AS ts_hour,
  greatest(0,least(100, toUInt8(props.max_depth_pct))) AS depth_pct,
  toUInt64(count()) AS views
FROM events
WHERE type = 'scroll' AND JSONHas(props,'max_depth_pct')
GROUP BY project_id, path, device_class, ts_hour, depth_pct;

- Helper SQL UDFs (documented as macros)
  - normalized_path(path): lowercases, trims trailing slash except root, removes query string except allowlist, removes anchors.
  - vw_bucket(w): multiIf(w<480,'0-479', w<768,'480-767', w<1024,'768-1023', w<1440,'1024-1439','1440+')

5.2 Postgres (Neon) schema
- users(id uuid pk, email unique, created_at, last_login_at)
- sessions(id uuid pk, user_id fk, created_at, last_seen_at, ip_last4, user_agent_hash)
- projects(id uuid pk, owner_user_id fk, name, created_at, plan enum, settings jsonb, allowed_origins text[])
- api_keys(id uuid pk, project_id fk, public_key unique, active bool, created_at, rotated_at)
- funnels(id uuid pk, project_id fk, name, definition jsonb, created_at, updated_at)
- replay_sessions(session_id uuid pk, project_id fk, started_at timestamptz, duration_ms int, url_count int, event_count int, compressed_size int, device_class text, country char(2), has_errors bool, created_at timestamptz)
- audit_logs(id uuid pk, project_id fk, actor_user_id fk, action text, details jsonb, ts timestamptz)
- exports(id uuid pk, project_id fk, type text, status enum, filters jsonb, url text, created_at, completed_at)
- invitations (phase 2+)
- billing tables (phase 3/4+)

5.3 Object storage (R2)
- Layout
  - replays/{project_id}/{session_id}/manifest.json
  - replays/{project_id}/{session_id}/segments/{n}.gz
- Lifecycle
  - replay retention default 60 days; configurable per project; auto‑delete via lifecycle rules.
- Manifest example

{
  "version":"1.0",
  "project_id":"...",
  "session_id":"...",
  "started_at": 1723718400123,
  "duration_ms": 284000,
  "device":{"class":"desktop","vw":1440,"vh":900,"ua":"..."},
  "paths":["/","/pricing"],
  "segments":[
    {"n":0,"from":0,"to":120000,"size":238112,"key":"replays/p/s/m/segments/0.gz"},
    {"n":1,"from":120000,"to":284000,"size":198441,"key":"replays/p/s/m/segments/1.gz"}
  ],
  "stats":{"events": 1632,"masked_nodes":142}
}

6) API layer and contracts (dashboard, public reads)
6.1 Ingestion (above)
6.2 Public read APIs (authenticated via dashboard session or project read token)
- GET /api/heatmap?project_id=&path=&from=&to=&device=&vw=
  - Response: { grid:64, tiles:[{i,j,count}], total }
- GET /api/scrollmap?project_id=&path=&from=&to=&device=
  - Response: { histogram:[{depth_pct,count}], views }
- GET /api/replays?project_id=&filters=...
  - Response: [{ session_id, started_at, duration_ms, device_class, country, paths, size, event_count }]
- GET /api/replays/{session_id}/manifest
- GET /api/replays/{session_id}/chunk/{n}
- POST /api/funnels/query
  - Body: { project_id, definition, from, to, breakdowns[], options{ strictOrder, windowMs } }
  - Response: { steps:[{name,count,conv_to_next}], overall_conversion, breakdowns:{...} }

6.3 Auth for dashboard and APIs
- Passwordless magic link via email; signed JWT session cookie (HttpOnly/Secure/SameSite=Lax).
- CSRF tokens for state‑changing endpoints.
- Project scoping via per‑project role in session; audit logs for administrative actions.

7) Dashboard UX
- Overview
  - Chart: sessions/pageviews, top pages, top referrers, devices, countries.
- Heatmaps
  - Filters: date range, device, viewport bucket, path input autocomplete.
  - Overlay modes:
    - Live Iframe Overlay (default): render target site in iframe; draws canvas overlay; requires target to allow framing.
    - Static Snapshot Overlay: capture screenshot via headless browser service (render engine) and overlay heatmap; interactive element mode limited.
    - Bookmarklet Overlay: user runs a bookmarklet on their own site to inject overlay; bypasses framing restrictions; safest for production sites.
  - Element mode: switch to per‑selector counts; list Top 20 clickable elements.
  - Export: PNG; CSV of tile counts; JSON of element counts.
- Replays
  - Filters: date, path, device, country, duration, has_errors, bot_score<50 (default).
  - Player: speed 0.5×–4×; skip idle >5 s; jump to clicks/inputs; masked elements blurred.
- Funnels
  - Builder: steps with types (URL, click selector, custom event).
  - Results: counts per step, conversion rates, time between steps, breakdown by dimension; export CSV.
- Settings
  - Project keys; allowed origins; sampling; replay limits; retention; masking rules; path normalization rules; query param allowlist; consent defaults; webhooks; export data.

8) Funnels computation (ClickHouse)
8.1 Data model
- Steps are defined as predicates over events: e.g., path LIKE '/signup%', click selector_hash == X, custom event ‘Sign Up’.
- Options influence query: strict (ordered) vs loose; windowMs (max time between steps).

8.2 Query pattern (strict ordered, URL‑based example)
WITH step1 AS (
  SELECT session_id, minIf(event_time, path LIKE '/signup%') AS t1
  FROM events
  WHERE project_id = {project}
    AND event_date BETWEEN {from} AND {to}
  GROUP BY session_id
),
step2 AS (
  SELECT e.session_id, minIf(e.event_time, e.path LIKE '/onboarding%') AS t2
  FROM events e
  INNER JOIN step1 s ON e.session_id = s.session_id AND e.event_time > s.t1
  WHERE e.project_id = {project}
  GROUP BY e.session_id
),
step3 AS (
  SELECT e.session_id, minIf(e.event_time, e.path LIKE '/dashboard%') AS t3
  FROM events e
  INNER JOIN step2 s ON e.session_id = s.session_id AND e.event_time > s.t2
  WHERE e.project_id = {project}
  GROUP BY e.session_id
)
SELECT
  1 AS step, countIf(t1 IS NOT NULL) AS users
UNION ALL
SELECT
  2, countIf(t2 IS NOT NULL)
UNION ALL
SELECT
  3, countIf(t3 IS NOT NULL)
ORDER BY step;

- Breakdowns apply as additional GROUP BY (e.g., device_class, country, utm['source']).

9) Path normalization rules
- Normalization function normalized_path(path):
  - Lowercase path; keep leading slash.
  - Strip trailing slash except if path = “/”.
  - Remove query string and fragment entirely, except preserve keys in the per‑project allowlist (default: utm_source, utm_medium, utm_campaign, utm_term, utm_content; optionally variant/lang).
  - Collapse multiple slashes; remove default index filenames (/index, /index.html).
- Configure allowlist in Settings; store raw url separately for replay contexts.

10) Privacy, compliance, and data handling
- Data collected
  - Pseudonymous IDs, URL, path, referrer, title, UTM allowlist, viewport, device class, country, click/scroll coordinates, optional replay DOM structure and masked inputs.
  - No raw IP stored beyond transient edge enrichment; store only country code by default.
- Masking and opt‑outs
  - Default maskText true; selectors to mask/allow lists in Settings.
  - Respect DNT if respectDNT true (default).
  - Consent integration: tapistry.setConsent API; support simple adapters for common CMPs.
- Data retention
  - Events 180 days (default).
  - Replays 60 days (default).
  - Configurable per project; R2 lifecycle rules enforce replay retention.
- DSAR
  - Subject export/delete by user_id or anonymous_id: scan ClickHouse for events and Postgres for replays index, delete R2 objects and CH partitions/rows by filter. Provide export JSON/CSV for 30‑day windows.

11) Security and threat model
- Key risks
  - Ingestion abuse (spam/DoS), project key theft, cross‑tenant access, replay XSS, CSRF on admin endpoints, data exfil via export endpoints.
- Controls
  - Edge rate limits per project/IP/session; WAF rules; CF Bot score filtering.
  - Project origin allowlists for ingestion; drop events from unknown origins (configurable strictness).
  - SRI on CDN script; version pinning supported.
  - Replay player in sandboxed iframe with allow-same-origin false; sanitize attributes; no script execution within reconstructed DOM (render as inert or use a virtual DOM renderer).
  - Auth: magic links with signed tokens; short‑lived; email verification; session cookies HttpOnly/Secure; CSRF tokens.
  - Secrets in managed KMS; principle of least privilege; audit logs for settings changes.
  - Encryption at rest: ClickHouse Cloud, Neon, and R2 handle disk encryption; enforce TLS everywhere.

12) Performance, reliability, and SLOs
- Client
  - SDK initial load ≤15 KB gz; first byte to ready ≤50 ms on broadband.
  - Handler overhead ≤1 ms median per event; ≤1% CPU during normal browsing.
- Backend SLOs
  - Ingestion p95 <200 ms.
  - Dashboard queries p95 <1.5 s for 30‑day windows and ≤10M events.
  - Replay first frame <2 s (warm cache).
  - Availability: 99.9% monthly.
- Capacity planning (initial)
  - Assume 5M pageviews/month, ~0.6–1.0M sessions.
  - Events per pageview: 3–10 (page_view, scroll milestones, a few clicks); average 5 → 25M events/month.
  - Storage/event compressed in CH ~200–600 bytes → 5–15 GB/month ingest; 30–45 GB retained for 180 days.
  - Replay: 30% of sessions; avg 200–600 KB compressed per recorded session → 60–180 GB/month in R2 at 1M sessions; retention 60 days halves steady‑state.
  - Ingestion QPS: peaks of 200–400 events/s realistic; provision headroom ×3.

13) Observability and ops
- Metrics
  - Ingestion: requests, accept rate, latency p50/p95/p99, error rate by code, queue lag, ClickHouse insert times, DLQ size.
  - SDK: delivery success, retry counts, dropped due to caps, replay sampling rate, chunk sizes.
  - Dashboard: query latencies, cache hit rates, top slow queries.
- Logs
  - Structured JSON at edge and consumers; sample heavy flows; redact PII; request ids.
- Traces
  - Lightweight tracing across Worker → ClickHouse HTTP → API; correlation id in headers.
- Alerts
  - Ingestion lag >30 s, error rate >1%, ClickHouse query p95 >2 s, R2 5xx spike, SDK error spike.
- Runbooks
  - Playbooks for ClickHouse slowdowns, R2 failures, key rotation, replay backlog, hot partitions.

14) Testing plan
- SDK unit/integration (Vitest + JSDOM)
  - Session/id generation, SPA routing, click normalization, batching, DNT, fallback to fetch, throttling, selector generator property‑based tests, masking rules.
- Cross‑browser matrix (Playwright/Sauce)
  - Chrome/Firefox/Safari/Edge latest 2; iOS Safari 14+; Android Chrome 9+.
- E2E (Playwright)
  - Synthetic site with varied layouts (static, React Router, Next.js).
  - Capture clicks; verify tiles; scroll milestones; replay round‑trip; masking of emails/passwords; funnels on sample flows.
- Load tests (k6)
  - 10k concurrent virtual users; 1M events/hour; targets: p95<200 ms ingestion; 0 dropped inserts; ClickHouse backpressure handling.
- Privacy/security tests
  - Red‑team masking: seeded pages with PII patterns; ensure masked.
  - CSP modes: strict nonce, hash, no‑inline.
  - Replay XSS tests: ensure inert DOM, no script exec.
- Chaos tests
  - Drop/duplicate event batches; idempotency ensures no double counts.
  - Simulate ClickHouse/R2 outages; ensure DLQ and retry.

15) Deployment and environments
- DNS and domains
  - cdn.tapistry.app → CDN host for SDK assets.
  - ingest.tapistry.app → Cloudflare Worker /i and /r endpoints.
  - api.tapistry.app → API reads and dashboard SSR helpers.
  - app.tapistry.app → Vercel dashboard.
- Environments
  - Local: dev stack with ClickHouse/Neon containers or cloud dev resources.
  - Staging: mirrors prod with separate prefixes/buckets/DBs.
  - Prod: multi‑region where applicable; keep ClickHouse and R2 co‑located.
- CI/CD
  - On push: lint, typecheck, unit tests, build artifacts.
  - On PR: integration tests, cross‑browser smoke, preview deployment.
  - On merge to main: deploy to staging; run E2E and load smoke; manual promote to prod; run smoke and 30‑min canary.

16) CSP and installation guidance
- Minimal CSP for customers
  - script-src: https://cdn.tapistry.app 'self' 'nonce-...'
  - connect-src: https://ingest.tapistry.app https://api.tapistry.app
  - frame-src: https://app.tapistry.app (for embedded viewer) or 'self'
- Strict nonce example documented with dynamic nonce injection.
- Bookmarklet overlay for sites with frame restrictions.

17) Detailed algorithms
17.1 Heatmap tiling and rendering
- On ingest: nx = x/viewport_w, ny = y/viewport_h; i=floor(nx*64), j=floor(ny*64).
- Keys: (project_id, normalized_path, device_class, viewport_bucket, ts_hour, i, j).
- Viewer: fetch tiles for selection; compute intensity = log(1 + count)/log(1 + max); draw Gaussian kernel per tile in Canvas; handle overlay scale/offset within iframe or snapshot canvas.
- Element mode: on click capture, record selector_hash; aggregate top elements per path; fetch element stats and annotate overlay with badges.

17.2 Selector generation heuristics (client)
- If element.id present and unique: use #id.
- Else, prefer data-testid/name/role attributes; then class names stripped of dynamic tokens; then nth‑child chain; cap depth to 5; cap selector length to 128 chars; compute hash64 over normalized selector.

17.3 SPA route detection
- Patch history.pushState/replaceState; listen popstate/hashchange; fallback to MutationObserver heuristic for frameworks that swap content without history changes (rare).
- Debounce 200 ms; send page_view with route metadata; include previous path for funnels.

17.4 Replay capture
- Snapshot: serialize DOM starting at documentElement; remove script nodes; inline small <style> and computed CSS if needed for fidelity; large CSS via manifest referencing URLs.
- Mutations: observe attributes, childList, characterData; coalesce bursts every 50–100 ms; mask text diffs where required.
- Inputs: on input/change/blur, capture masked value (**** or length); never keystrokes; do not capture Clipboard events.
- Throttling: per‑session byte cap; drop low‑value mutations under load; mark “truncated” in manifest if cap exceeded.

18) Rate limiting and quotas (defaults; per project configurable)
- Analytics events (/i)
  - Per project: 2,000 req/s.
  - Per IP: 200 req/s.
  - Per session: ≤60 events/s; ≤5,000 events per session.
- Replay (/r)
  - Per project: 500 chunks/s.
  - Per session: 1 chunk/s; ≤3 MB compressed per session; ≤15 min duration for MVP (soft cap).
- Overages: return 429 with retry‑after; client backoff; server logs audit.

19) Error handling and codes
- 2xx: 200 accepted; 206 partial accept with errors array.
- 4xx: 400 invalid payload; 401 invalid key; 403 origin not allowed; 409 duplicate chunk; 413 payload too large; 429 rate limited.
- 5xx: 500 transient; 503 backpressure; client retries with exponential backoff, capped.

20) Cost model (order‑of‑magnitude)
- ClickHouse Cloud: 25M events/month, 180‑day retention → 30–60 GB compressed; ~$150–$400/month depending on tier and query load.
- R2 storage: 60–180 GB/month replays; 120–360 GB steady state at 60‑day retention; ~$10–$50 storage + operations.
- Cloudflare Workers/Queues: typically <$50–$100 for this scale.
- Vercel dashboard: $20–$50 unless heavy server functions.
- Total MVP target: <$500/month at 5M pageviews/month; scale linearly with sampling controls.

21) Security checklist (MVP)
- SRI on SDK; subresource integrity verified in sample snippet.
- Origin allowlist enforcement at edge.
- Strict CORS for ingest (Permit only configured origins).
- TLS only; HSTS on app.tapistry.app.
- Replay player sandboxed; inert DOM render; no JS execution.
- Secrets in environment‑specific KMS; rotated quarterly.
- Audit logs for admin actions.
- Regular dependency scans; pinned lockfiles.

22) Acceptance criteria by phase
- Phase 1 (Heatmaps)
  - Install snippet; events visible in Overview within 2 minutes.
  - Heatmap for any path loads <2 s; shows last 7 days of clicks; device segmentation.
  - Scroll map available; accurate within ±5 percentage points.
  - SPA route tracking correct for Next.js/React Router sample apps.
  - SDK bundle ≤15 KB gz initial.
- Phase 2 (Replays)
  - Replays captured for ~30% sessions; masked inputs; first frame <2 s.
  - Player handles 1‑hour sessions with skip‑idle; controls work cross‑browser.
  - Replay storage capped per session; truncation handled gracefully.
- Phase 3 (Funnels)
  - UI to define 3+ step funnel (URL/selector/custom); results <2 s; breakdowns by device/country/UTM.
  - CSV export; historical data accessible.
- Phase 4 (Prod hardening)
  - Magic‑link auth; rate limits verified; monitoring/alerts on.
  - 1M events/hour sustained load test with p95 targets met.
  - Docs complete (install, CSP, consent, troubleshooting).

23) Implementation backlog (AI coder ready)
- SDK
  - Core: ids, config, page/router, click/tap, scroll milestones, batching, transport, DNT/consent, throttling, selector gen, URL sanitizer.
  - Replay: lazy loader, snapshot/mutations/inputs, chunking, byte caps, sampling, masking, exclusions.
  - Tests: unit + JSDOM; cross‑browser harness; performance microbench; error injection.
- Edge
  - /i and /r Workers; schema validation; enrichment; rate limits; CORS; origin allowlist; queues; DLQ; idempotency.
- Consumers
  - Batch insert to ClickHouse; retries; connection pooling; backpressure.
  - Replay chunk processor to R2; manifest writer; Postgres index.
- ClickHouse
  - Migrations: events, heatmap_tiles, scroll_depth; indices; materialized views; helper UDFs; projections for common queries.
- Dashboard (Next.js)
  - Auth; project creation; keys; settings.
  - Heatmap viewer (3 overlay modes); element mode; exports.
  - Replays list; player; filters; masked overlay.
  - Funnels builder; query API; results and breakdowns; export.
  - Overview charts (traffic, top pages/referrers/devices).
- Ops
  - CI/CD; environment configs; CF account setup; domains; SSL; monitoring; alerts; runbooks.
  - Cost dashboards; daily budget alerts.

24) Developer deliverables (docs to ship)
- Install guide (snippet, CSP examples, consent integration, SPA notes).
- SDK reference (APIs and config).
- Data schema reference (events fields, tile format, replay manifest).
- Query cookbook (top pages, top elements, funnel examples).
- Privacy and masking best practices.
- Troubleshooting (CSP, ad blockers, iframes, frame‑ancestors).
- Changelog and versioning policy.

25) Open issues to confirm before coding freeze
- Confirm pageviews vs sessions for the 5M/10M numbers to finalize quotas and default sampling.
- Provide initial domain list for origin allowlist and CSP snippets.
- Choose default query param allowlist for path normalization (suggest utm_, gclid, fbclid; optionally variant/lang).
- Decide whether to enable scroll attention estimation in Phase 1 (cheap), or defer to Phase 2.

Appendix A – Event JSON contracts (SDK → /i)
- Common fields per event
  - id (uuid), ts (ms), type, session_id, anonymous_id, user_id?, url, path, title?, referrer?, utm?, device{ua?, mobile?}, viewport{w,h}, x?, y?, selector_hash?, selector?, props{}
- Example click event

{
  "id":"4f7c1b2a-...-9f",
  "ts": 1723718400456,
  "type":"click",
  "session_id":"2b1d...f1",
  "anonymous_id":"91d3...aa",
  "url":"https://example.com/pricing?utm_source=twitter",
  "path":"/pricing",
  "title":"Pricing",
  "referrer":"https://twitter.com/...",
  "utm":{"source":"twitter","medium":"social","campaign":"launch"},
  "device":{"mobile":false},
  "viewport":{"w":1440,"h":900},
  "x":0.42,"y":0.77,
  "selector_hash": 133742042942,
  "selector":"#cta",
  "props":{"button":0}
}

Appendix B – Replay JSON contracts (SDK → /r)
- Chunk payload (JSONL allowed). Event types: snapshot, mutation, input, scroll, viewport, meta.
- Example event

{ "t":"mutation", "ts":12345, "ops":[{"op":"attr","id":42,"name":"class","value":"btn"}] }

- Manifest written by server (see 5.3).

Appendix C – Bookmarklet overlay (concept)
- One‑liner that injects heatmap overlay JS from app.tapistry.app into the current page to visualize heatmaps without iframe; respects mask/ignore selectors.

Appendix D – Path normalization and URL sanitizer (client pseudocode)
// allowlist: ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','variant','lang']
function normalizePath(u) {
  try {
    const url = new URL(u);
    let p = url.pathname.toLowerCase();
    if (p.length>1 && p.endsWith('/')) p = p.slice(0,-1);
    p = p.replace(/\/index(\.html?)?$/,'');
    return p || '/';
  } catch { return '/'; }
}
function sanitizeUrl(u, allowlist) {
  const url = new URL(u);
  const keep = new URLSearchParams();
  for (const [k,v] of url.searchParams) if (allowlist.includes(k)) keep.append(k,v);
  url.search = keep.toString();
  url.hash = '';
  return url.toString();
}

Appendix E – Client CSP quick‑start for customers
- script-src https://cdn.tapistry.app 'self' 'nonce-<server-generated>'
- connect-src https://ingest.tapistry.app https://api.tapistry.app
- frame-src https://app.tapistry.app
- img-src 'self' data: (for replay thumbnails if used)
- If using nonces: document recommended server integration snippets in docs.

Appendix F – Rate limiter sketch (edge)
- Token bucket per key/IP/session in Durable Object/KV with sliding window; reset aggressively for /r; distinct buckets per endpoint.

Appendix G – ClickHouse query cookbook
- Top pages last 7 days

SELECT path, countIf(type='page_view') AS views, uniqExact(session_id) AS sessions
FROM events
WHERE project_id = {p} AND event_date >= today() - 7
GROUP BY path ORDER BY views DESC LIMIT 50;

- Heatmap tile read

SELECT tile_x AS i, tile_y AS j, sumMerge(clicks) AS count
FROM heatmap_tiles
WHERE project_id={p} AND path={path} AND device_class={dev} AND viewport_bucket={vw}
  AND ts_hour BETWEEN {from} AND {to}
GROUP BY i,j;

- Funnel loose order with breakdown by device_class (sketch): see section 8.

Appendix H – SDK build and size controls
- Build tool: esbuild (fast) with aggressive minification; strip dev asserts; inline tiny helpers; shared constants in separate chunk; conditional import of replay recorder; no UA parser in client (UA string only).

Appendix I – Replay player safety
- Render to an inert shadow DOM; disable script tags; replace <img> sources with blank or proxy; forbid external network loads; apply CSS reset; mapping of masked nodes to blur overlay.

Appendix J – Troubleshooting guide outline
- No data: verify script loads (SRI), CSP connect‑src, origin allowlist, ad‑blocker interference (provide alternate domain), console errors, request status from ingest.
- Heatmap empty: ensure enough data/time range, path normalization mismatch, viewport bucket mismatch.
- Replay black screen: cross‑origin iframes, dynamic canvas; note limitations; confirm manifest segments exist.
- Funnels mismatch: step definitions too strict; routes normalized incorrectly; confirm order/window settings.
