import MaintenanceWindow from "../models/MaintenanceWindow.js";

export const getMaintenanceWindows = async (req, res) => {
  try {
    const windows = await MaintenanceWindow.find({ userId: req.user._id })
      .populate("monitors", "name url")
      .populate("syntheticMonitors", "name")
      .populate("apiMonitors", "name")
      .populate("heartbeats", "name")
      .sort({ startTime: -1 });
    res.json(windows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createMaintenanceWindow = async (req, res) => {
  try {
    const newWindow = await MaintenanceWindow.create({
      ...req.body,
      userId: req.user._id,
    });
    res.status(201).json(newWindow);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteMaintenanceWindow = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await MaintenanceWindow.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Maintenance window deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
