const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing deployment issues...\n');

try {
  // 1. 清理缓存
  console.log('1. Cleaning cache...');
  try {
    execSync('cd hardhat && npx hardhat clean', { stdio: 'inherit' });
  } catch (error) {
    console.log('Cache clean skipped (not critical)');
  }
  
  // 2. 重新安装依赖
  console.log('\n2. Reinstalling dependencies...');
  execSync('cd hardhat && npm install', { stdio: 'inherit' });
  
  // 3. 编译合约
  console.log('\n3. Compiling contracts...');
  execSync('cd hardhat && npx hardhat compile', { stdio: 'inherit' });
  
  // 4. 检查编译结果
  console.log('\n4. Checking compilation...');
  const artifactsDir = path.join(__dirname, 'hardhat/artifacts/contracts');
  if (fs.existsSync(artifactsDir)) {
    const contracts = fs.readdirSync(artifactsDir);
    console.log('✅ Compiled contracts:', contracts);
  }
  
  console.log('\n✅ Fix completed! You can now run: npm run dev');
  
} catch (error) {
  console.error('❌ Error during fix:', error.message);
  process.exit(1);
} 