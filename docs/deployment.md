# 游戏虚拟道具交易平台部署指南

## 目录
1. [部署概述](#部署概述)
2. [环境准备](#环境准备)
3. [智能合约部署](#智能合约部署)
4. [后端服务部署](#后端服务部署)
5. [前端应用部署](#前端应用部署)
6. [数据库部署](#数据库部署)
7. [监控和维护](#监控和维护)
8. [故障排查](#故障排查)

## 部署概述

本文档提供游戏虚拟道具交易平台的生产环境部署指南。部署过程包括智能合约部署、后端服务部署、前端应用部署和相关基础设施配置。

### 部署架构
- **智能合约**: 部署到以太坊主网或测试网
- **前端应用**: 部署到 Vercel/Netlify
- **后端服务**: 部署到 AWS EC2/Google Cloud
- **数据库**: PostgreSQL on RDS
- **缓存**: Redis on ElastiCache
- **文件存储**: IPFS + AWS S3

## 环境准备

### 1. 服务器要求
```yaml
生产服务器:
  - CPU: 4核或以上
  - 内存: 16GB或以上
  - 存储: 100GB SSD
  - 操作系统: Ubuntu 20.04 LTS
  - 网络: 100Mbps或以上

数据库服务器:
  - CPU: 4核或以上
  - 内存: 32GB或以上
  - 存储: 500GB SSD
  - PostgreSQL: 17.x
```

### 2. 域名和SSL证书
```bash
# 申请SSL证书 (使用 Let's Encrypt)
sudo apt update
sudo apt install certbot nginx-certbot-plugin
sudo certbot --nginx -d api.gameitemstrading.com
sudo certbot --nginx -d gameitemstrading.com
```

### 3. 必要软件安装
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2
sudo npm install -g pm2

# 安装 Nginx
sudo apt install nginx -y

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

## 智能合约部署

### 1. 准备部署环境
```bash
cd hardhat
cp .env.example .env.production
```

编辑 `.env.production`:
```env
# 主网配置
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_deployment_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key

# 合约参数
MARKETPLACE_FEE=250  # 2.5%
MIN_LISTING_DURATION=3600  # 1小时
MAX_LISTING_DURATION=2592000  # 30天
```

### 2. 部署合约脚本
创建 `hardhat/scripts/deploy-mainnet.js`:
```javascript
const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts to mainnet...");
  
  // 部署 GameRegistry
  const GameRegistry = await hre.ethers.getContractFactory("GameRegistry");
  const gameRegistry = await GameRegistry.deploy();
  await gameRegistry.deployed();
  console.log("GameRegistry deployed to:", gameRegistry.address);
  
  // 部署 GameItemERC721
  const GameItemERC721 = await hre.ethers.getContractFactory("GameItemERC721");
  const gameItemERC721 = await GameItemERC721.deploy(
    "Game Items Collection",
    "GITM",
    gameRegistry.address
  );
  await gameItemERC721.deployed();
  console.log("GameItemERC721 deployed to:", gameItemERC721.address);
  
  // 部署 Marketplace
  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(
    gameRegistry.address,
    250 // 2.5% fee
  );
  await marketplace.deployed();
  console.log("Marketplace deployed to:", marketplace.address);
  
  // 保存合约地址
  const fs = require("fs");
  const addresses = {
    gameRegistry: gameRegistry.address,
    gameItemERC721: gameItemERC721.address,
    marketplace: marketplace.address
  };
  
  fs.writeFileSync(
    "./deployed-addresses.json",
    JSON.stringify(addresses, null, 2)
  );
  
  // 验证合约
  await hre.run("verify:verify", {
    address: gameRegistry.address,
    constructorArguments: []
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 3. 执行部署
```bash
# 测试网部署
npx hardhat run scripts/deploy-mainnet.js --network goerli

# 主网部署（谨慎操作）
npx hardhat run scripts/deploy-mainnet.js --network mainnet
```

## 后端服务部署

### 1. 构建后端服务
```bash
cd backend
npm install --production
npm run build
```

### 2. 配置生产环境变量
创建 `backend/.env.production`:
```env
# 服务器配置
NODE_ENV=production
PORT=3001

# 数据库配置
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432
DB_NAME=game_items_trading_db
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_SSL=true

# Redis配置
REDIS_HOST=your-redis-endpoint.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# 区块链配置
BLOCKCHAIN_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
GAME_REGISTRY_ADDRESS=0x...
MARKETPLACE_ADDRESS=0x...

# JWT配置
JWT_SECRET=your_very_secure_jwt_secret
JWT_EXPIRE_TIME=24h

# IPFS配置
IPFS_API_URL=https://ipfs.infura.io:5001
IPFS_GATEWAY=https://gateway.ipfs.io

# AWS S3配置
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=game-items-assets
```

### 3. PM2 配置
创建 `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'game-items-api',
    script: './dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    autorestart: true,
    watch: false
  }]
};
```

### 4. 启动服务
```bash
# 启动应用
pm2 start ecosystem.config.js

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup
```

### 5. Nginx反向代理配置
创建 `/etc/nginx/sites-available/api.gameitemstrading.com`:
```nginx
server {
    listen 80;
    server_name api.gameitemstrading.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.gameitemstrading.com;

    ssl_certificate /etc/letsencrypt/live/api.gameitemstrading.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.gameitemstrading.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

启用配置:
```bash
sudo ln -s /etc/nginx/sites-available/api.gameitemstrading.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 前端应用部署

### 1. 构建前端应用
```bash
cd frontend
cp .env.example .env.production
```

编辑 `.env.production`:
```env
NEXT_PUBLIC_API_URL=https://api.gameitemstrading.com/api/v1
NEXT_PUBLIC_WS_URL=wss://api.gameitemstrading.com/ws
NEXT_PUBLIC_CHAIN_ID=1
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0x...
NEXT_PUBLIC_GAME_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.ipfs.io
```

构建:
```bash
npm run build
```

### 2. Vercel部署
```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel --prod
```

### 3. 自定义域名配置
在 Vercel 控制台:
1. 添加域名 gameitemstrading.com
2. 配置 DNS 记录
3. 启用 HTTPS

### 4. CDN配置
配置 Cloudflare:
1. 添加站点
2. 配置 DNS
3. 启用缓存规则
4. 设置页面规则

## 数据库部署

### 1. AWS RDS配置
```yaml
数据库实例:
  - 引擎: PostgreSQL 17
  - 实例类型: db.r6g.xlarge
  - 存储: 500GB SSD
  - 多可用区: 启用
  - 备份保留: 7天
  - 自动快照: 每日
```

### 2. 初始化数据库
```bash
# 连接到RDS实例
psql -h your-rds-endpoint.amazonaws.com -p 5432 -U postgres

# 执行初始化脚本
\i database/init.sql
```

### 3. 数据库优化
```sql
-- 调整连接池
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '8GB';
ALTER SYSTEM SET effective_cache_size = '24GB';
ALTER SYSTEM SET work_mem = '16MB';

-- 创建只读副本用户
CREATE USER readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE game_items_trading_db TO readonly;
GRANT USAGE ON SCHEMA public TO readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;
```

## 监控和维护

### 1. 应用监控
```bash
# PM2 监控
pm2 monit

# 查看日志
pm2 logs

# 查看状态
pm2 status
```

### 2. 服务器监控
安装监控工具:
```bash
# 安装 netdata
bash <(curl -Ss https://my-netdata.io/kickstart.sh)

# 安装 prometheus node exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.5.0/node_exporter-1.5.0.linux-amd64.tar.gz
tar xvf node_exporter-1.5.0.linux-amd64.tar.gz
sudo mv node_exporter-1.5.0.linux-amd64/node_exporter /usr/local/bin/
```

### 3. 日志管理
配置日志轮转 `/etc/logrotate.d/game-items-api`:
```
/var/log/game-items-api/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 4. 备份策略
创建备份脚本 `backup.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup"

# 备份数据库
pg_dump -h your-rds-endpoint.amazonaws.com -U postgres -d game_items_trading_db | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# 备份配置文件
tar -czf $BACKUP_DIR/config_backup_$DATE.tar.gz /etc/nginx /home/ubuntu/game-items-api/.env.production

# 上传到S3
aws s3 cp $BACKUP_DIR/db_backup_$DATE.sql.gz s3://your-backup-bucket/db/
aws s3 cp $BACKUP_DIR/config_backup_$DATE.tar.gz s3://your-backup-bucket/config/

# 清理旧备份
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
```

设置定时任务:
```bash
# 编辑 crontab
crontab -e

# 添加每日备份
0 2 * * * /home/ubuntu/backup.sh
```

### 5. 性能监控
配置 Grafana Dashboard:
1. 添加 Prometheus 数据源
2. 导入 Node Exporter Dashboard
3. 创建自定义面板监控业务指标

## 故障排查

### 1. 常见问题

#### API服务无响应
```bash
# 检查服务状态
pm2 status

# 查看错误日志
pm2 logs --err

# 重启服务
pm2 restart all
```

#### 数据库连接失败
```bash
# 测试数据库连接
psql -h your-rds-endpoint.amazonaws.com -U postgres -d game_items_trading_db

# 检查安全组规则
# 确保允许应用服务器IP访问
```

#### 智能合约调用失败
```bash
# 检查合约地址配置
cat .env.production | grep ADDRESS

# 验证RPC节点连接
curl -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' https://mainnet.infura.io/v3/YOUR_KEY
```

### 2. 紧急回滚流程
```bash
# 回滚前端
vercel rollback

# 回滚后端
pm2 deploy ecosystem.config.js production revert 1

# 回滚数据库
psql -h your-rds-endpoint.amazonaws.com -U postgres -d game_items_trading_db < backup.sql
```

### 3. 灾难恢复
1. 从S3恢复最新备份
2. 重新部署应用服务
3. 验证数据完整性
4. 逐步恢复服务

## 安全加固

### 1. 服务器安全
```bash
# 配置防火墙
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 禁用root登录
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/g' /etc/ssh/sshd_config
sudo systemctl restart sshd

# 安装fail2ban
sudo apt install fail2ban -y
```

### 2. 应用安全
- 启用 HTTPS
- 实施速率限制
- 使用安全的HTTP头
- 定期更新依赖

### 3. 数据库安全
- 使用强密码
- 限制访问IP
- 启用SSL连接
- 定期审计权限

## 总结

成功部署游戏虚拟道具交易平台需要：
1. 仔细规划部署架构
2. 正确配置各个组件
3. 实施监控和备份策略
4. 定期维护和优化
5. 建立应急响应机制

遵循本指南可以确保平台的稳定运行和高可用性。 