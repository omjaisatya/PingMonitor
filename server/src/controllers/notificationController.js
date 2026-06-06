import InAppNotification from "../models/InAppNotification.js";

export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const unreadCount = await InAppNotification.countDocuments({
      userId,
      isRead: false,
    });

    const notifications = await InAppNotification.find({ userId })
      .sort({ timestamp: -1 })
      .limit(15)
      .populate("monitorId", "name url");

    res.json({
      unreadCount,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await InAppNotification.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { isRead: true },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification marked as read", notification });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await InAppNotification.updateMany(
      { userId, isRead: false },
      { isRead: true },
    );

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    next(error);
  }
};
export default {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
