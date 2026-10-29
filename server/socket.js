const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('./models/User');
const { canManageCanteen } = require('./middleware/auth');

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL.split(',') },
  });

  // Verify the JWT on every connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) return next(new Error('No token'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id);
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Everyone gets their own room
    socket.join(`user:${socket.user._id}`);

    // Staff/admin join a canteen room (ownership checked)
    socket.on('joinCanteen', (canteenId, ack) => {
      if (!mongoose.isValidObjectId(canteenId) || !canManageCanteen(socket.user, canteenId)) {
        return ack && ack({ ok: false, message: 'Not allowed' });
      }
      socket.join(`canteen:${canteenId}`);
      ack && ack({ ok: true });
    });

    socket.on('leaveCanteen', (canteenId) => {
      if (mongoose.isValidObjectId(canteenId)) socket.leave(`canteen:${canteenId}`);
    });
  });

  return io;
}

function emitToUser(userId, event, payload) {
  if (io) io.to(`user:${userId}`).emit(event, payload);
}

function emitToCanteen(canteenId, event, payload) {
  if (io) io.to(`canteen:${canteenId}`).emit(event, payload);
}
function notifyOrder(order, event = 'orderUpdated') {
  const canteenId = String(order.canteen._id || order.canteen);
  const userId = String(order.user._id || order.user);
  // Small payload on purpose: no pickupCode. The client refetches the real data.
  const payload = {
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    canteenId,
  };
  emitToCanteen(canteenId, event, payload);
  if (event === 'orderUpdated') emitToUser(userId, event, payload);
}

module.exports = { initSocket, emitToUser, emitToCanteen, notifyOrder };
