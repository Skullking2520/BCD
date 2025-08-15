# Game Item Marketplace — Tech & Feature Map

An end-to-end game item exchange DApp using ERC-721/1155, EIP-712 gasless listing, L2 payment and IPFS metadata hash indexing. To this end, this README is a feature ↔ tool mapping, so reviewers can easily see what part is using what tool.

---

## 1) Stack at a Glance

| Layer           | Tools / Libraries                                                                                  | Purpose                                                 |
| --------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Smart contracts | Hardhat, OpenZeppelin (ERC-721/1155,AccessControl, ReentrancyGuard, Pausable, EIP-2981), Solidity  | Standards, security of tokens, local chain, deploy/tests|
| Frontend        | Next.js w/ React + Wagmi + RainbowKit, viem/ethers, TypeScript                                     | Typed contract calls, EIP-1193 provider, Wallet connect |
| Backend         | Node.js (Express), postgreSQL, Redis, (Prisma/Knex)                                                | Search API/Index, the order storage (off chain), caching|
| Storage         | IPFS (CIDs, pinning service)                                                                       | Verifiable metadata                                     |
| Tooling         | Dotenv, ESLint/Prettier, solhint, solidity-coverage and hardhat-gas-reporter                       | Config, linting, coverage, gas profiling                |
| Diagrams        | Mermaid / PNG in docs/                                                                             | Architecture, Cumulative figures in docs/UI review      |

---

## 2) Repository Structure & Roles

```
.
├─ frontend/                 # Next.js app (UI + wallet + contract writes)
│  ├─ app|pages/             # Routes: /market, /sell, /item/[id], /inventory, /admin
│  ├─ components/            # ListingCard, CreateListingForm, WalletButton, etc.
│  ├─ lib/                    # wagmi/viem config, ABIs, helpers (EIP-712 typing)
│  └─ .env.local.example
│
├─ backend/                  # Express API (indices & analytics; no custody)
│  ├─ src/
│  │  ├─ routes/             # /api/listings, /api/cancel, /api/collections, /api/flags
│  │  ├─ services/           # signature verify, schema validation, IPFS helpers
│  │  ├─ db/                 # Prisma/Knex queries
│  │  ├─ workers/            # indexers, wash-trade heuristics
│  │  └─ middlewares/        # CORS, rate limit, error handling
│  └─ .env.example
│
├─ hardhat/                  # Solidity contracts, scripts, tests
│  ├─ contracts/
│  │  ├─ GameItem.sol        # ERC-721/1155 items (+ optional EIP-2981)
│  │  ├─ Marketplace.sol     # Fixed price + English auction (soft-close) + escrow
│  │  └─ GameRegistry.sol    # Verified collections/games; roles & gating
│  ├─ scripts/               # deploy.ts, seed
│  ├─ test/                  # mocha/chai tests (events, RBAC, reentrancy)
│  └─ .env.example
│
└─ docs/                     # Diagrams, figures
   └─ img/architecture.png   # Figure 1 (architecture)
```

**Responsibilities**

- **frontend/**: wallet connect, listing forms (EIP-712 sign), marketplace views, contract writes (buy/bid/fulfill).
- **backend/**: index/search endpoints, signature schema checks, IPFS helpers, moderation & flags; **not a source of truth**.
- **hardhat/**: asset & marketplace logic (settlement, royalties, auctions), deployment & tests.

---

## 3) Feature → Tool Mapping

| Feature                               | Where                                                        | Tools used                              | Notes                                                       |
| ------------------------------------- | ------------------------------------------------------------ | --------------------------------------- | ----------------------------------------------------------- |
| Wallet connect (non-custodial)        | `frontend/*`                                                 | RainbowKit, Wagmi, EIP-1193             | Multi-wallet UI, signer for EIP-712/tx                      |
| EIP-712 gasless listing & cancel      | `frontend/lib/*`, `backend/src/routes/*`                     | Wagmi/viem (signTypedData), Express, DB | Client signs typed data → API; no on-chain write until fill |
| On-chain settlement (buy/bid/fulfill) | `frontend/components/*`, `hardhat/contracts/Marketplace.sol` | viem/ethers, Solidity, Hardhat          | Verify EIP-712 digest, atomic transfers                     |
| Fixed price sales                     | `Marketplace.sol`                                            | Solidity                                | Escrow & payout (fees/royalties)                            |
| English auction (soft-close)          | `Marketplace.sol`                                            | Solidity                                | Extend endTime near deadline to curb sniping                |
| Royalties (optional)                  | `GameItem.sol`                                               | OpenZeppelin, EIP-2981                  | Standard royalty interface                                  |
| Item standards                        | `GameItem.sol`                                               | OpenZeppelin ERC-721/1155               | Unique vs. stackable items                                  |
| Access control / Ops                  | `*.sol`                                                      | OZ AccessControl, Pausable              | Fee params, pause switch, gated publish/mint                |
| Reentrancy protection                 | `*.sol`                                                      | OZ ReentrancyGuard                      | Protects external value-flow paths                          |
| Metadata (CID)                        | `GameItem.sol`, `backend/src/services/*`                     | IPFS (pinning API/gateway)              | `tokenURI` → IPFS CID; only CID on-chain                    |
| Event-sourced indexing                | `backend/src/workers/*`                                      | viem/ethers, Redis, Postgres            | Consume events → update indices                             |
| Wash-trade heuristics & flags         | `backend/src/workers/*`, `backend/src/routes/flags.*`        | Node workers, Redis, Postgres           | Loop/self-trade detection; moderation endpoints             |
| Search & browse                       | `backend/src/routes/listings.*`, `frontend/app               | pages/\*`                               | Express, Postgres, Redis                                    | Query by collection, price, time       |
| Admin / moderation                    | `frontend/app                                                | pages/admin\*`, routes                  | Frontend table, flags API                                   | Review flags, hide spam, unblock users |
| Testing                               | `hardhat/test/*`                                             | Mocha/Chai, solidity-coverage           | Events, role gates, escrow invariants                       |
| Gas profiling                         | `hardhat.config.*`                                           | hardhat-gas-reporter                    | Per-method gas costs                                        |
| Lint / format                         | root configs                                                 | ESLint/Prettier, solhint                | Consistent TS/Solidity style                                |

---

## 4) How Core Features Work

### 4.1 EIP-712 Listing (Gasless)

**Tools**: Wagmi/viem (`signTypedData`), Express, Postgres  
**Flow**: Build typed data → user signs → POST `{order, signature}` to `/api/listings` → server validates & stores `order_hash` → searchable listing; **no gas** until fill.

### 4.2 Fulfill (Atomic Settlement)

**Tools**: viem/ethers, Solidity, Hardhat  
**Flow**: `fulfill(order, signature)` verifies domain & digest, checks time/nonce, then transfers **payment → seller/royalty/fee** and **item → buyer**. Emits events for indexers (CEI + `nonReentrant`).

### 4.3 English Auction with Soft-Close

**Where**: `Marketplace.sol`  
**Logic**: if a bid arrives within the soft-close window (e.g., last 10 minutes), extend `endTime` by the window; refund prior top-bidder; settle atomically at end.

### 4.4 Royalties (EIP-2981)

**Where**: `GameItem.sol`  
Marketplace reads `royaltyInfo(tokenId, salePrice)`; routes payouts in settlement.

### 4.5 Metadata via IPFS (CID)

**Where**: `GameItem.sol`, `backend/src/services/ipfs.*`  
Token URI points to immutable CID; backend can assist pin/unpin, but never holds user assets/keys.

### 4.6 Indexing & Integrity

**Where**: `backend/src/workers/*`  
Consume chain events → update `listings/fills` tables → compute heuristics (loop trades, reciprocity, outlier prices) → write `flags` → admin UI surfaces them.

---

## 5) API Surface (Frontend ↔ Local DB)

**Listings**

- `POST /api/listings` — store signed EIP-712 order (index only).
- `GET /api/listings?status=live&sort=priceAsc` — browse/search.

**Cancel**

- `POST /api/cancel` — store cancel intent; UI may also use on-chain counter invalidation.

**Collections**

- `GET /api/collections/:address` — stats (volumes, owners, top items).

**Flags**

- `GET /api/flags?subject=0x...` — read flags.
- `POST /api/flags` — report suspicious activity (rate-limited).

> Source of truth is **on-chain**; DB is for indices & analytics.

---

## 6) Setup (Local Dev)

1. **Contracts**

```bash
cd hardhat
npm i
npx hardhat compile
npx hardhat node
npx hardhat run scripts/deploy.ts --network localhost
```

2. **Backend**

```bash
cd backend
npm i
npm run migrate
npm run dev    # http://127.0.0.1:4000
```

3. **Frontend**

```bash
cd frontend
npm i
npm run dev    # http://127.0.0.1:3000
```

**Environment**

- `frontend/.env.local`: `NEXT_PUBLIC_RPC_URL`, `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_API_BASE`
- `backend/.env`: `DATABASE_URL`, `REDIS_URL`, `IPFS_GATEWAY`, `PINNING_SERVICE_*`, `PORT`
- `hardhat/.env`: `PRIVATE_KEY`, RPC URLs

---

## 7) Testing & Quality

- Contracts: `hardhat test` (Mocha/Chai) + `solidity-coverage`
- Gas: `hardhat-gas-reporter`
- Lint: `solhint` (Solidity), `eslint/prettier` (TS/JS)

---

## 8) Security Notes

- Non-custodial: server never holds keys/funds
- Guards: `nonReentrant`, CEI, `Pausable`
- Roles: separate admin vs ops; time-lock recommended
- API: schema validation + rate limiting + strict CORS in dev
