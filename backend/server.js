require("dotenv").config();
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing in .env. Add it and restart.");
  process.exit(1);
}
const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();
