const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    // Remove if not using Server Components
    serverComponentsExternalPackages: ['mongodb'],
  },
  // Otimizações de compilação
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  webpack(config, { dev }) {
    if (dev) {
      // Otimizações para desenvolvimento
      config.watchOptions = {
        poll: 1000, // Reduzido de 2000 para 1000ms
        aggregateTimeout: 200, // Reduzido de 300 para 200ms
        ignored: [
          '**/node_modules',
          '**/.git',
          '**/.next',
          '**/credentials',
          '**/credencials',
        ],
      };
    }

    // Otimizações gerais
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
    };

    return config;
  },
  onDemandEntries: {
    maxInactiveAge: 15 * 1000, // 15 segundos (balance entre memória e performance)
    pagesBufferLength: 2, // Reduzido para economizar memória
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://*.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://*.googleusercontent.com; connect-src 'self' https://*.googleapis.com; font-src 'self' data: https://fonts.gstatic.com https://use.typekit.net;"
          },
          { key: "Access-Control-Allow-Origin", value: process.env.CORS_ORIGINS || "self" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Authorization, Content-Type" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
