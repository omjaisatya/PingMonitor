# Pingmonitor - Product Roadmap

## In Planning

### Real-Time Alert System - WebSocket

- Description: Show instant data and logs without reload
- User Value: Immediate feedback for critical monitoring events
- Tasks:
  - [x] Set up WebSocket connection
  - [x] Handle reconnection logic
  - [x] Test under poor network conditions

### Custom Toast Notifications

- Description: Replace react-toastify with custom toast component for better control and consistency
- Tasks:
  - [x] Design custom toast component (success, error, warning, info types)
  - [x] Implement toast context/provider for global state management
  - [x] Replace all react-toastify instances with custom toast
  - [x] Add animations and styling
  - [x] Remove react-toastify dependency

### Email Service Migration

- Description: Find and implement a reliable email service to replace nodemailer (currently using emailjs temporarily)
- Tasks:
  - [x] Research email service alternatives (SendGrid, Mailgun, AWS SES, Resend) - (24/04/2026)
  - [x] Set up chosen email service with API keys - (24/04/2026)
  - [x] Implement email templates (verification, password reset, alerts) - (29/05/2026)
  - [x] Replace emailjs with new service - (24/04/2026)
  - [ ] Test email delivery in production
  - [ ] Add email retry logic for failed sends

### Demo Branch & Deployment

- Description: Create a separate demo environment so users can test the application before using production
- Tasks:
  - [ ] Create `demo` branch from main
  - [ ] Add demo-specific configuration
  - [ ] Deploy demo branch to separate URL
  - [ ] Populate demo with sample monitors and data
  - [ ] Add "Demo Mode" indicator in UI
  - [ ] Set up auto-reset for demo data daily/weekly
  - [ ] Document demo limitations and features

### Monitor Analytics Dashboard

- Description: Provide detailed analytics and insights about monitor performance, uptime/downtime stats, and alert history
- Estimated effort: High
- Tasks:
  - [x] Create analytics database schema (monitor_stats, alert_logs, email_logs)
  - [x] Implement backend API endpoints to fetch analytics data
  - [x] Build analytics dashboard UI with charts and statistics
  - [x] Display monitor uptime percentage (daily, weekly, monthly, yearly)
  - [x] Display monitor downtime duration and frequency
  - [x] Show response time trends using line charts
  - [x] Display status code distribution (200, 404, 500, etc.)
  - [x] Create alert history log (timestamp, monitor, status, message)
  - [x] Add email delivery tracking (sent, failed, bounced)
  - [x] Implement date range filters for analytics (last 7 days, 30 days, custom)
  - [x] Add export functionality (PDF, CSV reports)
  - [x] Create real-time alerts count widget
  - [x] Display failed email attempts with reasons and retry status
  - [x] Add performance metrics (average response time, peak hours)
  - [x] Implement data aggregation for efficient querying

### Alert System & Notifications

- Description: Implement comprehensive alert system with multiple notification channels and delivery tracking
- Estimated effort: High
- Tasks:
  - [x] Create alert configuration (email, SMS, webhook, in-app)
  - [x] Implement email alert notifications
  - [ ] Add SMS alert support (Twilio or similar)
  - [x] Implement webhook notifications for custom integrations
  - [x] Create in-app notification system
  - [x] Add alert escalation rules (retry logic, multiple recipients)
  - [x] Implement do-not-disturb scheduling (quiet hours)
  - [x] Create alert templates for different scenarios (down, recovered, slow)
  - [x] Add alert delivery status tracking (pending, sent, failed, bounced)
  - [x] Implement alert deduplication (prevent duplicate alerts in short timeframe)
  - [x] Create alert history and audit logs
  - [x] Add user preferences for alert frequency and channels

## High Priority

### Auth

- Description: Improve User Auth flow to increase security and user trust
- User Value:
  - Users feel secure knowing their data is protected
  - Reduces risks of account takeover
- Acceptance Criteria:
  - All auth flows use HTTPS
  - Passwords are hashed with salt
  - Account deletion requires confirmation
  - Password reset uses time-limited tokes
- Tasks:
  - [x] Implement User Account Verifications when user isn't verified. - (29/05/2026)
  - [x] Implement Add an option to delete account if user wants. - (16/05/2026)
  - [x] Implement Recovery Password - (29/05/2026)
  - [x] Implement Update User Profile - (16/05/2026)
  - [x] Implement Change Password - (16/05/2026)

### Validators

- Description: Improve and Secure Backend whenever Client Request data
- User Value: Prevents invalid data from causing crashes or breaches
- Acceptance Criteria:
  - All inputs are validated before processing
  - Invalid data returns clear error messages
- Tasks:
  - [x] Implement Auth Validator - (23/04/2026)
  - [x] Implement Email Validator - (23/04/2026)
  - [x] Implement Monitors Validator - (28/04/2026)

### Advanced Express Security Hardening

- Description: Implement multiple security layers to protect backend from common attacks
- Estimated effort: Medium
- Tasks:
  - [x] Install and configure `helmet` for secure HTTP headers - (23/04/2026)
  - [x] Install and configure `express-rate-limit` for rate limiting on all routes
  - [x] Install and configure `cors` with whitelist of allowed origins
  - [ ] Implement `mongo sanitize` to prevent NoSQL injection attacks
  - [ ] Install and configure `express-validator` for input validation and sanitization
  - [x] Add CSRF protection using `csurf` middleware - (16/05/2026)
  - [ ] Implement request body size limits to prevent payload attacks
  - [ ] Add `hpp` (HTTP Parameter Pollution) protection middleware
  - [ ] Enable HTTPS only in production (redirect HTTP to HTTPS)
  - [ ] Implement security headers: X-Content-Type-Options, X-XSS-Protection, Strict-Transport-Security
  - [ ] Add request timeout to prevent hanging connections
  - [ ] Implement API key validation for sensitive endpoints
  - [ ] Add IP whitelisting/blacklisting for critical operations
  - [ ] Test all security measures with OWASP security scanner

### Monitoring and Logging with Winston and Morgan

- Description: Implement comprehensive backend logging to track API requests, errors, and application events
- Tasks:
  - [ ] Set up Winston logger for backend
  - [ ] Configure Winston transports (console, file, error file)
  - [ ] Integrate Morgan middleware for HTTP request logging
  - [ ] Log all API endpoints (method, URL, status code, response time)
  - [ ] Log all errors with stack traces and context
  - [ ] Set up log rotation to prevent disk space issues
  - [ ] Create log files for different severity levels (info, warning, error)
  - [ ] Add structured logging (JSON format for easier parsing)

### Frontend Error Monitoring (Sentry)

- Description: Implement error tracking on frontend to catch and monitor user-facing issues in production
- Tasks:
  - [ ] Set up Sentry account and project
  - [ ] Install Sentry SDK in React frontend
  - [ ] Configure Sentry to capture JavaScript errors
  - [ ] Capture unhandled promise rejections
  - [ ] Add user context to error reports (user ID, email)
  - [ ] Set up Sentry alerts for critical errors
  - [ ] Create Sentry dashboard to monitor error trends
  - [ ] Add breadcrumbs to track user actions before error

## Medium Priority

### Status Page

- Description: Let users create a public page showing their monitor uptime
- Estimated effort: High
- Tasks:
  - [ ] Build endpoint to serve public status page
  - [ ] Implement visibility toggle
  - [ ] Design minimal UI for public page

### Dockerize Project

- Description: Containerize backend, frontend, and database
- Estimated effort: Medium
- Tasks:
  - [x] Create Dockerfile for Node backend
  - [x] Create Dockerfile for React frontend
  - [x] Create docker-compose.yml
  - [x] Test Docker build locally
  - [ ] Document Docker setup

## Low Priority

### Convert JS to TS

- Description: Migrate frontend codebase to TypeScript for better type safety
- Estimated Effort: High
- Why It Matters:
  - Reduces bugs caused by type mismatches
  - Improves developer onboarding
  - Enables better tooling (autocompletion, refactoring)
- Tasks:
  - [ ] Set up TypeScript in project
  - [ ] Convert core modules (auth, monitors) first
  - [ ] Migrate UI components gradually
  - [ ] Add linting rules for TS
- Acceptance Criteria:
  - All core modules pass TypeScript compilation
  - No type errors in production build
  - Linter enforces TS rules

### Add Husky for Git Hooks

- Description: Add Husky to enforce code quality and prevent bad commits
- Tasks:
  - [ ] Install Husky
  - [ ] Configure pre-commit hook to run linting and tests
  - [ ] Configure pre-push hook to run E2E tests (if applicable)
  - [ ] Add `lint-staged` to run ESLint and Prettier on staged files
  - [ ] Add `commitlint` for conventional commits
  - [ ] Document Husky setup in README

## Testing

### Backend Testing

- Description: Ensure all API endpoints, validators, and business logic run without errors.
- Tasks:
  - [ ] Write and run unit tests for Auth endpoints (login, register, reset, delete)
  - [ ] Write and run tests for Validators to ensure invalid inputs are rejected correctly
  - [ ] Write and run integration tests for WebSocket event triggers
  - [ ] Verify database interactions (creation, update, deletion) work as expected
  - [ ] Confirm 100% of critical paths return expected status codes (200, 400, 401, 500)
  - [ ] Write tests for analytics data aggregation and calculations
  - [ ] Write tests for alert system logic and delivery tracking

### Frontend Testing

- Description: Ensure UI components render correctly and handle user interactions without errors.
- Tasks:
  - [ ] Write and run tests for Auth forms (valid/invalid inputs, error messages)
  - [ ] Write and run tests for Validator feedback (displaying errors to users)
  - [ ] Write and run tests for Status Page rendering and data display
  - [ ] Write and run tests for WebSocket alert updates in the UI
  - [ ] Verify no console errors occur during standard user flows
  - [ ] Write tests for analytics dashboard charts and data display
  - [ ] Write tests for alert notification components

### Final

- Description: Confirm the entire application is stable before release.
- Tasks:
  - [ ] Run full test suite (`npm test` in both backend and frontend)
  - [ ] Manually verify critical user flows (Login, Create Monitor, Password Reset) locally
  - [ ] Ensure all tests pass with 0 failures
  - [ ] Check that error handling works gracefully for edge cases
  - [ ] Verify analytics calculations are accurate
  - [ ] Test alert delivery across all channels (email, SMS, webhook, in-app)

## Completed ✓

- [x] Implemented Pause/Resume Monitor (14/04/2026)
- [x] Express Validation (auth,monitor)
