# Multi-Region Uptime Monitoring

## Architecture

PingMonitor now supports a distributed monitoring topology:

1. Central API and scheduler
   - Owns MongoDB writes, quorum decisions, notifications, and UI APIs.
   - Enqueues one check job per monitor per region.
   - Consumes worker results and runs delayed aggregation jobs.

2. Redis queues
   - `monitor-checks:<region>`: central scheduler publishes region-specific check jobs.
   - `monitor-results`: regional workers publish latency/status results.
   - `monitor-aggregate`: central service runs quorum after a short delay.

3. Regional workers
   - Run close to users in `us`, `europe`, `asia`, and `australia`.
   - Each worker only executes jobs matching `MONITOR_NODE_REGION`.
   - Workers authenticate jobs using `WORKER_NODE_TOKEN` hash verification.

4. MongoDB storage
   - `RegionalCheckResult`: raw per-region check output.
   - `Log`: quorum log plus per-region logs with `region` and `checkGroupId`.
   - `Monitor.regionalStatus`: latest region status map.
   - `Monitor.lastQuorum`: latest majority decision metadata.

## Quorum Logic

For four regions, downtime is recorded only when a majority of regions fail.

| Regions                     | Majority needed | Downtime condition  |
| --------------------------- | --------------: | ------------------- |
| US, Europe, Asia, Australia |               3 | 3 or 4 regions fail |

If only one or two regions fail, the monitor remains `up`, but the regional breakdown still shows the affected regions. This reduces false positives from isolated network or provider issues.

## Worker-to-Central Communication

Communication is asynchronous through Redis:

```text
Central scheduler -> monitor-checks -> Regional worker
Regional worker -> monitor-results -> Central result worker
Central aggregate worker -> MongoDB + notifications
```

Workers never update monitor status directly. They only publish signed regional observations to Redis. The central aggregation service owns final state transitions.

## Environment

Central API:

```bash
ENABLE_DISTRIBUTED_MONITORING=true
REDIS_URL=redis://redis:6379
WORKER_NODE_TOKEN=<shared-long-random-secret>
MONITOR_REGIONS=us,europe,asia,australia
```

Regional worker:

```bash
NODE_ENV=production
MONGO_URL=<same mongodb url>
REDIS_URL=redis://redis:6379
WORKER_NODE_TOKEN=<same shared secret>
MONITOR_NODE_REGION=us
WORKER_CONCURRENCY=20
```

Run one worker deployment per region, changing `MONITOR_NODE_REGION` to `us`, `europe`, `asia`, or `australia`.

## Commands

Central:

```bash
npm start
```

Worker:

```bash
npm run worker:region
```

## Deployment Strategy

1. Deploy Redis with persistence and TLS/private networking.
2. Deploy one central API service connected to MongoDB and Redis.
3. Deploy at least one worker in each region.
4. Scale workers horizontally by increasing replicas per region.
5. Keep `WORKER_NODE_TOKEN` in a secret manager and rotate it periodically.
6. Set queue concurrency based on CPU/network capacity.
7. Monitor queue depth and worker failure rates.

## Horizontal Scaling

- Multiple central API replicas can serve HTTP traffic.
- Keep only one scheduler replica active unless you add a scheduler lock.
- Aggregation workers are horizontally safe because each aggregate job is unique per `checkGroupId`.
- Worker replicas are horizontally safe because BullMQ distributes jobs across consumers.
- Add more workers in regions with high queue depth or higher latency.

## UI

Monitor detail now includes:

- Latest status by region.
- 24-sample latency heatmap per region.
- 24-hour average latency.
- 24-hour failure count.
- Latest quorum health summary.
