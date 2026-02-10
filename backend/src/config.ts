import 'dotenv/config';

// Fail fast if required env vars are missing
const REQUIRED_ENV_VARS = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;

for (const envVar of REQUIRED_ENV_VARS) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}. Server cannot start.`);
  }
}

export const config = {
  server: {
    port: parseInt(process.env.PORT || '8080', 10),
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
  },
  database: {
    url: process.env.DATABASE_URL!,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  encryptionKey: process.env.ENCRYPTION_KEY || '',
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3: {
      bucket: process.env.S3_BUCKET || 'jakebuysit-photos',
      cdnUrl: process.env.S3_CDN_URL,
    },
  },
  agents: {
    agent2Url: process.env.AGENT2_API_URL || 'http://localhost:8000',
    agent3Url: process.env.AGENT3_API_URL || 'http://localhost:3002',
    recommendationsUrl: process.env.RECOMMENDATIONS_API_URL || 'http://localhost:8005',
  },
  shipping: {
    easypost: {
      apiKey: process.env.EASYPOST_API_KEY,
    },
    warehouse: {
      name: process.env.WAREHOUSE_ADDRESS_NAME || 'JakeBuysIt Warehouse',
      street: process.env.WAREHOUSE_ADDRESS_STREET || '123 Main St',
      city: process.env.WAREHOUSE_ADDRESS_CITY || 'Austin',
      state: process.env.WAREHOUSE_ADDRESS_STATE || 'TX',
      zip: process.env.WAREHOUSE_ADDRESS_ZIP || '78701',
    },
  },
  payments: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET,
      mode: process.env.PAYPAL_MODE || 'sandbox',
    },
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID,
  },
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
    logLevel: process.env.LOG_LEVEL || 'info',
  },
  businessRules: {
    offersPerDayLimit: parseInt(process.env.OFFERS_PER_DAY_LIMIT || '20', 10),
    offersPerHourLimit: parseInt(process.env.OFFERS_PER_HOUR_LIMIT || '5', 10),
    minOfferAmount: parseFloat(process.env.MIN_OFFER_AMOUNT || '5'),
    maxOfferAmount: parseFloat(process.env.MAX_OFFER_AMOUNT || '2000'),
    offerExpiryHours: parseInt(process.env.OFFER_EXPIRY_HOURS || '24', 10),
  },
  ebay: {
    clientId: process.env.EBAY_CLIENT_ID || '',
    clientSecret: process.env.EBAY_CLIENT_SECRET || '',
    redirectUri: process.env.EBAY_REDIRECT_URI || 'http://localhost:3001/api/v1/integrations/ebay/callback',
    sandbox: process.env.EBAY_SANDBOX === 'true',
    paypalEmail: process.env.EBAY_PAYPAL_EMAIL,
    // Phase 2: eBay Finding API for comparables
    appId: process.env.EBAY_APP_ID || '', // eBay Finding API App ID
  },
};
