import app from "./src/app.js";
import connectDb from "./src/config/db.js";
import { NODE_ENV, PORT } from "./src/config/env.config.js";
import startCron from "./src/services/cronJob.js";

const Port = PORT || 5000;

// Server
app.listen(Port, () => {
  console.log(`Server running in ${Port} & on ${NODE_ENV} mode`);
});

//connecting DataBase and cron
connectDb().then(() => {
  startCron();
});
