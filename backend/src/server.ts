import Fastify from 'fastify';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const fastify = Fastify({ 
  logger: true 
});

// Health check endpoint
fastify.get('/health', async () => {
  return { 
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'swoosh-backend'
  };
});

// Root endpoint
fastify.get('/', async () => {
  return { 
    message: 'Swoosh API Server',
    version: '0.1.0'
  };
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`✅ Swoosh backend running on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
