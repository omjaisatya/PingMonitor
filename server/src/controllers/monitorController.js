import Log from "../models/Log.js";
import Monitor from "../models/Monitor.js";

const createMonitor = async (req, res) => {
  try {
    const { name, url, interval } = req.body;

    const createMonitor = await Monitor.create({
      userId: req.user._id,
      name,
      url,
      interval: interval || 10,
    });

    res.status(201).json({ message: "Monitor created", createMonitor });
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
      cretedAt: -1,
    });

    res.status(200).json({ count: allMonitors.length, allMonitors });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "There is Server Error", error: error.message });
  }
};

const getMonitorById = async (req, res) => {
  try {
    const monitor = await Monitor.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!monitor) return res.status(404).json({ message: "Monitor nor found" });

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
    const monitor = await Monitor.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
      },
      { name, url, interval },
      { new: true, runValidators: true },
    );

    if (!monitor)
      return res
        .status(404)
        .json({ message: "Monitor not found, try creating new monitor" });
    res.status(200).json({ message: "Successfully Updated", monitor });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "There is Server Error", error: error.message });
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
};
