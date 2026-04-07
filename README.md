# PingMonitor : Server Uptime & API Monitoring System

PingMonitor is a complete full-stack application designed to monitor the uptime of URLs and APIs in the background. It features a robust REST API backend that pings services, logs response times, and sends email alerts upon downtime, paired with a dynamic React frontend for managing monitors and visualizing uptime data.

![GitHub last commit](https://img.shields.io/github/last-commit/omjaisatya/PingMonitor)
![GitHub commit activity](https://img.shields.io/github/commit-activity/w/omjaisatya/PingMonitor)
![GitHub Created At](https://img.shields.io/github/created-at/omjaisatya/PingMonitor)
![GitHub repo size](https://img.shields.io/github/repo-size/omjaisatya/PingMonitor)

## Project Structure

```text
PingMonitor/
├── assets/
│   └── logo.png
├── client/   
│   ├── src/
│   ├── public/  
│   ├── .gitignore
│   ├── index.html
│   ├── netlify.toml  //for optimize netlify build    
│   ├── package-lock.json    
│   ├── vite.config.js   
│   └── package.json  
└── server/ 
│   ├── src/
│   ├── .gitignore
│   ├── server.js
│   └── package.json
└── .gitignore 
└── README.md     
```

## Tech Stack

### Frontend (`/client`)

- **Framework:** React.js powered by Vite
- **HTTP Client:** Axios (for API communication)
- **Routing:** React Router DOM

### Backend (`/server`)

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT + bcryptjs
- **Scheduler:** node-cron
- **Email:** Nodemailer

## Features

- **User Authentication:** Secure JWT-based signup, login, and protected routes.
- **Dashboard UI:** Clean React interface to seamlessly add, view, update, and delete monitors.
- **Automated Pinging:** Background cron job that pings all tracked URLs concurrently every minute.
- **Detailed Logging:** Records status, HTTP status code, response time, and exact timestamp per ping.
- **Smart Email Alerts:** Alerts are triggered *only* when a monitor's status flips from `UP` → `DOWN` to prevent spam.
- **Auto Cleanup:** Logs are automatically cleared when a monitor is deleted.

## API Reference

### Auth Routes

| Method  | Endpoint               | Auth | Description               |
|---------|------------------------|------|---------------------------|
| POST    | `/api/auth/signup`     |  ✕   | Register a new user       |
| POST    | `/api/auth/login`      |  ✕   | Login and get JWT token   |

### Monitor Routes

| Method  | Endpoint               | Auth | Description                       |
|---------|------------------------|------|-----------------------------------|
| POST    | `/api/monitors`        |  ✓   | Create a new monitor              |
| GET     | `/api/monitors`        |  ✓   | Get all monitors for user         |
| GET     | `/api/monitors/:id`    |  ✓   | Get one monitor                   |
| PUT     | `/api/monitors/:id`    |  ✓   | Update monitor details            |
| DELETE  | `/api/monitors/:id`    |  ✓   | Delete monitor and its logs       |

## Run Locally

Clone the project

```bash
  git clone https://github.com/omjaisatya/PingMonitor.git
```

Go to the project directory

```bash
  cd PingMonitor
```

Install dependencies

### 1. Backend Setup (`/server`)

Open a terminal and navigate to the server directory:

```bash
cd server
npm install
```

**Run the Server:**

```bash
npm run dev
```

### 2. Frontend Setup (`/client`)

Open a **new/separate terminal** and navigate to the client directory:

```bash
cd client
npm install
```

**Run the Client:**

```bash
npm run dev
```

## Environment Variables

To run this project, you will need to add the following environment variables to your `.env` file

### 1. Backend

`PORT`

`MONGO_URI`

`JWT_SECRET`

`EMAIL_USE`

`EMAIL_PASS`

> **Note:** Check `.env.example` for all available variables. Well-commented and easy to follow!
> **Note:** For `EMAIL_USER` and `EMAIL_PASS` configuration, refer to the [Nodemailer Well-Known Services](https://nodemailer.com/smtp/well-known-services) documentation.

### 2. Client

`VITE_SERVER_URL`

`VITE_APP_TITLE`

> **Note:** Your Banckend hosted URL, i.e <https://www.domain.com/>.  
> For Free Hosting, use Render.com

## Cron WorkFlow: Backend

```txt
Every 60 seconds
      │
      ▼
Fetch all monitors from DB
      │
      ▼
Ping each URL concurrently (10s timeout)
      │
      ├── 2xx / 3xx  →  status: "up"
      └── 4xx / 5xx / timeout / no response  →  status: "down"
                              │
                              ▼
                  Previous status wasn't "down"?
                              │
                        Yes → Send email alert
                        No  → Skip (already notified)
      │
      ▼
Save Log + Update Monitor status
```

## Important

### Data Retention

To keep the application efficient and within the MongoDB Free Tier limits, we have implemented a **TTL (Time-To-Live) Index** on the Ping Logs collection.

- **Retention Period:** 7 Days
- **Logic:** Each ping log is automatically deleted by MongoDB after 7 days of creation.
- **Why?** This ensures that the 512MB storage limit is never exceeded while providing enough historical data for uptime charts.
- **Note:** User account data and Monitor configurations are stored in separate collections and are **permanent**; they are not affected by this auto-deletion policy.

## Author

- [@omjaisatya](https://www.github.com/omjaisatya)

## Feedback

If you have any feedback, please reach out to us at <ping-monitor@outlook.com>
