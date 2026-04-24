# PingMonitor

> Full-stack URL & API uptime monitoring with real-time alerting and historical logging.

![GitHub last commit](https://img.shields.io/github/last-commit/omjaisatya/PingMonitor)
![GitHub commit activity](https://img.shields.io/github/commit-activity/w/omjaisatya/PingMonitor)
![GitHub Created At](https://img.shields.io/github/created-at/omjaisatya/PingMonitor)
![GitHub repo size](https://img.shields.io/github/repo-size/omjaisatya/PingMonitor)

## Overview

PingMonitor is a full-stack uptime monitoring system that continuously pings your URLs and APIs, logs response times and status codes, and sends targeted email alerts the moment a service goes down without spamming you when it's already down.

The backend runs an automated cron job every 60 seconds against all registered monitors. The React frontend provides a clean dashboard to manage monitors and visualize historical uptime data.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Cron Workflow](#cron-workflow)
- [Data Retention](#data-retention)
- [Contributing](#contributing)
- [Contact](#contact)

## Tech Stack

**Frontend** (`/client`)

| Layer | Technology |
| --- | --- |
| Framework | React.js + Vite |
| HTTP Client | Axios |
| Routing | React Router DOM |

**Backend** (`/server`)

| Layer | Technology |
| --- | --- |
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB (via Mongoose) |
| Authentication | JWT + bcryptjs |
| Scheduler | node-cron |
| Email | Nodemailer / EmailJS |

> Additional technologies and frameworks will be integrated in the future. Please refer to the actual repository for the latest stack.

## Features

- **JWT Authentication** : Secure signup, login, and protected routes using JSON Web Tokens.
- **Monitor Dashboard** : Intuitive React UI for creating, updating, and deleting URL monitors.
- **Concurrent Pinging** : Background cron job pings all active monitors concurrently every 60 seconds (10s timeout).
- **Detailed Logging** : Each ping records the HTTP status code, response time (ms), and exact timestamp.
- **Smart Email Alerts** : Alerts fire only on `UP → DOWN` status transitions, preventing notification spam.
- **Auto Cleanup** : All associated ping logs are deleted automatically when a monitor is removed.
- **TTL-Based Log Retention** : Ping logs are automatically purged after 7 days via a MongoDB TTL index.

## Project Structure

```txt
PingMonitor/
├── client/
│   ├── public/
│   ├── src/
│   ├── index.html
│   ├── netlify.toml
│   ├── vite.config.js
│   └── package.json
├── server/
│   ├── src/
│   ├── server.js
│   └── package.json
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Node.js v18+
- A running MongoDB instance (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- An [EmailJS](https://www.emailjs.com/) account

### 1. Clone the Repository

```bash
git clone https://github.com/omjaisatya/PingMonitor.git
cd PingMonitor
```

### 2. Backend Setup

```bash
cd server
npm install
```

Create a `.env` file in `/server` (see [Environment Variables](#environment-variables)), then start the development server:

```bash
npm run dev
```

The API will be available at `http://localhost:<PORT>`.

### 3. Frontend Setup

Open a **new terminal**, then:

```bash
cd client
npm install
npm run dev
```

The client will be available at `http://localhost:5173` by default.

## Environment Variables

Copy `.env.example` to `.env` in the relevant directory and fill in the values below.

### Backend (`/server/.env`)

| Variable | Description |
| --- | --- |
| `PORT` | Port for the Express server |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for signing JWTs |
| `EMAILJS_SERVICE_ID` | EmailJS service ID |
| `EMAILJS_TEMPLATE_ID` | EmailJS template ID |
| `EMAILJS_PUBLIC_KEY` | EmailJS public key |
| `EMAILJS_PRIVATE_KEY` | EmailJS private key |
| `NODE_ENV` | development |
| `FRONTEND_URL` | <http://localhost:5173> |

> **Note on email delivery:** This project currently uses [EmailJS](https://www.emailjs.com/) instead of Nodemailer due to compatibility issues with the current hosting environment. Nodemailer functions correctly in local development, and a more permanent SMTP-based solution is being investigated.

### Frontend (`/client/.env`)

| Variable | Description |
| --- | --- |
| `VITE_SERVER_URL` | Full URL of your deployed backend (e.g. `https://api.yourdomain.com/`) |
| `VITE_APP_TITLE` | Application title displayed in the UI |

> For free hosting, the backend deploys cleanly on [Render](https://render.com) and the frontend on [Netlify](https://netlify.com).

## API Reference

All protected routes require an `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | ✗ | Register a new user account |
| `POST` | `/api/auth/login` | ✗ | Authenticate and receive a JWT |

### Monitors

| Method | Endpoint | Auth | Description |
| -------- | ---------- | -------- | ----------- |
| `POST` | `/api/monitors` | ✓ | Create a new monitor |
| `GET` | `/api/monitors` | ✓ | List all monitors for the authenticated user |
| `GET` | `/api/monitors/:id` | ✓ | Get a single monitor by ID |
| `PUT` | `/api/monitors/:id` | ✓ | Update monitor configuration |
| `PATCH` | `/api/monitors/:id/toggle` | ✓ | Update monitor toggle |
| `DELETE` | `/api/monitors/:id` | ✓ | Delete a monitor and all associated logs |

> For full details API Endpoint example , [see API Reference](./docs/apiReference.md)

## Cron Workflow

The following diagram describes the backend ping cycle, which runs every 60 seconds:

```txt
Every 60 seconds
      │
      ▼
Fetch all active monitors from DB
      │
      ▼
Ping each URL concurrently (10s timeout)
      │
      ├── 2xx / 3xx  →  status: "up"
      └── 4xx / 5xx / timeout / error  →  status: "down"
                              │
                              ▼
                  Was previous status NOT "down"?
                        │               │
                       Yes              No
                        │               │
                  Send email alert   Skip (already notified)
      │
      ▼
Save log entry + update monitor status
```

## Data Retention

To maintain performance and stay within MongoDB Atlas Free Tier storage limits (512 MB), ping logs use a **TTL (Time-To-Live) index**:

- **Retention period:** 7 days from creation
- **Scope:** Ping log entries only monitor configurations and user accounts are stored in separate collections and are **not** affected by this policy.
- **Rationale:** 7 days of historical data is sufficient for uptime trend analysis while keeping storage consumption minimal.

## Contributing

Contributions, bug reports, and feature requests are welcome. Please open an issue before submitting a pull request so the proposed change can be discussed first.

## Author

Built and maintained by [@omjaisatya](https://github.com/omjaisatya).

## Contact

For questions, feedback, or support, reach out at [ping-monitor@outlook.com](mailto:ping-monitor@outlook.com).
