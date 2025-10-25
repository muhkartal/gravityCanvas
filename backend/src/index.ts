import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import morgan from 'morgan';
import compression from 'compression';
import { initDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { SocketService } from './services/socketService';
import { securityMiddleware, corsMiddleware, rateLimitMiddleware, sanitizeInput } from './middleware/security';
import authRoutes from './routes/auth';
import presetRoutes from './routes/presets';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(corsMiddleware);
app.use(securityMiddleware);
app.use(sanitizeInput);

if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use(rateLimitMiddleware);

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});

app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Gravity Canvas API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      presets: '/api/presets'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/presets', presetRoutes);

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON in request body'
    });
  }

  if (error.message && error.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      error: 'CORS policy violation'
    });
  }

  res.status(error.status || 500).json({
    success: false,
    error: NODE_ENV === 'development' ? error.message : 'Internal server error',
    ...(NODE_ENV === 'development' && { stack: error.stack })
  });
});

const startServer = async () => {
  try {
    
    await initDatabase();
    
    await connectRedis();
    
    const socketService = new SocketService(server);
    
    server.listen(PORT, () => {
      
      if (NODE_ENV === 'development') {
      }
    });

    process.on('SIGTERM', () => {
      server.close(() => {
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      server.close(() => {
        process.exit(0);
      });
    });

  } catch (error) {
    process.exit(1);
  }
};

startServer();
