// Local-only dev database bootstrap using embedded-postgres, so Phase 1 can be
// run and clicked through without Docker installed. Production still targets a
// real PostgreSQL instance per the spec (Section 3) — this is a dev convenience.
const EmbeddedPostgres = require('embedded-postgres').default;
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', '.pgdata');
const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'holidayvibez',
  password: 'holidayvibez',
  port: 5433,
  persistent: true,
});

// On Windows, embedded-postgres's initdb writes `dynamic_shared_memory_type =
// posix` into postgresql.conf, but POSIX shared memory doesn't exist on
// Windows — so the server refuses to start ("invalid value ... Available
// values: windows"). Rewrite it to the only value Windows supports before
// starting. Idempotent (a no-op once already correct) and Windows-only, so it
// never touches a Linux/macOS data dir.
function fixWindowsSharedMemoryType() {
  if (process.platform !== 'win32') return;
  const confPath = path.join(dataDir, 'postgresql.conf');
  if (!fs.existsSync(confPath)) return;
  const conf = fs.readFileSync(confPath, 'utf8');
  const fixed = conf.replace(
    /^dynamic_shared_memory_type = posix/m,
    'dynamic_shared_memory_type = windows',
  );
  if (fixed !== conf) {
    fs.writeFileSync(confPath, fixed);
    console.log('Patched dynamic_shared_memory_type=windows for Windows compatibility');
  }
}

async function main() {
  const alreadyInitialised = fs.existsSync(dataDir) && fs.readdirSync(dataDir).length > 0;
  if (!alreadyInitialised) {
    await pg.initialise();
  }
  fixWindowsSharedMemoryType();
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
