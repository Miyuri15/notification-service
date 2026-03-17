const notificationService = require("../services/notification.service");

async function sendNotification(req, res) {
  try {
    const notification = await notificationService.createNotification(req.body);
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getUserNotifications(req, res) {
  try {
    const notifications = await notificationService.getNotificationsByUser(
      req.params.userId,
    );
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function markNotificationRead(req, res) {
  try {
    const notification = await notificationService.markAsRead(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

function healthCheck(req, res) {
  res.json({ status: "OK" });
}

module.exports = {
  sendNotification,
  getUserNotifications,
  markNotificationRead,
  healthCheck,
};