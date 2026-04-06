const uptime = (sec) => {
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = Math.floor(sec % 60);
  return `${hrs}h ${mins}m ${secs}s`;
};

const checkApiHealth = async (req, res) => {
  const healthCheck = {
    status: "UP",
    uptime: uptime(process.uptime()),
    timestamp: new Date().toUTCString(),
    memory: process.memoryUsage(),
  };

  try {
    res.status(200).json(healthCheck);
  } catch (error) {
    healthCheck.status = "Down";
    healthCheck.error = error.message;
    res.status(503).json(healthCheck);
  }
};

export default checkApiHealth;
