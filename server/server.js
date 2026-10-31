require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const path = require("node:path");
const { initSocket } = require('./socket');
const csrfOrigin = require("./middleware/csrfOrigin");
const securityHeaders = require("./middleware/securityHeaders");
const errorHandler = require("./middleware/errorHandler");
const serveClient = require("./middleware/serveClient");
const { getAllowedOrigins } = require("./allowedOrigins");

const missingEnvironment = ["MONGO_URI", "JWT_SECRET"]
  .filter((name) => !process.env[name]);
if (missingEnvironment.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvironment.join(", ")}`);
}

const app = express();

app.set("trust proxy", 1);
app.use(securityHeaders);
const allowedOrigins = getAllowedOrigins();
if (allowedOrigins.length === 0) {
  throw new Error("Set CLIENT_URL or run on a host that provides RENDER_EXTERNAL_URL");
}
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(csrfOrigin);
app.use(express.json({ limit: "100kb" }));

// Health check
app.get('/api/health', (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? 'OK' : 'UNAVAILABLE',
    database: databaseReady ? 'connected' : 'disconnected',
  });
});

const menuRoutes = require("./routes/menuRoutes");
app.use("/api/menu", menuRoutes);

const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

const orderRoutes = require("./routes/orderRoutes");
app.use("/api/orders", orderRoutes);

const canteenRoutes = require("./routes/canteenRoutes");
app.use("/api/canteens", canteenRoutes);

const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);

serveClient(app, path.resolve(__dirname, "../client/dist"));

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5001;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    const server = http.createServer(app);
    initSocket(server);
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    require("./noShow").startNoShowJob();
  })
  .catch((err) => {
    console.error("MongoDB connection failed", { errorName: err.name || "Error" });
    process.exit(1);
  });