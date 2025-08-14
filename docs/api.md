# 游戏虚拟道具交易平台 API 文档

## 目录
1. [概述](#概述)
2. [认证](#认证)
3. [API基础信息](#api基础信息)
4. [用户相关API](#用户相关api)
5. [道具相关API](#道具相关api)
6. [市场交易API](#市场交易api)
7. [游戏管理API](#游戏管理api)
8. [数据分析API](#数据分析api)
9. [WebSocket API](#websocket-api)
10. [错误处理](#错误处理)

## 概述

本文档描述了游戏虚拟道具交易平台的RESTful API接口规范。所有API遵循REST设计原则，使用JSON格式传输数据。

### API版本
- 当前版本: v1
- 基础URL: `https://api.gameitemstrading.com/api/v1`

### 请求格式
- Content-Type: `application/json`
- 字符编码: `UTF-8`

### 响应格式
```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1640995200000
}
```

## 认证

### 钱包连接认证

**请求签名流程:**
1. 前端请求获取随机nonce
2. 用户使用钱包签名消息
3. 发送签名到后端验证
4. 获取JWT token

### 获取Nonce

```http
GET /auth/nonce?address={walletAddress}
```

**响应示例:**
```json
{
  "code": 200,
  "data": {
    "nonce": "random-nonce-string",
    "message": "Sign this message to authenticate: random-nonce-string"
  }
}
```

### 验证签名

```http
POST /auth/connect
```

**请求体:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bd8e",
  "signature": "0x...",
  "message": "Sign this message to authenticate: random-nonce-string"
}
```

**响应示例:**
```json
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bd8e",
      "username": "player123",
      "avatar_url": "https://ipfs.io/ipfs/..."
    }
  }
}
```

### 断开连接

```http
POST /auth/disconnect
Authorization: Bearer {token}
```

## API基础信息

### 请求头
```http
Authorization: Bearer {token}
Content-Type: application/json
Accept: application/json
```

### 分页参数
- `page`: 页码，默认1
- `limit`: 每页数量，默认20，最大100
- `sort`: 排序字段
- `order`: 排序方向 (asc/desc)

### 通用查询参数
- `search`: 搜索关键词
- `filter`: 过滤条件（JSON格式）

## 用户相关API

### 获取用户信息

```http
GET /users/{address}
```

**响应示例:**
```json
{
  "code": 200,
  "data": {
    "id": 1,
    "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bd8e",
    "username": "player123",
    "avatar_url": "https://ipfs.io/ipfs/...",
    "bio": "Passionate gamer and collector",
    "reputation_score": 95,
    "created_at": "2024-01-01T00:00:00Z",
    "stats": {
      "total_items": 150,
      "total_trades": 45,
      "total_volume": "125.5"
    }
  }
}
```

### 更新用户资料

```http
PUT /users/profile
Authorization: Bearer {token}
```

**请求体:**
```json
{
  "username": "newUsername",
  "bio": "Updated bio",
  "email": "user@example.com"
}
```

### 上传头像

```http
POST /users/avatar
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**请求参数:**
- `avatar`: 图片文件 (支持 jpg, png, gif，最大5MB)

### 获取用户道具

```http
GET /users/{address}/items?page=1&limit=20&game_id=1&rarity=epic
```

**响应示例:**
```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": 1,
        "token_id": "12345",
        "name": "Legendary Sword",
        "game": {
          "id": 1,
          "name": "Legend of Valor"
        },
        "rarity": "legendary",
        "image_url": "https://ipfs.io/ipfs/...",
        "attributes": {
          "attack": 150,
          "durability": 100
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "total_pages": 8
    }
  }
}
```

### 获取收藏列表

```http
GET /users/{address}/favorites
Authorization: Bearer {token}
```

## 道具相关API

### 获取道具列表

```http
GET /items?game_id=1&rarity=epic&min_price=0.1&max_price=10&sort=price&order=asc
```

**查询参数:**
- `game_id`: 游戏ID
- `category`: 道具类别 (weapon/armor/consumable等)
- `rarity`: 稀有度 (common/rare/epic/legendary/mythic)
- `min_price`: 最低价格
- `max_price`: 最高价格
- `on_sale`: 是否在售 (true/false)

### 获取道具详情

```http
GET /items/{tokenId}
```

**响应示例:**
```json
{
  "code": 200,
  "data": {
    "id": 1,
    "token_id": "12345",
    "contract_address": "0x...",
    "name": "Legendary Sword",
    "description": "A powerful sword forged by ancient masters",
    "image_url": "https://ipfs.io/ipfs/...",
    "game": {
      "id": 1,
      "name": "Legend of Valor",
      "logo_url": "https://..."
    },
    "owner": {
      "address": "0x...",
      "username": "player123"
    },
    "attributes": {
      "attack": 150,
      "defense": 50,
      "durability": 100,
      "special_effect": "Fire damage +20%"
    },
    "rarity": "legendary",
    "level_requirement": 50,
    "listing": {
      "id": 101,
      "price": "5.5",
      "currency": "ETH",
      "type": "fixed",
      "expires_at": "2024-12-31T23:59:59Z"
    },
    "price_history": [
      {
        "price": "4.2",
        "date": "2024-01-15T10:00:00Z"
      }
    ]
  }
}
```

### 搜索道具

```http
POST /items/search
```

**请求体:**
```json
{
  "query": "sword",
  "filters": {
    "games": [1, 2],
    "categories": ["weapon"],
    "rarities": ["epic", "legendary"],
    "price_range": {
      "min": 0.1,
      "max": 10
    },
    "attributes": {
      "min_attack": 100
    }
  },
  "sort": {
    "field": "price",
    "order": "asc"
  },
  "pagination": {
    "page": 1,
    "limit": 20
  }
}
```

### 获取道具价格历史

```http
GET /items/{tokenId}/price-history?days=30
```

**响应示例:**
```json
{
  "code": 200,
  "data": {
    "prices": [
      {
        "price": "5.5",
        "timestamp": "2024-01-20T10:00:00Z",
        "transaction_id": 1001
      }
    ],
    "stats": {
      "current_price": "5.5",
      "avg_price": "4.8",
      "min_price": "3.2",
      "max_price": "6.0",
      "price_change_24h": "+5.2%"
    }
  }
}
```

## 市场交易API

### 创建挂单

```http
POST /market/listings
Authorization: Bearer {token}
```

**请求体:**
```json
{
  "item_id": 1,
  "price": "5.5",
  "currency": "ETH",
  "type": "fixed",
  "duration": 7,
  "signature": "0x..."
}
```

### 获取市场列表

```http
GET /market/listings?status=active&type=fixed&sort=created_at&order=desc
```

**查询参数:**
- `status`: 状态 (active/sold/expired/cancelled)
- `type`: 类型 (fixed/auction/offer)
- `seller`: 卖家地址

### 购买道具

```http
POST /market/buy/{listingId}
Authorization: Bearer {token}
```

**请求体:**
```json
{
  "signature": "0x...",
  "transaction_hash": "0x..."
}
```

### 取消挂单

```http
DELETE /market/listings/{listingId}
Authorization: Bearer {token}
```

### 创建拍卖

```http
POST /market/auctions
Authorization: Bearer {token}
```

**请求体:**
```json
{
  "item_id": 1,
  "starting_price": "1.0",
  "min_increment": "0.1",
  "buyout_price": "10.0",
  "duration": 24,
  "signature": "0x..."
}
```

### 参与竞拍

```http
POST /market/auctions/{auctionId}/bid
Authorization: Bearer {token}
```

**请求体:**
```json
{
  "amount": "2.5",
  "signature": "0x..."
}
```

### 创建报价

```http
POST /market/offers
Authorization: Bearer {token}
```

**请求体:**
```json
{
  "item_id": 1,
  "price": "4.0",
  "expires_in": 24,
  "message": "I really want this item!",
  "signature": "0x..."
}
```

## 游戏管理API

### 获取游戏列表

```http
GET /games?verified=true&sort=popularity&order=desc
```

**响应示例:**
```json
{
  "code": 200,
  "data": {
    "games": [
      {
        "id": 1,
        "name": "Legend of Valor",
        "developer": "Epic Studios",
        "description": "A fantasy MMORPG...",
        "logo_url": "https://...",
        "is_verified": true,
        "stats": {
          "total_items": 10000,
          "active_players": 5000,
          "total_volume": "1250.5"
        }
      }
    ]
  }
}
```

### 获取游戏详情

```http
GET /games/{gameId}
```

### 获取游戏道具类型

```http
GET /games/{gameId}/item-types
```

### 注册新游戏 (开发者)

```http
POST /games
Authorization: Bearer {token}
```

**请求体:**
```json
{
  "name": "New Game",
  "developer": "My Studio",
  "description": "Game description",
  "logo_url": "https://...",
  "website": "https://mygame.com",
  "contract_address": "0x..."
}
```

## 数据分析API

### 获取市场统计

```http
GET /analytics/market-stats
```

**响应示例:**
```json
{
  "code": 200,
  "data": {
    "total_volume_24h": "2500.5",
    "total_transactions_24h": 1250,
    "average_price": "5.2",
    "unique_buyers_24h": 450,
    "unique_sellers_24h": 320,
    "top_games": [
      {
        "game_id": 1,
        "name": "Legend of Valor",
        "volume_24h": "850.5"
      }
    ]
  }
}
```

### 获取热门道具

```http
GET /analytics/trending?period=24h&limit=10
```

**查询参数:**
- `period`: 时间周期 (1h/24h/7d/30d)
- `metric`: 指标 (volume/views/trades)

### 获取价格指数

```http
GET /analytics/price-index?game_id=1&category=weapon
```

## WebSocket API

### 连接地址
```
wss://api.gameitemstrading.com/ws
```

### 认证
```javascript
// 连接后发送认证消息
{
  "type": "auth",
  "token": "Bearer {jwt_token}"
}
```

### 订阅事件

#### 订阅市场事件
```javascript
{
  "type": "subscribe",
  "channels": ["market:all", "market:game:1"]
}
```

#### 订阅用户事件
```javascript
{
  "type": "subscribe",
  "channels": ["user:0x742d35Cc..."]
}
```

### 事件类型

#### 新挂单事件
```javascript
{
  "type": "market:new-listing",
  "data": {
    "listing_id": 101,
    "item": {
      "token_id": "12345",
      "name": "Legendary Sword"
    },
    "price": "5.5",
    "seller": "0x..."
  },
  "timestamp": 1640995200000
}
```

#### 道具售出事件
```javascript
{
  "type": "market:item-sold",
  "data": {
    "listing_id": 101,
    "item_id": 1,
    "buyer": "0x...",
    "seller": "0x...",
    "price": "5.5",
    "transaction_hash": "0x..."
  },
  "timestamp": 1640995200000
}
```

#### 新竞拍事件
```javascript
{
  "type": "auction:new-bid",
  "data": {
    "auction_id": 50,
    "bidder": "0x...",
    "amount": "6.0",
    "bid_count": 15
  },
  "timestamp": 1640995200000
}
```

## 错误处理

### 错误响应格式
```json
{
  "code": 400,
  "message": "Invalid request",
  "error": {
    "type": "ValidationError",
    "details": [
      {
        "field": "price",
        "message": "Price must be greater than 0"
      }
    ]
  },
  "timestamp": 1640995200000
}
```

### 错误代码

| 代码 | 说明 |
|------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 409 | 冲突（如重复操作） |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |
| 503 | 服务暂时不可用 |

### 常见错误示例

#### 认证失败
```json
{
  "code": 401,
  "message": "Authentication failed",
  "error": {
    "type": "AuthError",
    "details": "Invalid or expired token"
  }
}
```

#### 验证失败
```json
{
  "code": 400,
  "message": "Validation failed",
  "error": {
    "type": "ValidationError",
    "details": [
      {
        "field": "price",
        "message": "Price must be a positive number"
      },
      {
        "field": "item_id",
        "message": "Item not found"
      }
    ]
  }
}
```

#### 限流错误
```json
{
  "code": 429,
  "message": "Too many requests",
  "error": {
    "type": "RateLimitError",
    "retry_after": 60,
    "limit": 100,
    "remaining": 0
  }
}
```

## 限流规则

### 全局限流
- 未认证用户: 100请求/小时
- 认证用户: 1000请求/小时

### 端点限流
- 交易相关API: 10请求/分钟
- 数据查询API: 100请求/分钟
- 文件上传API: 5请求/分钟

### 限流响应头
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## SDK示例

### JavaScript/TypeScript
```typescript
import { GameItemsAPI } from '@gameitemstrading/sdk';

const api = new GameItemsAPI({
  apiKey: 'your-api-key',
  network: 'mainnet'
});

// 连接钱包
const user = await api.auth.connect(wallet);

// 获取道具
const items = await api.items.getByOwner(user.address);

// 创建挂单
const listing = await api.market.createListing({
  itemId: 1,
  price: '5.5',
  currency: 'ETH'
});
```

### Python
```python
from gameitemstrading import GameItemsAPI

api = GameItemsAPI(api_key='your-api-key')

# 获取市场数据
market_stats = api.analytics.get_market_stats()

# 搜索道具
items = api.items.search(
    query="sword",
    filters={
        "rarity": ["epic", "legendary"],
        "min_price": 1.0
    }
)
```

## 最佳实践

1. **缓存策略**: 对不经常变化的数据使用客户端缓存
2. **批量请求**: 尽可能使用批量API减少请求次数
3. **错误重试**: 实现指数退避的重试机制
4. **WebSocket优先**: 对实时数据使用WebSocket而非轮询
5. **签名验证**: 所有交易相关操作必须包含有效签名

## 更新日志

### v1.0.0 (2024-01-01)
- 初始版本发布
- 基础API功能
- WebSocket实时通信
- 市场交易功能 