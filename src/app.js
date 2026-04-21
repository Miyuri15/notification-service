const express = require("express");
const cors = require("cors");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const notificationRoutes = require("./routes/notification.routes");

const app = express();
const swaggerDocument = YAML.load(
  path.resolve(__dirname, "..", "swagger", "swagger.yaml"),
);

app.use(cors());
app.options(/.*/, cors());
app.use(express.json());

app.use((req, res, next) => {
  const startedAt = Date.now();
  const timestamp = new Date().toISOString();

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    console.log(
      `[${timestamp}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${durationMs}ms`,
    );
  });

  next();
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Notification Service is updated now" });
});

module.exports = app;
