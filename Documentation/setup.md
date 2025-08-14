# 虚拟货币交易 DApp 系统安装和配置指南

## 目录
1. [系统要求](#系统要求)
2. [环境准备](#环境准备)
3. [项目安装](#项目安装)
4. [数据库配置](#数据库配置)
5. [区块链环境配置](#区块链环境配置)
6. [后端服务配置](#后端服务配置)
7. [前端应用配置](#前端应用配置)
8. [环境变量配置](#环境变量配置)
9. [启动顺序](#启动顺序)
10. [常见问题](#常见问题)

## 系统要求

### 硬件要求
- CPU: 双核处理器或更高
- 内存: 8GB RAM 或更高
- 存储: 至少 10GB 可用空间
- 网络: 稳定的互联网连接

### 软件要求
- 操作系统: Windows 10+, macOS 10.15+, 或 Linux (Ubuntu 20.04+)
- Node.js: 18.x 或更高版本
- npm: 10.x 或更高版本
- PostgreSQL: 14+ (推荐 PostgreSQL 17)
- Git: 最新版本
- Visual Studio Code: 最新版本
- MetaMask: 浏览器扩展插件

## 环境准备

### 1. 安装 Node.js
```bash
# Windows - 使用 Chocolatey
choco install nodejs

# macOS - 使用 Homebrew
brew install node

# Linux - 使用 NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

验证安装:
```bash
node --version  # 应显示 v18.x.x 或更高
npm --version   # 应显示 10.x.x 或更高
```

### 2. 安装 PostgreSQL

#### Windows
1. 下载 PostgreSQL 安装程序: https://www.postgresql.org/download/windows/
2. 运行安装程序，选择以下组件:
   - PostgreSQL Server
   - pgAdmin 4
   - Command Line Tools
3. 设置端口为 5433
4. 设置超级用户密码为 `admin`

#### macOS
```bash
brew install postgresql@17
brew services start postgresql@17
```

#### Linux
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 3. 安装 MetaMask
1. 访问 https://metamask.io/
2. 点击 "Download"
3. 选择您的浏览器并安装扩展
4. 创建新钱包或导入现有钱包

### 4. 安装开发工具
```bash
# 安装 Visual Studio Code
# Windows/macOS: 从官网下载安装
# Linux:
sudo snap install --classic code

# 安装必要的 VS Code 扩展
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension JuanBlanco.solidity
code --install-extension bradlc.vscode-tailwindcss
```

## 项目安装

### 1. 克隆项目
```bash
git clone [repository-url]
cd crypto-trading-dapp
```

### 2. 安装根目录依赖
```bash
npm install
```

### 3. 安装各模块依赖
```bash
# 安装前端依赖
cd frontend
npm install
cd ..

# 安装智能合约依赖
cd hardhat
npm install
cd ..

# 安装后端依赖
cd backend
npm install
cd ..
```

## 数据库配置

### 1. 创建数据库用户和数据库
```bash
# 连接到 PostgreSQL
psql -U postgres -p 5433

# 在 psql 提示符下执行
CREATE DATABASE crypto_trading_db;
\q
```

### 2. 初始化数据库架构
```bash
# Windows PowerShell
psql -U postgres -p 5433 -d crypto_trading_db -f database/init.sql

# macOS/Linux
psql -U postgres -p 5433 -d crypto_trading_db < database/init.sql
```

### 3. 验证数据库设置
```bash
psql -U postgres -p 5433 -d crypto_trading_db -c "\dt"
```
应该看到三个表: users, transactions, token_configs

## 区块链环境配置

### 1. Hardhat 配置
创建 `hardhat/hardhat.config.js`:
```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      chainId: 31337,
      mining: {
        auto: true,
        interval: 5000
      }
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
```

### 2. 启动 Hardhat 节点
```bash
cd hardhat
npx hardhat node
```
保持此终端窗口打开，节点将在 http://localhost:8545 运行

### 3. 配置 MetaMask
1. 打开 MetaMask
2. 点击网络下拉菜单
3. 选择 "添加网络"
4. 手动添加网络:
   - 网络名称: Hardhat Local
   - RPC URL: http://localhost:8545
   - 链 ID: 31337
   - 货币符号: ETH

## 后端服务配置

### 1. 创建后端服务器基础结构
```bash
cd backend
mkdir routes models middleware utils
```

### 2. 安装必要的包
```bash
npm install express cors dotenv pg body-parser helmet morgan
npm install --save-dev nodemon
```

### 3. 配置 package.json scripts
在 `backend/package.json` 中添加:
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

## 前端应用配置

### 1. 配置 Next.js
确保 `frontend/package.json` 包含:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

### 2. 安装钱包连接库
```bash
cd frontend
npm install @rainbow-me/rainbowkit wagmi viem@2.x @tanstack/react-query
```

### 3. 配置 TailwindCSS
确保 `frontend/tailwind.config.js` 存在并正确配置

## 环境变量配置

### 1. 创建环境变量文件
在项目根目录创建 `.env`:
```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=5433
DB_NAME=crypto_trading_db
DB_USER=postgres
DB_PASSWORD=admin

# 后端服务配置
BACKEND_PORT=3001
NODE_ENV=development

# 前端配置
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_CHAIN_ID=31337

# Hardhat 配置
HARDHAT_NETWORK=localhost
```

### 2. 创建各模块的环境变量
```bash
# 复制到各模块
cp .env frontend/.env.local
cp .env backend/.env
cp .env hardhat/.env
```

## 启动顺序

按以下顺序启动各服务:

### 1. 启动 PostgreSQL
```bash
# Windows
# PostgreSQL 通常自动启动

# macOS
brew services start postgresql@17

# Linux
sudo systemctl start postgresql
```

### 2. 启动 Hardhat 节点
```bash
cd hardhat
npx hardhat node
```

### 3. 部署智能合约
在新终端窗口:
```bash
cd hardhat
npx hardhat run scripts/deploy.js --network localhost
```

### 4. 启动后端服务
```bash
cd backend
npm run dev
```

### 5. 启动前端开发服务器
```bash
cd frontend
npm run dev
```

### 6. 访问应用
打开浏览器访问: http://localhost:3000

## 常见问题

### Q1: PostgreSQL 连接失败
**解决方案:**
1. 确认 PostgreSQL 服务正在运行
2. 检查端口 5433 是否被占用
3. 验证用户名和密码是否正确

### Q2: MetaMask 无法连接到 Hardhat
**解决方案:**
1. 确保 Hardhat 节点正在运行
2. 检查 MetaMask 网络配置是否正确
3. 尝试重置 MetaMask 账户

### Q3: npm install 失败
**解决方案:**
1. 清除 npm 缓存: `npm cache clean --force`
2. 删除 node_modules 和 package-lock.json
3. 重新运行 `npm install`

### Q4: 端口被占用
**解决方案:**
```bash
# Windows - 查找占用端口的进程
netstat -ano | findstr :PORT
taskkill /PID [PID] /F

# macOS/Linux
lsof -i :PORT
kill -9 [PID]
```

### Q5: 智能合约部署失败
**解决方案:**
1. 确保 Hardhat 节点正在运行
2. 检查合约代码是否有语法错误
3. 确认有足够的测试 ETH

## 下一步

完成环境设置后，请参考以下文档:
- [features.md](./features.md) - 了解系统功能
- [api.md](./api.md) - 后端 API 文档
- [deployment.md](./deployment.md) - 生产部署指南 