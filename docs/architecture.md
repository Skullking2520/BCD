# 游戏虚拟道具交易平台架构设计文档

## 目录
1. [系统架构概述](#系统架构概述)
2. [技术架构](#技术架构)
3. [核心模块设计](#核心模块设计)
4. [数据架构](#数据架构)
5. [智能合约架构](#智能合约架构)
6. [API架构](#api架构)
7. [安全架构](#安全架构)
8. [部署架构](#部署架构)
9. [性能优化策略](#性能优化策略)

## 系统架构概述

游戏虚拟道具交易平台采用分层架构设计，将系统划分为表现层、业务逻辑层、数据访问层和区块链层，确保系统的可扩展性、可维护性和高性能。

### 架构原则
- **模块化设计**: 各功能模块独立开发和部署
- **去中心化**: 核心交易逻辑基于智能合约
- **高可用性**: 采用负载均衡和容错机制
- **可扩展性**: 支持水平扩展和功能扩展

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        用户界面层                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Web App   │  │ Mobile App  │  │   Game SDK  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                      API Gateway                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Auth Service│  │Rate Limiter │  │Load Balancer│        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                    业务逻辑层                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │Item Service │  │Trade Service│  │ User Service│        │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤        │
│  │Game Service │  │Price Service│  │ Notification│        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                    数据访问层                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ PostgreSQL  │  │    Redis    │  │    IPFS     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                    区块链层                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  NFT合约    │  │ 市场合约    │  │ 治理合约    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## 技术架构

### 前端技术栈
```
Frontend/
├── Framework: Next.js 14 (App Router)
├── UI Library: React 18
├── Styling: TailwindCSS + CSS Modules
├── State Management: Zustand
├── Blockchain Integration:
│   ├── Wagmi v2
│   ├── RainbowKit
│   └── Viem
├── Data Fetching: TanStack Query
├── Forms: React Hook Form + Zod
├── Charts: Recharts
└── Testing: Jest + React Testing Library
```

### 后端技术栈
```
Backend/
├── Runtime: Node.js 18+
├── Framework: Express.js
├── Database: PostgreSQL 17
├── Cache: Redis
├── Message Queue: Bull
├── File Storage: IPFS + AWS S3
├── Monitoring: Prometheus + Grafana
├── Logging: Winston + ELK Stack
└── Testing: Jest + Supertest
```

### 区块链技术栈
```
Blockchain/
├── Development: Hardhat
├── Language: Solidity 0.8.19
├── Standards:
│   ├── ERC-721 (Unique Items)
│   ├── ERC-1155 (Multi Items)
│   └── ERC-2981 (Royalties)
├── Libraries:
│   ├── OpenZeppelin
│   └── Chainlink
└── Testing: Hardhat Test + Chai
```

## 核心模块设计

### 1. 用户管理模块
```typescript
interface UserModule {
  // 用户认证
  authentication: {
    connectWallet(): Promise<User>
    disconnect(): Promise<void>
    verifySignature(message: string, signature: string): boolean
  }
  
  // 用户资料
  profile: {
    getProfile(address: string): Promise<UserProfile>
    updateProfile(data: UpdateProfileDto): Promise<UserProfile>
    uploadAvatar(file: File): Promise<string>
  }
  
  // 信誉系统
  reputation: {
    getScore(address: string): Promise<number>
    updateScore(address: string, change: number): Promise<void>
    getHistory(address: string): Promise<ReputationHistory[]>
  }
}
```

### 2. 道具管理模块
```typescript
interface ItemModule {
  // 道具查询
  query: {
    getItem(tokenId: string): Promise<GameItem>
    getItemsByOwner(owner: string): Promise<GameItem[]>
    getItemsByGame(gameId: number): Promise<GameItem[]>
    searchItems(filters: ItemFilters): Promise<PaginatedItems>
  }
  
  // 道具操作
  operations: {
    mintItem(data: MintItemDto): Promise<TransactionReceipt>
    transferItem(tokenId: string, to: string): Promise<TransactionReceipt>
    burnItem(tokenId: string): Promise<TransactionReceipt>
  }
  
  // 元数据管理
  metadata: {
    uploadImage(file: File): Promise<string>
    createMetadata(data: ItemMetadata): Promise<string>
    updateMetadata(tokenId: string, data: ItemMetadata): Promise<void>
  }
}
```

### 3. 交易管理模块
```typescript
interface TradeModule {
  // 市场挂单
  listing: {
    createListing(data: CreateListingDto): Promise<Listing>
    cancelListing(listingId: number): Promise<void>
    updatePrice(listingId: number, newPrice: bigint): Promise<void>
  }
  
  // 交易执行
  trading: {
    buyItem(listingId: number): Promise<TransactionReceipt>
    makeOffer(itemId: number, price: bigint): Promise<Offer>
    acceptOffer(offerId: number): Promise<TransactionReceipt>
  }
  
  // 拍卖功能
  auction: {
    createAuction(data: CreateAuctionDto): Promise<Auction>
    placeBid(auctionId: number, amount: bigint): Promise<Bid>
    endAuction(auctionId: number): Promise<TransactionReceipt>
  }
}
```

### 4. 游戏集成模块
```typescript
interface GameModule {
  // 游戏管理
  management: {
    registerGame(data: RegisterGameDto): Promise<Game>
    updateGame(gameId: number, data: UpdateGameDto): Promise<Game>
    verifyGame(gameId: number): Promise<void>
  }
  
  // SDK功能
  sdk: {
    initializeSDK(apiKey: string): GameSDK
    mintGameItem(itemData: GameItemData): Promise<string>
    queryUserItems(userAddress: string): Promise<GameItem[]>
  }
  
  // 数据同步
  sync: {
    syncItemData(gameId: number): Promise<void>
    webhookHandler(event: GameEvent): Promise<void>
  }
}
```

## 数据架构

### 数据库设计
参考 [database/init.sql](../database/init.sql) 文件中的完整数据库架构。

### 缓存策略
```yaml
Redis缓存层:
  - 热点数据缓存:
      - 道具详情: item:{tokenId} (TTL: 5分钟)
      - 用户资料: user:{address} (TTL: 10分钟)
      - 市场列表: market:listings:{page} (TTL: 1分钟)
  
  - 会话管理:
      - 用户会话: session:{sessionId} (TTL: 24小时)
      - API限流: rate:{ip}:{endpoint} (TTL: 1分钟)
  
  - 实时数据:
      - 价格更新: price:{itemId} (TTL: 30秒)
      - 在线用户: online:users (SET)
```

### 数据流设计
```
用户操作 → API请求 → 业务逻辑处理 → 区块链交互
                ↓                    ↓
            缓存更新            数据库持久化
                ↓                    ↓
            实时推送            事件日志记录
```

## 智能合约架构

### 合约结构
```solidity
contracts/
├── tokens/
│   ├── GameItemERC721.sol    // 独特道具NFT
│   ├── GameItemERC1155.sol   // 可堆叠道具NFT
│   └── ItemFactory.sol       // 道具工厂合约
├── marketplace/
│   ├── Marketplace.sol       // 市场主合约
│   ├── AuctionHouse.sol      // 拍卖功能
│   └── OfferManager.sol      // 报价管理
├── governance/
│   ├── GameRegistry.sol      // 游戏注册
│   └── FeeManager.sol        // 手续费管理
└── utils/
    ├── Pausable.sol          // 暂停功能
    ├── ReentrancyGuard.sol   // 防重入
    └── AccessControl.sol     // 权限控制
```

### 合约交互流程
```
用户钱包 → 前端DApp → 智能合约 → 区块链
    ↑                       ↓
    └── 交易确认 ← 事件监听 ←┘
```

## API架构

### RESTful API设计
```
/api/v1/
├── /auth
│   ├── POST   /connect         # 钱包连接
│   └── POST   /disconnect      # 断开连接
├── /users
│   ├── GET    /:address        # 获取用户信息
│   ├── PUT    /profile         # 更新资料
│   └── GET    /:address/items  # 用户道具
├── /items
│   ├── GET    /               # 道具列表
│   ├── GET    /:tokenId       # 道具详情
│   └── POST   /search         # 搜索道具
├── /market
│   ├── GET    /listings       # 市场列表
│   ├── POST   /listings       # 创建挂单
│   ├── DELETE /listings/:id   # 取消挂单
│   └── POST   /buy/:id        # 购买道具
├── /games
│   ├── GET    /               # 游戏列表
│   ├── GET    /:id            # 游戏详情
│   └── GET    /:id/items      # 游戏道具
└── /analytics
    ├── GET    /market-stats   # 市场统计
    ├── GET    /price-history  # 价格历史
    └── GET    /trending       # 热门排行
```

### WebSocket实时通信
```javascript
// 事件类型
const EVENTS = {
  // 市场事件
  'market:new-listing': { listingId, item, price },
  'market:item-sold': { listingId, buyer, seller, price },
  'market:price-update': { itemId, oldPrice, newPrice },
  
  // 拍卖事件
  'auction:new-bid': { auctionId, bidder, amount },
  'auction:ended': { auctionId, winner, finalPrice },
  
  // 用户事件
  'user:item-received': { userId, itemId },
  'user:offer-received': { userId, offerId, amount }
}
```

## 安全架构

### 智能合约安全
- **审计措施**: 第三方安全审计
- **防护机制**:
  - 重入攻击防护
  - 整数溢出检查
  - 权限访问控制
  - 紧急暂停机制

### API安全
- **认证授权**: JWT + 钱包签名
- **访问控制**: RBAC权限模型
- **限流策略**: IP + 用户级别限流
- **数据加密**: HTTPS + 字段级加密

### 前端安全
- **XSS防护**: Content Security Policy
- **CSRF防护**: SameSite Cookie
- **钱包安全**: 只请求必要权限
- **输入验证**: 客户端 + 服务端双重验证

## 部署架构

### 开发环境
```yaml
services:
  frontend:
    image: node:18-alpine
    ports: ["3000:3000"]
    environment:
      - NODE_ENV=development
  
  backend:
    image: node:18-alpine
    ports: ["3001:3001"]
    depends_on: [postgres, redis]
  
  postgres:
    image: postgres:17
    ports: ["5433:5432"]
  
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  
  hardhat:
    image: ethereum/client-go
    ports: ["8545:8545"]
```

### 生产环境
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Cloudflare│────▶│   Nginx     │────▶│   Frontend  │
│     CDN     │     │ (反向代理)   │     │   (Next.js) │
└─────────────┘     └─────────────┘     └─────────────┘
                            │
                    ┌───────┴────────┐
                    │                │
            ┌───────▼──────┐ ┌──────▼───────┐
            │  API Server  │ │  API Server  │
            │   (Node.js)  │ │   (Node.js)  │
            └───────┬──────┘ └──────┬───────┘
                    │                │
        ┌───────────┴────────────────┴───────────┐
        │                                        │
┌───────▼──────┐  ┌────────────┐  ┌────────────▼────────┐
│  PostgreSQL  │  │   Redis    │  │   IPFS Cluster     │
│   (主从)     │  │  (集群)    │  │   (分布式存储)     │
└──────────────┘  └────────────┘  └─────────────────────┘
```

## 性能优化策略

### 前端优化
- **代码分割**: 动态导入 + 路由懒加载
- **资源优化**: 图片压缩 + WebP格式
- **缓存策略**: Service Worker + HTTP缓存
- **渲染优化**: SSG/SSR + 增量静态再生

### 后端优化
- **数据库优化**:
  - 索引优化
  - 查询优化
  - 连接池管理
  - 读写分离

- **缓存优化**:
  - 多级缓存
  - 缓存预热
  - 缓存更新策略

- **并发处理**:
  - 异步处理
  - 消息队列
  - 负载均衡

### 区块链优化
- **Gas优化**:
  - 批量操作
  - 存储优化
  - 计算优化

- **扩展方案**:
  - Layer2集成
  - 侧链方案
  - 状态通道

## 监控和运维

### 监控指标
```yaml
应用监控:
  - API响应时间
  - 错误率
  - 并发请求数
  - 内存/CPU使用率

区块链监控:
  - Gas价格
  - 交易确认时间
  - 合约调用频率
  - 事件日志

业务监控:
  - 日活跃用户
  - 交易量
  - 成交额
  - 新增道具数
```

### 告警机制
- **严重告警**: 服务宕机、数据库异常
- **高级告警**: API错误率高、响应时间长
- **中级告警**: 磁盘空间不足、内存使用高
- **低级告警**: 日常维护提醒

## 总结

本架构设计充分考虑了游戏虚拟道具交易平台的业务需求和技术挑战，采用模块化、去中心化的设计理念，确保系统的安全性、可扩展性和高性能。通过合理的技术选型和架构设计，为用户提供安全、高效、友好的交易体验。 