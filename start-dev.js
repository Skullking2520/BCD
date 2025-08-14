const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Game Items Trading Platform Development Environment...\n');

// Function to start a process
function startProcess(name, command, args, cwd) {
  console.log(`📦 Starting ${name}...`);
  
  const process = spawn(command, args, {
    cwd: cwd || '.',
    stdio: 'inherit',
    shell: true
  });

  process.on('error', (error) => {
    console.error(`❌ Error starting ${name}:`, error.message);
  });

  process.on('close', (code) => {
    console.log(`📦 ${name} process exited with code ${code}`);
  });

  return process;
}

// Start all services
const processes = [];

// Start Hardhat node (blockchain)
const hardhatNode = startProcess('Hardhat Node (Blockchain)', 'npm', ['run', 'hardhat'], 'hardhat');
processes.push(hardhatNode);

// Wait a bit for Hardhat to start, then deploy contracts
setTimeout(() => {
  console.log('\n🔧 Deploying smart contracts...');
  const deployProcess = startProcess('Contract Deployment', 'npm', ['run', 'deploy'], 'hardhat');
  
  deployProcess.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Contracts deployed successfully!');
      
      // Start backend
      setTimeout(() => {
        const backend = startProcess('Backend API', 'npm', ['run', 'backend'], '.');
        processes.push(backend);
      }, 2000);
      
      // Start frontend
      setTimeout(() => {
        const frontend = startProcess('Frontend', 'npm', ['run', 'frontend'], '.');
        processes.push(frontend);
      }, 4000);
    }
  });
}, 3000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down all processes...');
  processes.forEach(proc => {
    if (proc && !proc.killed) {
      proc.kill('SIGINT');
    }
  });
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down all processes...');
  processes.forEach(proc => {
    if (proc && !proc.killed) {
      proc.kill('SIGTERM');
    }
  });
  process.exit(0);
});

console.log('\n📋 Services starting:');
console.log('- Hardhat Node (Blockchain): http://localhost:8545');
console.log('- Backend API: http://localhost:3001');
console.log('- Frontend: http://localhost:3000');
console.log('\n⏳ Please wait for all services to start...');
console.log('Press Ctrl+C to stop all services'); 