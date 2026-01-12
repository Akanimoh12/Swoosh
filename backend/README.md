# Swoosh Backend

AI-powered cross-chain intent solver backend built with Node.js, Fastify, Prisma, and OpenAI.

## Features

- 🤖 **AI Intent Parsing**: Natural language to structured intents using GPT-4
- 🛣️ **Route Optimization**: Optimal cross-chain execution paths with cost estimation
- 💾 **PostgreSQL Database**: Type-safe queries with Prisma ORM
- ⚡ **Redis Caching**: Fast caching for routes, prices, and similar intents
- 🔌 **WebSocket Support**: Real-time intent status updates
- 📊 **Structured Logging**: JSON logging with Pino
- 🔒 **Rate Limiting**: 100 requests/minute per IP
- 🏥 **Health Checks**: Database and Redis connectivity monitoring

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- OpenAI API key

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `OPENAI_API_KEY`: Your OpenAI API key

### 3. Database Setup

Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

To open Prisma Studio (database GUI):

```bash
npm run prisma:studio
```

### 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### Health Check

```bash
GET /health
GET /health/detailed
```

### Parse Intent

```bash
POST /api/intents/parse
Content-Type: application/json

{
  "text": "Send 100 USDC to Base",
  "userAddress": "0x..."
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "cuid...",
    "parsed": {
      "action": "bridge",
      "sourceChain": 42161,
      "destinationChain": 8453,
      "tokenIn": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      "amount": "100000000",
      "recipient": "0x...",
      "slippageTolerance": 0.5
    }
  }
}
```

### Optimize Route

```bash
POST /api/intents/route
Content-Type: application/json

{
  "intent": { /* parsed intent object */ },
  "userAddress": "0x..."
}
```

Response:
```json
{
  "success": true,
  "data": {
    "steps": [...],
    "totalCost": "0.650000",
    "estimatedTime": 300,
    "confidence": 90
  }
}
```

### Get Intent Status

```bash
GET /api/intents/:id/status
```

### WebSocket - Real-time Updates

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/intents/:id');

ws.on('message', (data) => {
  const update = JSON.parse(data);
  console.log(update);
});
```

## Architecture

```
backend/
├── src/
│   ├── config/         # Environment configuration with Zod validation
│   ├── db/             # Database clients (Prisma, Redis)
│   ├── routes/         # API route handlers
│   ├── services/       # Business logic (parser, optimizer)
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions (logger)
│   └── index.ts        # Server entry point
├── prisma/
│   └── schema.prisma   # Database schema
└── package.json
```

## Development

### Run Tests

```bash
npm test
npm run test:coverage
```

### Lint Code

```bash
npm run lint
```

### Format Code

```bash
npm run format
```

### Build for Production

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection | Required |
| `REDIS_URL` | Redis connection | Required |
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `OPENAI_MODEL` | GPT model | `gpt-4-turbo-preview` |
| `OPENAI_TIMEOUT` | API timeout (ms) | `5000` |
| `RATE_LIMIT_MAX` | Max requests | `100` |
| `RATE_LIMIT_WINDOW` | Window (ms) | `60000` |
| `CACHE_TTL_ROUTES` | Route cache TTL (s) | `300` |
| `CACHE_TTL_TOKEN_PRICES` | Token price TTL (s) | `60` |
| `CACHE_TTL_GAS_PRICES` | Gas price TTL (s) | `30` |
| `CORS_ORIGIN` | Allowed origin | `http://localhost:5173` |

## Database Schema

### Intents Table
- `id`: Unique identifier (CUID)
- `userAddress`: Wallet address
- `rawInput`: Original text input
- `parsedData`: Structured intent (JSON)
- `status`: PENDING | PROCESSING | COMPLETED | FAILED
- `createdAt`, `updatedAt`: Timestamps

### Routes Table
- `id`: Unique identifier (CUID)
- `intentId`: Foreign key to Intent
- `intentHash`: Hash for caching
- `routeData`: Route steps (JSON)
- `costEstimate`: Estimated cost in USD
- `estimatedTime`: Execution time (seconds)
- `expiration`: Route validity
- `isSelected`: Boolean flag

Indexes:
- `idx_user_created`: (userAddress, createdAt)
- `idx_status_created`: (status, createdAt)
- `idx_intent_hash`: (intentHash)

## Caching Strategy

- **Routes**: 5 minutes TTL (per intent hash)
- **Token Prices**: 1 minute TTL (per token/chain)
- **Gas Prices**: 30 seconds TTL (per chain)
- **Similar Intents**: 5 minutes TTL (per input hash)

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "requestId": "uuid"
}
```

HTTP status codes:
- `200`: Success
- `400`: Bad request
- `404`: Not found
- `429`: Rate limit exceeded
- `500`: Internal server error
- `503`: Service unavailable

## Performance

- Request logging with timing
- Database query logging in development
- Redis cache hit rate monitoring
- Rate limiting per IP
- Graceful shutdown handling

## Phase 1 Limitations

This is the Phase 1 implementation with the following limitations:

- ✅ AI intent parsing with GPT-4
- ✅ Fallback regex parsing
- ✅ Database schema and migrations
- ✅ Redis caching layer
- ✅ Route optimization logic
- ⏳ 1inch API integration (stubbed)
- ⏳ CCIP fee calculation (estimated)
- ⏳ Real-time price oracles (stubbed)
- ⏳ Transaction execution

Phase 2 will add full external integrations and transaction execution.

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

MIT
