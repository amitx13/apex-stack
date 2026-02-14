module.exports = {
  apps: [{
    name: 'api',
    script: './dist/index.js',
    cwd: '/root/apex-stack/apps/server',
    node_args: '-r dotenv/config',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    }
  }]
};
