const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Simple fix for deployment issues...\n');

try {
  // 1. 删除node_modules和package-lock.json
  console.log('1. Cleaning hardhat dependencies...');
  try {
    execSync('cd hardhat && rmdir /s /q node_modules', { stdio: 'inherit', shell: true });
    execSync('cd hardhat && del package-lock.json', { stdio: 'inherit', shell: true });
  } catch (error) {
    console.log('Cleanup completed');
  }
  
  // 2. 重新安装依赖
  console.log('\n2. Installing dependencies...');
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
  
  console.log('\n✅ Simple fix completed! You can now run: npm run dev:simple');
  
} catch (error) {
  console.error('❌ Error during fix:', error.message);
  process.exit(1);
} 