const Notification = require("../models/notification.model");

async function createNotification(payload) {
  return Notification.create(payload);
}

async function getNotificationsByUser(userId) {
  return Notification.find({ userId }).sort({ createdAt: -1 });
}

async function markAsRead(notificationId) {
  return Notification.findByIdAndUpdate(
    notificationId,
    { status: "READ" },
    { new: true },
  );
}

module.exports = {
  createNotification,
  getNotificationsByUser,
  markAsRead,
};