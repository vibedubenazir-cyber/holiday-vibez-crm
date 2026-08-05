// Local-only dev Redis bootstrap using redis-memory-server, so BullMQ-backed
// job scheduling can be run and clicked through without Docker installed.
// Production still targets a real managed Redis instance — this is a dev
// convenience, mirroring dev-db.js's role for Postgres.
const { RedisMemoryServer } = require('redis-memory-server');

const redisServer = new RedisMemoryServer({ instance: { port: 6379 } });

async function main() {
  const host = await redisServer.getHost();
  const port = await redisServer.getPort();
  console.log(`Embedded Redis ready on ${host}:${port}`);

  process.on('SIGINT', async () => {
    await redisServer.stop();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await redisServer.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Failed to start embedded redis', err);
  process.exit(1);
});
