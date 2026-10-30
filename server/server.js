require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { initSocket } = require('./socket');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL.split(',') }));
app.use(express.json());

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

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

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
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });