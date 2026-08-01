// Local-only dev database bootstrap using embedded-postgres, so Phase 1 can be
// run and clicked through without Docker installed. Production still targets a
// real PostgreSQL instance per the spec (Section 3) — this is a dev convenience.
const EmbeddedPostgres = require('embedded-postgres').default;
const path = require('path');

const pg = new EmbeddedPostgres({
  databaseDir: path.join(__dirname, '..', '.pgdata'),
  user: 'holidayvibez',
  password: 'holidayvibez',
  port: 5433,
  persistent: true,
});

async function main() {
  await pg.initialise();
  await pg.start();
  try {
    await pg.createDatabase('holiday_vibez_crm');
  } catch (e) {
    // already exists on subsequent runs
  }
  console.log('Embedded Postgres ready on port 5433 (database: holiday_vibez_crm)');
  process.on('SIGINT', async () => {
    await pg.stop();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await pg.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Failed to start embedded postgres', err);
  process.exit(1);
});
