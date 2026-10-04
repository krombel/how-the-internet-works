// One headless Chrome run at a time on this machine (another lane's Chrome skews frame timings and recordings): an
// atomic mkdir lock in the temp dir, with the holder's pid and worktree. A dead holder's lock is cleared. Taken by
// scripts/evaluate.mjs, record-clip.mjs and link-preview.mjs; EVALUATE_NO_LOCK=1 skips it (CI).
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const LOCK = join(tmpdir(), 'hitw-evaluate.lock'), OWNER = join(LOCK, 'owner.json');
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

/** Wait for the lock and hold it until this process exits. */
export async function lock(args = process.argv.slice(2)) {
  if (process.env.EVALUATE_NO_LOCK) return;
  let said = '';
  for (;;) {
    try { mkdirSync(LOCK); break; } catch (e) { if (e.code !== 'EEXIST') throw e; }
    let who = null;
    try { who = JSON.parse(readFileSync(OWNER, 'utf8')); } catch { /* not written yet, or gone */ }
    // a holder that died between its mkdir and writing owner.json leaves an empty lock: clear it after a while
    let stale = who && !alive(who.pid);
    if (!who) try { stale = Date.now() - statSync(LOCK).mtimeMs > 30000; } catch { continue; /* released meanwhile */ }
    if (stale) { rmSync(LOCK, { recursive: true, force: true }); continue; }
    const line = who ? `waiting for ${who.pid} (${who.cwd})` : 'waiting for the evaluate lock';
    if (line !== said) console.log(`  ${(said = line)}`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  writeFileSync(OWNER, JSON.stringify({ pid: process.pid, cwd: process.cwd(), args, since: new Date().toISOString() }));
  const release = () => {
    try { if (JSON.parse(readFileSync(OWNER, 'utf8')).pid === process.pid) rmSync(LOCK, { recursive: true, force: true }); } catch { /* already gone */ }
  };
  process.on('exit', release);
  for (const [sig, code] of [['SIGINT', 130], ['SIGTERM', 143]]) process.on(sig, () => process.exit(code));
}
