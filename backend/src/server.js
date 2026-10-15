import app from './app.js';
import { config } from './config/index.js';
import { disconnectPrisma } from './repositories/prismaClient.js';

const PORT = config.PORT;

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` 🌱 Campus Sustainability API Server is running!`);
  console.log(` 📍 Environment: ${config.NODE_ENV}`);
  console.log(` 🚀 Listening at: http://localhost:${PORT}${config.API_PREFIX}`);
  console.log(` 🩺 Health check: http://localhost:${PORT}${config.API_PREFIX}/health`);
  console.log(` 📚 Swagger docs: http://localhost:${PORT}${config.API_PREFIX}/docs`);
  console.log(`=======================================================`);
});

// Graceful shutdown handling
const shutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Gracefully shutting down Campus API...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await disconnectPrisma();
    console.log('Database connection closed.');
    process.exit(0);
  });

  // Force close after 10 seconds if graceful close hangs
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default server;
