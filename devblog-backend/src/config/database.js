const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL?.includes('?') 
        ? process.env.DATABASE_URL 
        : `${process.env.DATABASE_URL}?sslmode=require`
    }
  },
  log: ['query', 'info', 'warn', 'error'],
});

let connectionRetries = 0;
const MAX_CONNECTION_RETRIES = 5;
const RETRY_DELAY = 3000; // 3 seconds

// Health check function
const checkDatabaseConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error.message);
    return false;
  }
};

// Reconnect function with retry logic
const reconnectDatabase = async () => {
  try {
    await prisma.$connect();
    const isHealthy = await checkDatabaseConnection();
    if (isHealthy) {
      console.log('✅ Database reconnected successfully');
      connectionRetries = 0;
      return true;
    }
  } catch (error) {
    console.error('❌ Database reconnection failed:', error.message);
  }
  return false;
};

// Wrapper for Prisma queries with automatic reconnection
const withReconnect = async (queryFn, ...args) => {
  try {
    return await queryFn(...args);
  } catch (error) {
    // Check if it's a connection error
    if (error.code === 'P1001' || error.message.includes('Can\'t reach database server') || error.message.includes('Connection terminated')) {
      console.log('⚠️  Database connection lost, attempting to reconnect...');
      
      // Try to reconnect
      const reconnected = await reconnectDatabase();
      if (reconnected) {
        // Retry the query once
        try {
          return await queryFn(...args);
        } catch (retryError) {
          console.error('Query failed after reconnection:', retryError.message);
          throw retryError;
        }
      }
    }
    throw error;
  }
};

// Keep-alive ping to prevent Neon from sleeping
const startKeepAlive = () => {
  setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('💓 Database keep-alive ping sent');
    } catch (error) {
      console.error('Keep-alive ping failed:', error.message);
      // Attempt reconnection on keep-alive failure
      await reconnectDatabase();
    }
  }, 2 * 60 * 1000); // Every 2 minutes
};

// Startup with retry logic
const connectWithRetry = async () => {
  console.log('🔄 Connecting to database...');
  
  while (connectionRetries < MAX_CONNECTION_RETRIES) {
    try {
      await prisma.$connect();
      const isHealthy = await checkDatabaseConnection();
      
      if (isHealthy) {
        console.log('✅ Database connected successfully');
        startKeepAlive();
        return;
      }
    } catch (error) {
      console.error(`❌ Database connection attempt ${connectionRetries + 1}/${MAX_CONNECTION_RETRIES} failed:`, error.message);
    }
    
    connectionRetries++;
    if (connectionRetries < MAX_CONNECTION_RETRIES) {
      console.log(`⏳ Retrying in ${RETRY_DELAY / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  
  console.error('❌ Failed to connect to database after maximum retries. Server will start but database operations may fail.');
};

// Connect on startup
connectWithRetry();

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = { prisma, withReconnect, checkDatabaseConnection };
