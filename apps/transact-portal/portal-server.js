const express = require('express');
const compression = require('compression');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORTAL_PORT || 4200;
const API_TARGET = process.env.API_TARGET || 'http://localhost:4001';
const DIST = path.join(__dirname, '../../dist/apps/transact-portal/browser');

app.use(compression());
app.use(createProxyMiddleware({ pathFilter: '/api', target: API_TARGET, changeOrigin: true }));

// index.html: no-cache so browsers always fetch the latest (prevents stale chunk refs after deploy)
// Hashed assets: cache 1 year — content hash guarantees freshness
app.use(express.static(DIST, {
  setHeaders(res, filePath) {
    const name = path.basename(filePath);
    if (name === 'index.html') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (/-[A-Z0-9]{8}\.(js|css)$/i.test(name)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));

// SPA fallback — always serve index.html with no-cache so browsers always get the latest
app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`transact-portal serving on http://localhost:${PORT}`);
  console.log(`API proxied to ${API_TARGET}`);
});
