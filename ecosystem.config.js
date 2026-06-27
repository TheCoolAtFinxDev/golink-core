module.exports = {
  apps: [
    // ── Production ────────────────────────────────────────────────────────────
    {
      name: 'glk-transact-api',
      script: 'apps/transact-api/dist/main.js',
      cwd: '/home/developer/golink-suite',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 4001,
        DATABASE_URL: 'postgresql://DB_USER:DB_PASS@localhost:5432/golink_transact?schema=public',
        REDIS_URL: 'redis://localhost:6379',
      },
    },
    {
      name: 'glk-transact-portal',
      script: 'apps/transact-portal/portal-server.js',
      cwd: '/home/developer/golink-suite',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORTAL_PORT: 4200,
        API_TARGET: 'http://localhost:4001',
      },
    },
    {
      name: 'glk-collect-api',
      script: 'apps/collect-api/dist/main.js',
      cwd: '/home/developer/golink-suite',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 4002,
        DATABASE_URL: 'postgresql://DB_USER:DB_PASS@localhost:5432/golink_collect?schema=public',
        REDIS_URL: 'redis://localhost:6379',
      },
    },

    // Note: sandbox runs as Docker containers (transact-api-sandbox, transact-portal-sandbox)
    // on the odoo_stack_default network — not managed by PM2.
  ],
};
