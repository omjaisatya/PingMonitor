# PingMonitor

[![GitHub last commit](https://img.shields.io/github/last-commit/omjaisatya/PingMonitor)](https://github.com/omjaisatya/PingMonitor)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/w/omjaisatya/PingMonitor)](https://github.com/omjaisatya/PingMonitor)
[![GitHub Created At](https://img.shields.io/github/created-at/omjaisatya/PingMonitor)](https://github.com/omjaisatya/PingMonitor)
[![GitHub repo size](https://img.shields.io/github/repo-size/omjaisatya/PingMonitor)](https://github.com/omjaisatya/PingMonitor)

> A modern, lightweight, and self-hosted uptime monitoring solution. Get instant email alerts the moment your services go offline.

PingMonitor is an automated uptime monitoring tool that performs health checks on your target URLs and APIs. It pings configured endpoints, logs response metrics, and sends immediate, non-spamming email notifications when status changes occur.

## Key Features

- **Secure Authentication**: JWT-based session security with bcrypt password hashing and token rotation.
- **Real-Time Heartbeats**: Concurrent ping checks with configurable timeout limits.
- **Insightful Logging**: Captures HTTP response status codes, latencies, and down-time histories.
- **Smart Alerting**: Dispatch email alerts via Resend on state transitions (e.g., `UP` ➔ `DOWN`) without duplicates.
- **Auto Data Purging**: Automated TTL indices to prune logs older than 7 days, maintaining a lightweight database.
- **Docker Native**: Run the entire stack locally with a single command.

## Tech Stack

| Layer                | Technologies                                     |
| :------------------- | :----------------------------------------------- |
| **Frontend**         | React, Vite, Axios, React Router, Vanilla CSS    |
| **Backend**          | Node.js, Express, MongoDB (Mongoose)             |
| **Caching & Queues** | Redis, BullMQ (optional for distributed regions) |
| **Notification**     | Resend / SMTP                                    |

## Getting Started

You can run PingMonitor either through **Docker Compose** (recommended) or **locally with Node.js**.

### Method A: Running with Docker (Recommended)

Ensure you have [Docker](https://www.docker.com/) installed and running on your system.

1. **Clone the repository:**

   ```bash
   git clone https://github.com/omjaisatya/PingMonitor.git
   cd PingMonitor
   ```

2. **Configure environment variables:**
   Create a `.env` file in the `server` directory and define your Resend API credentials (other system variables are pre-configured in `docker-compose.yml`):

   ```env
   RESEND_API_KEY=your_resend_api_key_here
   SENDER_EMAIL=your_verified_sender_email_here
   ```

3. **Start the containers:**

   ```bash
   docker compose up --build -d
   ```

4. **Access the application:**
   - **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
   - **Backend API**: [http://localhost:3006](http://localhost:3006)

### Method B: Local Node.js Development

#### Prerequisites

- Node.js v18+
- MongoDB instance (local or Atlas)

#### 1. Server Configuration

1. Navigate to the server folder and install dependencies:

   ```bash
   cd server
   npm install
   ```

2. Create a `.env` file in the `server` directory using `server/.env.example` as a template.
3. Start the server in development mode:

   ```bash
   npm run dev
   ```

#### 2. Client Configuration

1. Open a new terminal window, navigate to the client folder, and install dependencies:

   ```bash
   cd client
   npm install
   ```

2. Create a `.env.development` file in the `client` directory:

   ```env
   VITE_SERVER_URL=http://localhost:3006/api
   VITE_APP_TITLE=Ping Monitor (Local Dev)
   ```

3. Start the client development server:

   ```bash
   npm run dev
   ```

4. Open your browser to [http://localhost:5173](http://localhost:5173).

## Environment Variable Schema

### Backend (`server/.env`)

| Variable             | Example                                 | Description                                      |
| :------------------- | :-------------------------------------- | :----------------------------------------------- |
| `PORT`               | `3006`                                  | Port the Express server listens on               |
| `MONGO_URL`          | `mongodb://localhost:27017/pingMonitor` | MongoDB connection string                        |
| `JWT_SECRET`         | `your-jwt-signing-secret`               | High-entropy key used for signing JWTs           |
| `JWT_REFRESH_SECRET` | `your-jwt-refresh-secret`               | High-entropy key used for signing refresh tokens |
| `RESEND_API_KEY`     | `re_xxx`                                | [Resend](https://resend.com) API credential      |
| `SENDER_EMAIL`       | `alerts@domain.com`                     | Email address registered on Resend               |
| `FRONTEND_URL`       | `http://localhost:5173`                 | Origin URL of client application (for CORS)      |

### Frontend (`client/.env.development`)

| Variable          | Example                     | Description                           |
| :---------------- | :-------------------------- | :------------------------------------ |
| `VITE_SERVER_URL` | `http://localhost:3006/api` | Base endpoint path for the server API |
| `VITE_APP_TITLE`  | `PingMonitor`               | Browser tab document title            |

## Additional Documentation

Detailed architectures and guides are stored in the `/docs` directory:

- [API Reference Guide](./docs/apiReference.md) — Exhaustive REST endpoint definitions and payloads.
- [SMTP Setup Guide](./docs/nodemailer-setup.md) — Configuring custom mail delivery servers using Nodemailer.
- [Multi-Region Scaling](./docs/multi-region-monitoring.md) — Deploying regional worker pinger instances.

## Uptime Check Workflow

The system relies on a scheduled cron runner executing health checks:

```txt
                  Every 60 Seconds
                         │
                         ▼
          Fetch Active Monitors from DB
                         │
                         ▼
        Concurrent Ping Checks (10s Timeout)
                         │
        ┌────────────────┴────────────────┐
   HTTP 2xx/3xx                     Error / Timeout / 4xx+
        │                                 │
        ▼                                 ▼
   State: UP                         State: DOWN
        │                                 │
        │                           Status Change?
        │                         ┌───────┴───────┐
        │                        YES              NO
        │                         │               │
        │                         ▼               │
        │                  Send Email Alert       │
        └────────────────┬────────────────┘       │
                         ▼                        ▼
                Save Ping Logs to DB            Ignore
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
