# PingMonitor

> Stop guessing if your services are down. Get instant alerts when they go offline.

![GitHub last commit](https://img.shields.io/github/last-commit/omjaisatya/PingMonitor)
![GitHub commit activity](https://img.shields.io/github/commit-activity/w/omjaisatya/PingMonitor)
![GitHub Created At](https://img.shields.io/github/created-at/omjaisatya/PingMonitor)
![GitHub repo size](https://img.shields.io/github/repo-size/omjaisatya/PingMonitor)

## What Is This?

PingMonitor is a straightforward uptime monitoring tool that watches your URLs and APIs around the clock. Every 60 seconds, it pings each of your monitored services, logs response times and status codes, and emails you the *moment* something goes wrong without spamming you with duplicate alerts.

Think of it as a lightweight alternative to paid uptime monitoring services, completely open source and ready to run on free tiers (MongoDB Atlas, Resend, Render, Netlify).

## Getting Started in 5 Minutes

Clone the repo, install dependencies, and run both the backend and frontend locally:

```bash
git clone https://github.com/omjaisatya/PingMonitor.git
cd PingMonitor

# Terminal 1: Start the backend
cd server
npm install
npm run dev

# Terminal 2: Start the frontend
cd ../client
npm install
npm run dev

# Open http://localhost:5173 in your browser
```

That's it. You're ready to create your first monitor.

## Table of Contents

- [How It Works](#how-it-works)
- [Features at a Glance](#features-at-a-glance)
- [Tech Stack](#tech-stack)
- [Full Setup Guide](#full-setup-guide)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Cron Workflow](#cron-workflow)
- [Data & Storage](#data--storage)
- [Contributing](#contributing)

## How It Works

**Backend**: A scheduled cron job wakes up every 60 seconds, checks all your active monitors in parallel, records the results, and fires off email alerts if anything changed status from up → down.

**Frontend**: A clean React dashboard lets you manage monitors, view uptime, and toggle monitoring on/off without ever touching a terminal.

## Features at a Glance

**Secure Authentication**: JWT-based login with bcrypt password hashing  
**Real-Time Monitoring** : Concurrent pings every 60 seconds with 10-second timeouts  
**Detailed Logging** : HTTP status codes, response times (ms), exact timestamps  
**Smart Alerts** : Email notifications only on status changes (no spam)  
**Auto Cleanup** : Delete a monitor, and all its logs disappear with it  
**Auto Data Purge** : Logs older than 7 days are automatically removed  
**Free & Open Source** : Run entirely on free tiers; no credit card needed

## Tech Stack

| Component | Technology |
|----------|----------|
| **Frontend** | React.js + Vite + Axios + React Router |
| **Backend** | Node.js + Express.js + MongoDB (Mongoose) |
| **Authentication** | JWT + bcryptjs |
| **Scheduler** | node-cron |
| **Email** | Resend |

All services used are **free tier** with no credit card required (except MongoDB Atlas, which is genuinely free up to 512 MB).

> Additional technologies and frameworks will be integrated in the future. Please refer to the actual repository for the latest stack.

## Full Setup Guide

### Prerequisites

- **Node.js v18+** - [Install here](https://nodejs.org/)
- **MongoDB** - Either local or free cloud via [MongoDB Atlas](https://www.mongodb.com/atlas)
- **Resend Account** - For email alerts via [Resend](https://www.resend.com/)

### 1. Clone & Navigate

```bash
git clone https://github.com/omjaisatya/PingMonitor.git
cd PingMonitor
```

### 2. Set Up the Backend

```bash
cd server
npm install
```

Create a `.env` file in the `/server` directory (see the [Environment Variables](#environment-variables) section below), then start the development server:

```bash
npm run dev
```

You should see:

```txt
Server running on http://localhost:<your-PORT>
Connected to MongoDB
```

### 3. Set Up the Frontend

Open a **new terminal**, then:

```bash
cd client
npm install
npm run dev
```

Navigate to `http://localhost:5173` in your browser. You should see the PingMonitor login page.

### 4. Create an Account & Start Monitoring

- Sign up with any email and password
- Click "Create Monitor" and add your first URL (e.g., `https://google.com`)
- Watch the dashboard update as monitors are pinged
- You'll receive email alerts when services go down

## Environment Variables

Copy `.env.example` to `.env` in each directory and fill in your values. All services are free tier.

### Backend (`.env`)

| Variable | Example | Notes |
|----------|---------|-------|
| `PORT` | `5000` | Express server port |
| `MONGO_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/pingmonitor` | MongoDB Atlas connection string |
| `JWT_SECRET` | `your-random-secret-key-here` | Keep this private; used to sign JWTs |
| `RESEND_API_KEY` | `re_xxxxxxxxxxxxxx` | Get from [Resend Dashboard](https://resend.com) |
| `SENDER_EMAIL` | `noreply@yourdomain.com` | Must be verified in Resend |
| `NODE_ENV` | `development` | Set to `production` when deployed |
| `FRONTEND_URL` | `http://localhost:5173` | Where your React app runs |

**Email Setup**: By default, PingMonitor uses **Resend**. If you prefer SMTP (e.g., Gmail, other mail provider), see [`./docs/nodemailer-setup.md`](./docs/nodemailer-setup.md).

### Frontend (`.env`)

| Variable | Example | Notes |
|----------|---------|-------|
| `VITE_SERVER_URL` | `http://localhost:5000` or `https://api.yourdomain.com` | Full URL of your backend |
| `VITE_APP_TITLE` | `PingMonitor` | Title shown in browser tab |

## API Endpoints

All endpoints except `/auth/signup` and `/auth/login` require:

```txt
Authorization: Bearer <your-jwt-token>
```

### Authentication (No Auth Required)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/auth/signup` | Create a new account |
| `POST` | `/api/auth/login` | Log in and receive JWT |

### Monitor Management (Auth Required)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/monitors` | Create a new monitor |
| `GET` | `/api/monitors` | List all your monitors |
| `GET` | `/api/monitors/:id` | Get details of one monitor |
| `PUT` | `/api/monitors/:id` | Update monitor settings |
| `PATCH` | `/api/monitors/:id/toggle` | Turn monitoring on/off |
| `DELETE` | `/api/monitors/:id` | Delete monitor + all logs |

For request/response examples, see [`./docs/apiReference.md`](./docs/apiReference.md).

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

This approach ensures you get notified immediately when something breaks, but not spammed if it stays broken.

## Data & Storage

### How Long Are Logs Kept?

- **Retention period**: 7 days
- **Scope**: Only ping logs are purged; monitor configurations and user accounts persist forever
- **Why 7 days?**: It's enough time to spot trends and patterns in uptime without consuming too much storage (important for the free MongoDB Atlas tier)

### Automatic Cleanup

- Delete a monitor → All its associated logs are deleted immediately
- Logs older than 7 days → Automatically removed every day via MongoDB TTL index

This keeps your database lean and your dashboard snappy.

## Deploying to Production

### Backend (Render)

1. Push your code to GitHub
2. Create a new Web Service on [Render.com](https://render.com)
3. Connect your GitHub repo
4. Add the environment variables from `.env`
5. Deploy (Render auto-rebuilds on push)

### Frontend (Netlify)

1. Build the React app: `npm run build` in `/client`
2. Deploy the `dist/` folder to [Netlify](https://netlify.com) (drag & drop or connect GitHub)
3. Set `VITE_SERVER_URL` to your Render backend URL in Netlify's environment variables

## Contributing

Contributions, bug reports, and feature requests are welcome. Please open an issue before submitting a pull request so the proposed change can be discussed first.

## Author

Built and maintained by [@omjaisatya](https://github.com/omjaisatya).Licensed under MIT.
