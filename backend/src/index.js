const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const listRoutes = require('./routes/lists');
const itemRoutes = require('./routes/items');
const inviteRoutes = require('./routes/invitations');
const { authenticateSocket } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

// Attach io to req
app.use((req, _res, next) => { req.io = io; next(); });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/invitations', inviteRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Socket.io
io.use(authenticateSocket);

io.on('connection', (socket) => {
  const userId = socket.user.id;
  console.log(`User connected: ${socket.user.alias} (${userId})`);

  socket.on('join_list', (listId) => {
    socket.join(`list:${listId}`);
  });

  socket.on('leave_list', (listId) => {
    socket.leave(`list:${listId}`);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.alias}`);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`ShopList backend running on port ${PORT}`));
