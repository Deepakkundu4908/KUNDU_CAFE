const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');


// Load environment variables
dotenv.config();

const storage = require('./storage');

const app = express();
app.locals.liveUserSockets = new Map();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Session configuration (kept for backward compatibility)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

// JWT Token verification middleware
app.use(async (req, res, next) => {
  const token = req.cookies.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
      const userRecord = await storage.findUserById(decoded.id);
      if (!userRecord || userRecord.isActive === false) {
        res.clearCookie('token');
        res.locals.user = null;
        req.user = null;
        return next();
      }
      res.locals.user = userRecord;
      req.user = userRecord;
    } catch (error) {
      res.clearCookie('token');
      res.locals.user = null;
    }
  } else {
    res.locals.user = null;
  }
  next();
});

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/auth', require('./routes/authRoutes'));
app.use('/products', require('./routes/productRoutes'));
app.use('/cart', require('./routes/cartRoutes'));
app.use('/orders', require('./routes/orderRoutes'));
app.use('/wallet', require('./routes/walletRoutes'));
app.use('/admin', require('./routes/adminRoutes'));
app.use('/profile', require('./routes/profileRoutes'));

// Home route
app.get('/', (req, res) => {
  if (res.locals.user && res.locals.user.role === 'admin') {
    return res.redirect('/admin');
  }
  res.render('index', { user: res.locals.user });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// Start server
const START_PORT = Number(process.env.PORT) || 3000;

async function startServer(port) {
  await storage.connectDB();

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Socket.io events
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('joinRoom', ({ room }) => {
      socket.join(room);
      if (room && room.startsWith('user-')) {
        const userId = Number(room.replace('user-', ''));
        if (!Number.isNaN(userId)) {
          socket.data.userId = userId;
          const liveMap = app.locals.liveUserSockets;
          liveMap.set(userId, (liveMap.get(userId) || 0) + 1);
          io.to('admin-room').emit('userPresenceUpdated', {
            liveUsers: [...liveMap.keys()]
          });
        }
      }
      console.log(`Socket ${socket.id} joined ${room}`);
    });
    socket.on('disconnect', () => {
      const userId = socket.data.userId;
      if (typeof userId === 'number') {
        const liveMap = app.locals.liveUserSockets;
        const currentCount = liveMap.get(userId) || 0;
        if (currentCount <= 1) {
          liveMap.delete(userId);
        } else {
          liveMap.set(userId, currentCount - 1);
        }
        io.to('admin-room').emit('userPresenceUpdated', {
          liveUsers: [...liveMap.keys()]
        });
      }
      console.log('Client disconnected:', socket.id);
    });
  });

  // Expose io to req object for controllers
  app.set('io', io);

  const server = httpServer.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`Socket.io live updates enabled`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.warn(`Port ${port} is in use. Retrying on port ${port + 1}...`);
      startServer(port + 1);
      return;
    }

    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

startServer(START_PORT).catch((error) => {
  console.error('Failed to connect to MongoDB or start server:', error);
  console.error('');
  console.error('MongoDB connection help:');
  console.error(`- Current MONGODB_URI: ${process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kundu_cafe'}`);
  console.error('- If you want local MongoDB, make sure the MongoDB server is installed and running on port 27017.');
  console.error('- If you want MongoDB Atlas, replace MONGODB_URI in .env with your Atlas connection string.');
  console.error('- Then restart the app with: npm start');
  process.exit(1);
});
