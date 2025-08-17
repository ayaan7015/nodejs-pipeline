const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Proxy API requests to Flask backend
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
  onError: (err, req, res) => {
    console.error('Proxy Error:', err.message);
    res.status(500).json({ 
      error: 'Backend server unavailable',
      message: 'Please make sure the Flask backend is running on port 5000'
    });
  }
}));

// Handle client-side routing - serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Todo App Frontend Server Started!`);
  console.log(`📍 Server running at: http://localhost:${PORT}`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, 'public')}`);
  console.log(`🔄 Proxying API requests to: http://localhost:5000`);
  console.log(`\n📝 Make sure your Flask backend is running on port 5000`);
  console.log(`   Backend command: cd backend && python app.py\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n📴 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n📴 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});