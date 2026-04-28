import Log from "../models/Log.js";
import Monitor from "../models/Monitor.js";

const createMonitor = async (req, res) => {
  try {
    const { name, url, interval, timezone } = req.body;
    console.log("recieved timezone", timezone);

    const checkUrl = await Monitor.findOne({
      userId: req.user._id,
      url: url.trim(),
    });

    if (checkUrl) {
      return res.status(409).json({
        message: `You're already monitoring this url ${checkUrl.name}`,
      });
    }

    const createMonitor = await Monitor.create({
      userId: req.user._id,
      name: name.trim(),
      url: url.trim(),
      interval: interval || 10,
      timezone: timezone || "UTC",
    });

    return res
      .status(201)
      .json({ message: "Monitor created", monitor: createMonitor });
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Unexpected error", error: error.message });
  }
};

// get all monitor for logged in user
const getMonitors = async (req, res) => {
  try {
    const allMonitors = await Monitor.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({ count: allMonitors.length, allMonitors });
  } catch (error) {
    return res.status(500).json({
      message: "There is Server Error, try again later",
      error: error.message,
    });
  }
};

const getMonitorById = async (req, res) => {
  try {
    const monitor = await Monitor.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!monitor)
      return res
        .status(404)
        .json({ message: "Monitor not found, try creating one" });

    const logs = await Log.find({ monitorId: monitor._id })
      .sort({ timestamp: -1 })
      .limit(20);

    res.status(200).json({ monitor, logs });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "There is Server Error", error: error.message });
  }
};

const updateMonitor = async (req, res) => {
  try {
    const { name, url, interval } = req.body;

    if (url) {
      const duplicateUrl = await Monitor.findOne({
        userId: req.user._id,
        url: url.trim(),
        _id: { $ne: req.params.id },
      });

      if (duplicateUrl) {
        return res.status(409).json({
          message: `You're already monitoring this URL ${duplicateUrl.name}`,
        });
      }
    }

    const monitor = await Monitor.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
      },
      {
        ...(name && { name: name.trim() }),
        ...(url && { url: url.trim() }),
        ...(interval && { interval }),
      },
      // depreciated error message apears
      // { new: true, runValidators: true },
      { returnDocument: "after", runValidators: "true" },
    );

    if (!monitor)
      return res
        .status(404)
        .json({ message: "Monitor not found, try creating new monitor" });

    return res.status(200).json({ message: "Successfully Updated", monitor });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "There is Server Error", error: error.message });
  }
};

// update isActive for pause features in monitor
const pauseToggleMonitor = async (req, res) => {
  try {
    const monitor = await Monitor.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!monitor)
      return res
        .status(404)
        .json({ message: "Monitor not found, try creating one" });

    monitor.isActive = !monitor.isActive;

    if (!monitor.isActive) {
      monitor.status = "unknown";
    }

    await monitor.save();
    return res
      .status(200)
      .json({ message: "Successfully update monitor toggle", monitor });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update toggle monitor",
      error: error.message,
    });
  }
};

const deleteMonitor = async (req, res) => {
  try {
    const monitor = await Monitor.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!monitor) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    // clean all logs to saved in monitor
    await Log.deleteMany({ monitorId: monitor._id });

    res.status(200).json({ message: "Monitor and its logs deleted" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "There is Server error", error: error.message });
  }
};

export {
  getMonitors,
  createMonitor,
  getMonitorById,
  updateMonitor,
  deleteMonitor,
  pauseToggleMonitor,
};
