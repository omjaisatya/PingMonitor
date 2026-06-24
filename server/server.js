import app from "./src/app.js";
import { createServer } from "http";
import connectDb from "./src/config/db.js";
import {
  ENABLE_DISTRIBUTED_MONITORING,
  NODE_ENV,
  PORT,
} from "./src/config/env.config.js";
import startCron from "./src/services/cronJob.js";
import { handleRealtimeUpgrade } from "./src/services/realtimeService.js";

const Port = PORT || 5000;
const httpServer = createServer(app);
httpServer.on("upgrade", handleRealtimeUpgrade);

// Server
httpServer.listen(Port, () => {
  console.log(`Server running in ${Port} & on ${NODE_ENV} mode`);
});

//connecting DataBase and cron
connectDb().then(() => {
  if (ENABLE_DISTRIBUTED_MONITORING === "true") {
    import("./src/services/distributedMonitorService.js").then(
      ({ startAggregationWorkers, startDistributedScheduler }) => {
        startAggregationWorkers();
        const started = startDistributedScheduler();
        if (!started) startCron();
      },
    );
  } else {
    startCron();
  }

  // Auto-start regional worker if configured in env
  const { MONITOR_NODE_REGION, WORKER_NODE_TOKEN } = process.env;
  if (MONITOR_NODE_REGION && WORKER_NODE_TOKEN) {
    import("./src/workers/regionalWorker.js")
      .then(() =>
        console.log("Integrated regional worker successfully started."),
      )
      .catch((err) =>
        console.error(
          "Failed to start integrated regional worker:",
          err.message,
        ),
      );
  }

  import("./src/services/queueService.js").then(({ isRedisQueueEnabled }) => {
    if (isRedisQueueEnabled()) {
      import("./src/workers/syntheticWorker.js")
        .then(() =>
          console.log("Integrated synthetic worker successfully started."),
        )
        .catch((err) =>
          console.error(
            "Failed to start integrated synthetic worker:",
            err.message,
          ),
        );
      import("./src/workers/apiWorker.js")
        .then(() =>
          console.log("Integrated API checks worker successfully started."),
        )
        .catch((err) =>
          console.error(
            "Failed to start integrated API checks worker:",
            err.message,
          ),
        );
    }
  });
});
