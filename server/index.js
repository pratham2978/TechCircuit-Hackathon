require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { getDb } = require('./db');
const { seedDatabase } = require('./seed');
const { getModelMetrics } = require('./ml-service');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database schema & default seed records
getDb();
seedDatabase();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static assets
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/workspaces', require('./routes/workspaces'));
app.use('/api/guidelines', require('./routes/guidelines'));
app.use('/api/rules', require('./routes/rules'));
app.use('/api/claims', require('./routes/claims'));
app.use('/api/content', require('./routes/content'));
app.use('/api/review', require('./routes/review'));
app.use('/api/workflow', require('./routes/workflow'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/images', require('./routes/images'));
app.use('/api/passport', require('./routes/passport'));
app.use('/api/audit', require('./routes/audit'));

// System health endpoint
app.get('/api/health', (req, res) => {
  const mlMetrics = getModelMetrics();
  res.json({
    status: 'ok',
    app: 'BrandGuard by Inkloom AI',
    version: '2.0-master',
    architecture: 'Strictly Local, Database-Backed, Authentic ML Pipeline',
    timestamp: new Date().toISOString(),
    local_ml_engine: mlMetrics ? {
      name: mlMetrics.model_name,
      accuracy: mlMetrics.accuracy,
      f1_macro: mlMetrics.f1_macro,
      status: 'active_local_inference'
    } : {
      status: 'ready'
    }
  });
});

// Serve BrandGuard workspace
app.get('/brandguard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'brandguard.html'));
});

// Fallback to homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Fix 8: Clean global error handler — no raw stack traces leaked to client
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';

  // Determine HTTP status
  let status = err.status || err.statusCode || 500;
  if (err.message) {
    if (err.message.includes('Invalid file type') || err.message.includes('required') || err.message.includes('cannot be empty')) {
      status = 400;
    } else if (err.message.includes('LIMIT_FILE_SIZE') || err.message.includes('too large')) {
      status = 413;
    } else if (err.message.includes('Unauthorized') || err.message.includes('session')) {
      status = 401;
    } else if (err.message.includes('already') || err.message.includes('Conflict')) {
      status = 409;
    }
  }

  // Log full error server-side only
  console.error(`[ERROR] ${req.method} ${req.path} — ${err.message}`);
  if (isDev && err.stack) console.error(err.stack);

  res.status(status).json({
    success: false,
    error: err.message || 'Internal Server Error',
    // Only expose stack trace in development
    ...(isDev && err.stack ? { stack: err.stack.split('\n').slice(0, 5).join('\n') } : {})
  });
});

if (require.main === module) {
  const HOST = process.env.HOST || '0.0.0.0';
  app.listen(PORT, HOST, () => {
    console.log(`=======================================================`);
    console.log(`🛡️  BrandGuard by Inkloom AI server running on ${HOST}:${PORT}`);
    console.log(`   Homepage:  http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/`);
    console.log(`   Workspace: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/brandguard`);
    console.log(`   Local ML:  scikit-learn tone classifier active`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
