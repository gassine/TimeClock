const { spawn } = require('child_process');

const prismaProcess = spawn('npx.cmd', ['prisma', 'migrate', 'dev', '--name', 'simplify_report_status'], {
    stdio: ['pipe', 'inherit', 'inherit'],
    env: { ...process.env, CI: '1' }
});

prismaProcess.stdin.write('y\n');
prismaProcess.stdin.end();

prismaProcess.on('close', (code) => {
    console.log(`Prisma process exited with code ${code}`);
});
