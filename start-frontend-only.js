const { spawn } = require('child_process');

console.log('🚀 Starting Frontend Only...\n');

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

// Start frontend only
const frontend = startProcess('Frontend', 'npm', ['run', 'dev'], 'frontend');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down frontend...');
  if (frontend && !frontend.killed) {
    frontend.kill('SIGINT');
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down frontend...');
  if (frontend && !frontend.killed) {
    frontend.kill('SIGTERM');
  }
  process.exit(0);
});

console.log('\n📋 Services starting:');
console.log('- Frontend: http://localhost:3000');
console.log('\n⏳ Please wait for frontend to start...');
console.log('Press Ctrl+C to stop frontend'); 