const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Game Items Trading Platform (Working Version)...\n');

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
const hardhatNode = startProcess('Hardhat Node (Blockchain)', 'npm', ['run', 'node'], 'hardhat');
processes.push(hardhatNode);

// Wait a bit for Hardhat to start, then deploy simple contracts
setTimeout(() => {
  console.log('\n🔧 Deploying simple smart contracts...');
  const deployProcess = startProcess('Simple Contract Deployment', 'npm', ['run', 'deploy:simple'], 'hardhat');
  
  deployProcess.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Simple contracts deployed successfully!');
      
      // Start frontend
      setTimeout(() => {
        const frontend = startProcess('Frontend', 'npm', ['run', 'frontend'], '.');
        processes.push(frontend);
      }, 2000);
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
console.log('- Frontend: http://localhost:3000');
console.log('\n⏳ Please wait for all services to start...');
console.log('Press Ctrl+C to stop all services'); 