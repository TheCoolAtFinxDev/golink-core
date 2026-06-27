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
        DATABASE_URL: 'postgresql://payfac:payfac@localhost:5432/golink_transact?schema=public',
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
        DATABASE_URL: 'postgresql://payfac:payfac@localhost:5432/golink_collect?schema=public',
        REDIS_URL: 'redis://localhost:6379',
      },
    },

    // ── Sandbox ───────────────────────────────────────────────────────────────
    {
      name: 'glk-transact-api-sandbox',
      script: 'apps/transact-api/dist/main.js',
      cwd: '/home/developer/golink-suite',
      instances: 1,
      autorestart: true,
      watch: false,
      env_file: 'apps/transact-api/.env.sandbox',
      env: {
        NODE_ENV: 'sandbox',
        PORT: 4011,
        DATABASE_URL: 'postgresql://payfac:payfac@localhost:5432/golink_transact_sandbox?schema=public',
        REDIS_URL: 'redis://localhost:6379',
        ADMIN_JWT_SECRET: 'glk-admin-jwt-sandbox-change-before-sharing',
        IVERI_3DS_URL: 'https://portal.nedsecure.co.za/threedsecure/EnrollmentInitial',
        CHECKOUT_RETURN_URL: 'https://sandbox.transact.golink.co.ls/api/3ds/return',
        CHECKOUT_SUCCESS_URL: 'https://sandbox.transact.golink.co.ls/pay/success',
        CHECKOUT_FAIL_URL: 'https://sandbox.transact.golink.co.ls/pay/failed',
        CARD_SESSION_ENCRYPTION_KEY: '1b3d625bac1934a46a292d0b1a4309740a2c8e04417226a12c08619fcb13eb4c',
      },
    },
    {
      name: 'glk-transact-portal-sandbox',
      script: 'apps/transact-portal/portal-server.js',
      cwd: '/home/developer/golink-suite',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'sandbox',
        PORTAL_PORT: 4211,
        API_TARGET: 'http://localhost:4011',
      },
    },
  ],
};
