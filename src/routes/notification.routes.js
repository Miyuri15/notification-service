const express = require("express");
const controller = require("../controllers/notification.controller");
const auth = require("../middleware/auth.middleware");
const serviceAuth = require("../middleware/serviceAuth.middleware");

const router = express.Router();

router.get("/health", controller.healthCheck);
router.post("/send", serviceAuth, controller.sendNotification);
router.post("/events", serviceAuth, controller.sendEventNotification);
router.get("/user/:userId", auth, controller.getUserNotifications);
router.patch("/user/:userId/read-all", auth, controller.markAllNotificationsRead);
router.patch("/:id/read", auth, controller.markNotificationRead);

module.exports = router;
