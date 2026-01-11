# Swoosh Frontend

React + TypeScript frontend for Swoosh cross-chain intent solver.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling with custom design system
- **Wagmi v2** for Ethereum interactions
- **RainbowKit** for wallet connection
- **TanStack Query** for server state management
- **React Router** for navigation
- **Framer Motion** for animations

## Getting Started

### Prerequisites

- Node.js 22.12+ or 20.19+
- npm or yarn

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```
VITE_API_URL=http://localhost:3000
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

Get a WalletConnect Project ID from: https://cloud.walletconnect.com

### Development

```bash
npm run dev
```

Open http://localhost:5173

### Build

```bash
npm run build
```

## Project Structure

```
src/
├── components/     # Reusable UI components
│   └── layout/     # Layout components
├── pages/          # Page components
├── hooks/          # Custom React hooks
├── lib/            # Utility functions
├── types/          # TypeScript types
├── config/         # Configuration files
├── App.tsx         # Main app with routing
├── main.tsx        # Entry point with providers
└── index.css       # Global styles
```

## Design System

- CSS variables for theming
- 4px spacing scale
- Primary color: Indigo (#6366f1)
- Dark mode support

## Supported Chains

- Arbitrum Sepolia (testnet)
- Base Sepolia (testnet)

## License

MIT
