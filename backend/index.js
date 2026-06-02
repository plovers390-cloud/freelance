// ============================================
// index.js — Express Application Entry Point
// ============================================
// Bootstraps the Express server, applies global
// middleware, mounts route modules, and starts
// listening on the configured port.
// ============================================

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const helmet  = require('helmet');
const xss     = require('xss-clean');
const hpp     = require('hpp');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const pool = require('./db');

const app = express();

// ---- Global Middleware ----------------------

// Security Headers & HSTS
app.use(helmet({
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));

// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https' && req.secure === false) {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Rate Limiting (limit each IP to 250 requests per windowMs)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 250,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// CORS — support Vercel production URL + optional custom domain
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ALLOWED_ORIGIN,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin) return callback(null, true);
    // Allow Vercel preview deployments (*.vercel.app)
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    // Allow configured origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // In development, allow localhost
    if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Parse JSON bodies (limit 10MB for logo uploads etc.)
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Data Sanitization against XSS
app.use(xss());

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Serve uploaded files (logos, etc.) statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---- Health Check ---------------------------

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'ok',
      timestamp: result.rows[0].now,
      uptime: process.uptime()
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed'
    });
  }
});

// ---- DB Keepalive (prevents Supabase free tier pause) ----
// Supabase pauses free databases after 1 week of inactivity.
// This pings the DB every 4 hours to keep it alive.

if (process.env.NODE_ENV === 'production') {
  const DB_KEEPALIVE_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours
  setInterval(async () => {
    try {
      await pool.query('SELECT 1');
      console.log('💓 DB keepalive ping successful');
    } catch (err) {
      console.error('💔 DB keepalive ping failed:', err.message);
    }
  }, DB_KEEPALIVE_INTERVAL);
  console.log('💓 DB keepalive enabled (every 4 hours)');
}

// ---- Ensure upload directories exist ---------

const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads', 'logos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads/logos directory');
}

// ---- Routes ---------------------------------

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/clients',   require('./routes/clients'));
app.use('/api/invoices',  require('./routes/invoices'));
app.use('/api/payments',  require('./routes/payments'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports',   require('./routes/reports'));
app.use('/api/public',    require('./routes/public'));

// ---- 404 handler for unknown routes ---------
// Frontend is served separately by Vercel, so
// the backend only handles /api/* and /uploads/*.
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ---- Global Error Handler -------------------

app.use((err, req, res, next) => {
  console.error('🔥 Unhandled error:', err.stack);
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// ---- Start Server ---------------------------

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 Frellancer API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
