require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const path = require("node:path");
const { initSocket } = require('./socket');
const csrfOrigin = require("./middleware/csrfOrigin");
const cronAuth = require("./middleware/cronAuth");
const securityHeaders = require("./middleware/securityHeaders");
const requestId = require("./middleware/requestId");
const errorHandler = require("./middleware/errorHandler");
const serveClient = require("./middleware/serveClient");
const { getAllowedOrigins, isAllowedOrigin } = require("./allowedOrigins");
const { runNoShowCheck, startNoShowJob } = require("./noShow");

const missingEnvironment = ["MONGO_URI", "JWT_SECRET"]
  .filter((name) => !process.env[name]);
if (missingEnvironment.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvironment.join(", ")}`);
}

const app = express();
let databaseConnection;

app.set("trust proxy", 1);
app.use(securityHeaders);
app.use(requestId);
const allowedOrigins = getAllowedOrigins();
if (allowedOrigins.length === 0 && process.env.VERCEL !== "1") {
  throw new Error("Set CLIENT_URL or run on a host that provides RENDER_EXTERNAL_URL or VERCEL_URL");
}
app.use(cors((req, callback) => {
  const origin = req.get("origin");
  callback(null, {
    origin: origin ? isAllowedOrigin(origin, req) : false,
    credentials: true,
  });
}));
app.use(csrfOrigin);
app.use(express.json({ limit: "100kb" }));

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) return;
  if (!databaseConnection || mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
    databaseConnection = mongoose.connect(process.env.MONGO_URI).catch((err) => {
      databaseConnection = null;
      throw err;
    });
  }
  await databaseConnection;
}

app.use((req, res, next) => {
  connectToDatabase().then(() => next(), next);
});

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

const reviewRoutes = require("./routes/reviewRoutes");
app.use("/api/reviews", reviewRoutes);

const smartRoutes = require("./routes/smartRoutes");
app.use("/api/smart", smartRoutes);

app.get("/api/internal/no-show", cronAuth, async (req, res, next) => {
  try {
    await runNoShowCheck();
    res.json({ status: "completed" });
  } catch (err) {
    next(err);
  }
});

serveClient(app, path.resolve(__dirname, "../client/dist"));

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5001;

module.exports = app;

if (require.main === module) {
  connectToDatabase()
    .then(() => {
      console.log('MongoDB connected');
      const server = http.createServer(app);
      initSocket(server);
      server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
      startNoShowJob();
    })
    .catch((err) => {
      console.error("MongoDB connection failed", { errorName: err.name || "Error" });
      process.exit(1);
    });
}