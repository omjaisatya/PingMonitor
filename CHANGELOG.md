# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com).

## [0.0.4] - 2026-06-09

### Server (Backend)

#### Added

- **User Avatar Storage**: Integrates Multer/Cloudinary to upload profile photos, storing secure URL references and public IDs on User schemas.
- **Heartbeat Checks**: UUID v4 token public check-in endpoints (`/api/public/ping/:token`) enwrapped with rate limit configurations.
- **Playwright Synthetic Monitoring**: Launches headless Chromium browser, records web performance metrics (load time, DOM ready, DNS, TCP, TTFB), unhandled exceptions, failed network request logs, and saves failed screenshots and recording videos.
- **Advanced API Checks & Assertions**: Axios request engine supporting GET, POST, PUT, DELETE, and GraphQL payloads. Parses custom assertions lists matching property paths safely without eval.
- **Secure Credentials Storage**: AES-256-GCM symmetric encryption for variables and custom header parameters. Encryption keys are derived dynamically using JWT_SECRET.
- **Daily Cleanup Cron Task**: Automated daily pruner deleting enqueued logs and physical screenshot/video media files older than 7 days.

#### Fixed

- **Geographic Latency Quorum**: Fixed Asian-only check loop by storing regional ping results for all default regions, simulating geographical latency offsets in single-node mode.

### Client (Frontend)

#### Added

- **Avatar Fallback System**: Displays user uploaded image, falling back sequentially to MD5 email-hashed Gravatar and initials-generated DiceBear SVG. Includes drag-and-drop settings panel in User Profile.
- **Heartbeat & Synthetics Dashboards**: Premium lists grid, details metrics summaries, action controls (pause/resume, run now), collapsable script setups, and logs history pagination.
- **Playwright Replay modal**: Embedded HTML5 video playback, zoomable failure screenshots, console logger logs, and failed network queries listings.
- **API Monitors & Collections**: Dashboard mapping API collections with variables tables, HTTP method badges, and assertion list creators.
- **Git-like Response Diff Viewer**: Built client-side LCS diff visualizer highlighting line-by-line additions and deletions of response bodies between runs.

## [0.0.3] - 2026-06-06

### Server (Backend)

#### Added

- Implemented real-time WebSocket event broadcasting for monitor checks completion (`monitor:updated`, `check:completed`), alert logging (`alert:logged`), and email delivery tracking (`email:logged`).
- Merged the regional worker process directly into the main Express server process, automatically starting it in `server.js` if region environment variables are detected.

#### Changed

- Set default incident visibility (`isPublic`) and automation rule status page publication (`publishToStatusPage`) to `false` (private) by default, protecting system status visibility until explicitly toggled.
- Generalized the HTTP WebSocket upgrade handler to accept any path starting with `/ws` (e.g. `/ws`, `/ws/incidents`).

#### Fixed

- Fixed the BullMQ crash `Error: Queue name cannot contain :` by changing regional queue naming separators from `:` to `-`.

- Fixed Mail formated timezone when mailAlert sent from server.

### Client (Frontend)

#### Added

- Built a custom React hook `useWebSocket` featuring automatic reconnection, JSON message parsing, and event subscription management.
- Integrated WebSocket notifications on the **Dashboard** page, enabling instant real-time updates when monitors are mutated or checks complete.
- Integrated WebSocket notifications on the **Analytics** page to dynamically refresh dropdown monitor options, overview metrics, latency trends charts, alert histories, and email logs.

#### Changed

- Defaulted the visibility checkboxes for "Publish on status page" to unchecked for new manual incidents and automation rules.

#### Fixed

- Redesigned the **Incidents** page layout:
  - Made the lengthy "New Incident" creation form collapsible.
  - Constrained the monitor service selector checklist height with smooth vertical scrolling.
  - Added smart viewport scrolling to automatically focus on the incident details section when clicking a card in stacked mobile viewports.

- Fixed Toastify with better error handling

## [0.0.1] - 2026-03-01

### Added

- **Core Infrastructure & Authentication**:
  - Secure JWT-based token authentication with bcrypt password hashing, token rotation, and email verification workflows.
  - Multi-tiered user settings including profile configuration, timezone adjustments, and theme preferences (light/dark mode).
- **Service Monitoring Engine**:
  - Concurrent HTTP/HTTPS uptime checks with configurable ping intervals, custom timeouts, and latency threshold triggers.
  - Detailed check log records storing HTTP response codes, latency metrics, and connection errors.
  - Automatic database purging utilizing MongoDB TTL indexes to prune log history older than 7 days, maintaining a lightweight footprint.
- **Smart Notification System**:
  - Automated transactional email alerts dispatched via Resend on state transitions (e.g., `UP` ➔ `DOWN` and `DOWN` ➔ `UP`).
  - Alert settings for escalation emails, alert cooldown periods, and quiet hour boundaries to prevent alert fatigue.
- **Distributed Multi-Region Architecture**:
  - Redis and BullMQ integrated checks distribution and results compilation.
  - Regional worker service for performing geographically isolated checks.
  - Aggregation engine compiling checks into a quorum status using majority threshold logic.
- **Incidents & Automation**:
  - Full-featured Incidents manager supporting automated rule-based incident creation/resolution, custom timeline records, root cause analysis (RCA) fields, and team comments.
  - Public status page showing general system status, historical uptime metrics, and public incident updates.
- **Interactive UI**:
  - Beautiful, dark-themed dashboard showing monitor cards with status heatmaps.
  - Interactive SVG analytics charts displaying average response times, status code distributions, and peak latency hours of the day.
