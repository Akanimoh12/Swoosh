# Swoosh

**Cross-chain transfers, simplified.**

Swoosh lets you move crypto between blockchains using plain English. No bridges, no complexity, no headaches—just type what you want, and we handle the rest.

---

## The Problem

Moving assets between blockchains shouldn't require a PhD. But today it does:

- **Too many steps**: Connect wallet, find bridge, swap tokens, wait, switch networks, claim tokens. Exhausting.
- **Confusing interfaces**: Which bridge is safe? What's slippage? Why do I need gas on a chain I don't use?
- **Expensive mistakes**: Wrong token address? Insufficient gas on destination? Your funds are stuck.
- **Hidden costs**: Bridge fees, swap fees, gas fees—on both chains. The final cost is never what you expected.

We've all been there. It's 2026, and moving $100 between chains still feels like filing taxes.

---

## Our Solution

Swoosh turns complex cross-chain operations into simple conversations.

**Just type what you want:**
- "Send 100 USDC to Base"
- "Bridge my ETH to Optimism"
- "Move 500 USDT to Arbitrum"

Swoosh understands your intent, finds the optimal route, and executes everything in one transaction. You approve once, we handle the rest.

### How It Works

**Step 1: Tell us what you want**  
Type your intent in plain English. Our AI understands natural language—no need to remember token addresses or chain IDs.

**Step 2: Review the route**  
We show you exactly what will happen: which tokens will be swapped, which bridge will be used, total cost, and estimated time. Everything transparent, nothing hidden.

**Step 3: Approve once**  
One wallet approval, one transaction. No manual bridge interactions, no network switching, no claiming on the other side.

**Step 4: Track in real-time**  
Watch your transaction progress across chains. We notify you at every step: swap complete, bridge initiated, funds arrived.

That's it. What used to take 20 minutes and 8 clicks now takes 2 minutes and 1 approval.

---

## Why Swoosh?

**Actually Simple**  
No crypto jargon. No confusing forms. Just tell us what you want in plain English, like you'd text a friend.

**Radically Cheaper**  
Our smart contracts are written in Rust on Arbitrum Stylus, using 50-90% less gas than traditional bridges. Those savings go directly to you.

**Built to Trust**  
We use Chainlink CCIP for cross-chain messaging—the same infrastructure securing billions in DeFi. Your funds are safe, period.

**Honest Pricing**  
You see the total cost upfront: gas fees, bridge fees, everything. No surprises, no hidden charges. What you see is what you pay.

**Human Support**  
Stuck transaction? Confused about something? We're here to help. Real people, real responses.

---

## Built With

We combined the best technologies to make Swoosh possible:

**Arbitrum Stylus** for ultra-efficient smart contracts written in Rust  
**Chainlink CCIP** for secure cross-chain messaging  
**AI-powered intent parsing** to understand natural language  
**1inch aggregation** for optimal swap routes  

The result: a system that's faster, cheaper, and more reliable than anything else out there.

---

## Getting Started

### Try It Now

Visit [swoosh.app](https://swoosh.app) and connect your wallet. We support MetaMask, Coinbase Wallet, WalletConnect, and more.

**Supported Networks (Testnet)**  
- Arbitrum Sepolia  
- Base Sepolia  
- Optimism Sepolia (coming soon)

**Supported Tokens**  
USDC, USDT, ETH, WETH, DAI

Need testnet tokens? Visit [Arbitrum faucet](https://faucet.quicknode.com/arbitrum/sepolia) to get started.

### For Developers

Want to integrate Swoosh or run it locally? Check out our developer documentation:

- **[Development Guide](./docs/DEVELOPMENT.md)** - Complete setup and build instructions
- **[Phase Prompts](./PROMPTS_GUIDE.md)** - Step-by-step development roadmap
- **[API Documentation](./docs/API.md)** - REST and WebSocket API reference
- **[Architecture](./docs/ARCHITECTURE.md)** - System design and technical decisions

**Quick Start**

```bash
# Clone the repository
git clone https://github.com/swoosh-protocol/swoosh.git
cd swoosh

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

---

## Roadmap

**Q1 2026** (Now)  
Launch on Arbitrum testnet with Base support. Gather feedback, improve UX, squash bugs.

**Q2 2026**  
Mainnet launch. Add Optimism and Polygon support. Introduce gas fee predictions.

**Q3 2026**  
Multi-intent batching ("Send USDC to Base AND swap ETH on Optimism" in one go). Advanced scheduling features.

**Q4 2026**  
Intent marketplace where solvers compete for your transaction. Mobile app launch.

---

## Security

Your security is our priority. Here's how we protect you:

- **Audited smart contracts** - Reviewed by independent security firms before mainnet
- **Non-custodial** - We never hold your funds. You're in control at all times
- **Open source** - All code is public and verifiable on GitHub
- **Bug bounty** - Find a vulnerability? We reward responsible disclosure
- **Rate limiting** - Protection against spam and abuse

Found a security issue? Please email security@swoosh.app. We respond within 24 hours.

---

## FAQ

**Is Swoosh safe to use?**  
Yes. We use battle-tested infrastructure (Chainlink CCIP) and our contracts are audited. Your funds never leave your control until you explicitly approve a transaction.

**How much does it cost?**  
You pay gas fees (usually $1-3 on Arbitrum) plus bridge fees (typically 0.1-0.3%). No hidden charges—we show you the total cost before you approve.

**How long does a transfer take?**  
Most transfers complete in 3-10 minutes depending on network congestion. Cross-chain messaging via CCIP takes 2-5 minutes on average.

**What if something goes wrong?**  
If a transaction fails, we automatically refund your tokens. You can also contact support at help@swoosh.app and we'll investigate immediately.

**Can I cancel a transaction?**  
Before approval: yes, just close the window. After approval: no, the transaction is on-chain and irreversible. Choose wisely!

**Do you support mobile?**  
Yes! Swoosh works on mobile browsers. Connect using WalletConnect or your mobile wallet's browser.

---

## Community

**Twitter**: [@SwooshProtocol](https://twitter.com/swooshprotocol)  
**Discord**: [Join our server](https://discord.gg/swoosh)  
**GitHub**: [github.com/swoosh-protocol](https://github.com/swoosh-protocol)  
**Email**: hello@swoosh.app

Have questions? Ideas? Just want to chat? We'd love to hear from you.

---

## Contributing

Swoosh is open source and we welcome contributions! Whether you're fixing bugs, adding features, improving docs, or suggesting ideas—we appreciate your help.

**Ways to contribute:**
- Report bugs or suggest features in [GitHub Issues](https://github.com/swoosh-protocol/swoosh/issues)
- Submit pull requests (check our [Contributing Guide](./CONTRIBUTING.md) first)
- Improve documentation
- Help answer questions in Discord
- Share Swoosh with friends who hate bridge complexity

---

## Built by Humans, Powered by AI

Swoosh was built for the [Arbitrum APAC Mini Hackathon 2026](https://hackquest.io). We're a small team frustrated by how hard cross-chain transfers are, and we decided to fix it.

We used AI to help us write code faster and understand natural language, but every decision, every design choice, every line of code was reviewed and approved by humans. Because good tools make us more productive, but they don't replace thinking.

---

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

**Make cross-chain simple. Try Swoosh today.**

[Get Started](https://swoosh.app) • [Read the Docs](./docs) • [Join Discord](https://discord.gg/swoosh)
