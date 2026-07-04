module.exports = {
  apps: [
    {
      name: "targetbridge-ai",
      cwd: __dirname + "/..",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      error_file: "./logs/targetbridge-error.log",
      out_file: "./logs/targetbridge-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
