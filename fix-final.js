const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Final fix for deployment issues...\n');

try {
  // 1. 完全清理hardhat目录
  console.log('1. Complete cleanup of hardhat...');
  try {
    execSync('cd hardhat && rmdir /s /q node_modules', { stdio: 'inherit', shell: true });
    execSync('cd hardhat && del package-lock.json', { stdio: 'inherit', shell: true });
    execSync('cd hardhat && rmdir /s /q cache', { stdio: 'inherit', shell: true });
    execSync('cd hardhat && rmdir /s /q artifacts', { stdio: 'inherit', shell: true });
  } catch (error) {
    console.log('Cleanup completed');
  }
  
  // 2. 重新安装所有依赖
  console.log('\n2. Installing all dependencies...');
  execSync('cd hardhat && npm install', { stdio: 'inherit' });
  
  // 3. 验证OpenZeppelin安装
  console.log('\n3. Verifying OpenZeppelin installation...');
  const nodeModulesPath = path.join(__dirname, 'hardhat/node_modules/@openzeppelin/contracts');
  if (fs.existsSync(nodeModulesPath)) {
    console.log('✅ OpenZeppelin contracts found');
  } else {
    console.log('❌ OpenZeppelin contracts not found, reinstalling...');
    execSync('cd hardhat && npm install @openzeppelin/contracts@^5.0.1', { stdio: 'inherit' });
  }
  
  // 4. 编译合约
  console.log('\n4. Compiling contracts...');
  execSync('cd hardhat && npx hardhat compile', { stdio: 'inherit' });
  
  // 5. 检查编译结果
  console.log('\n5. Checking compilation...');
  const artifactsDir = path.join(__dirname, 'hardhat/artifacts/contracts');
  if (fs.existsSync(artifactsDir)) {
    const contracts = fs.readdirSync(artifactsDir);
    console.log('✅ Compiled contracts:', contracts);
  }
  
  console.log('\n✅ Final fix completed! You can now run: npm run dev:simple');
  
} catch (error) {
  console.error('❌ Error during fix:', error.message);
  process.exit(1);
} 