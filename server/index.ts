import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws'; // Import explicitly for later usage

dotenv.config();

import connectDB from './config/database';
import authRoutes from './routes/auth';
import documentRoutes from './routes/documents';
import aiRoutes from './routes/ai';
import { apiLimiter } from './middleware/rateLimiter';
import socketHandler from './websockets/socketHandler';

const app = express();
const server = http.createServer(app);

// Behind Render/Cloudflare proxies: trust first proxy for correct IP and HTTPS detection
app.set('trust proxy', 1);

// CORS configuration - allow multiple origins
// Prefer env var CLIENT_URL; allow localhost and matching Render static site
const FRONTEND_REGEX = /https:\/\/collaborative-editor-frontend(-[a-z0-9]+)?\.onrender\.com/;
const allowedOrigins = [
  'http://localhost:3000',
  process.env.CLIENT_URL as string
].filter(Boolean) as string[];

console.log('Allowed CORS origins:', allowedOrigins, 'Regex:', FRONTEND_REGEX);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Connect to database
connectDB();

// Use cors package with dynamic origin function
const corsMiddleware = cors({
  origin: (origin: any, callback: any) => {
    // Allow non-browser requests or health checks with no Origin
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || FRONTEND_REGEX.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Set-Cookie']
});

app.use(corsMiddleware);
app.options('*', corsMiddleware);

// Helmet with CORS-friendly configuration
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting
app.use('/api/', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/ai', aiRoutes);

// Root route
app.get('/', (req: any, res: any) => {
  res.json({
    message: 'Collaborative Text Editor API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      documents: '/api/documents',
      ai: '/api/ai'
    }
  });
});

// Health check
app.get('/health', (req: any, res: any) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Socket.io connection handling
io.use((socket: any, next: any) => {
  // Authentication middleware for socket
  let token = socket.handshake.auth?.token;

  // If no token in auth, try to get from cookies
  if (!token) {
    const cookieHeader = socket.handshake.headers.cookie;
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc: any, cookie: any) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {});
      token = cookies.token;
    }
  }

  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket: any) => {
  socketHandler(socket, io);
});

// Yjs WebSocket setup
// const { setupWSConnection } = require('y-websocket/bin/utils'); // Removed incorrect import
import { setupWSConnection } from './websockets/yjsUtils';
// Optional: Override persistence here or in a separate file if needed later
// require('./websockets/yjsPersistence'); 

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request: any, socket: any, head: any) => {
  if (request.url.startsWith('/yjs')) {
    wss.handleUpgrade(request, socket, head, (ws: any) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', (ws: any, req: any) => {
  setupWSConnection(ws, req);
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, io };
