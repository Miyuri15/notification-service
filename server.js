const dotenv = require("dotenv");
const app = require("./src/app");
const connectDB = require("./src/config/db");

dotenv.config();
connectDB();

const PORT = process.env.PORT || 8085;

app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
});