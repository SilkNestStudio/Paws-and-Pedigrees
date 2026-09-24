# Local development and the cloud migration path

Local play is now the default. Run npm install, then npm run dev. No Supabase project,
keys, or sign-in are needed. Existing .env Supabase credentials are ignored unless
VITE_STORAGE_MODE=supabase is explicitly set. Restart Vite after changing that setting.

## Saving and backups

The complete serializable game state is stored in IndexedDB database
paws-and-pedigrees, object store saves. Snapshot version 0 sits inside backup format
version 1. Zustand uses a StateStorage adapter; gameplay actions remain unchanged.
Writes are serialized and resolve after their IndexedDB transaction completes.
Transient selection, loading/error flags, and action functions are excluded.
Startup waits for hydration before rendering game components. Browsers supporting
Web Locks allow one active kennel tab at a time to prevent conflicting writes.

Legacy paws-and-pedigrees-storage localStorage progress is copied once when no
IndexedDB save exists. The original is retained. Remote-only Supabase data cannot
be retrieved in local mode; only progress already saved in this browser migrates.

Use Export backup, Restore backup, and Protect local save in the game header.
Export includes current in-memory progress even if a disk write fails. Restore
requires confirmation, rejects unsupported formats, and retains the previous
snapshot under before-import. Reset uses the existing two-step confirmation and
only resets this game; it does not clear unrelated browser storage.

Saves belong to this browser profile and website origin. Changing hostname or port,
clearing site data, or using another device changes the available save. Private
browsing is unsuitable for permanent progress. Export JSON backups regularly.
IndexedDB does not make the application shell available offline: installation and
asset caching as a PWA remain separate work.

## Boundaries and future migration

src/lib/storage/localDatabase.ts implements Zustand's StateStorage contract for
local snapshots. src/lib/storage/config.ts selects local versus cloud mode. The
Supabase adapter initializes lazily and rejects accidental access in local mode.
Existing cloud services remain available in supabaseService.ts. Cloud mode uses a
separate browser cache so it cannot overwrite the local kennel snapshot.

Local competitions, rewards, breeding, care, and story progression remain playable.
The player stud marketplace and online leaderboards explicitly require cloud mode.
Local results are not submitted as verified online scores.

Returning to the existing cloud implementation is a configuration change, but
uploading a local kennel is deliberately not automatic. Before public cloud release:

1. Add an authenticated import command that validates a versioned snapshot and
   maps its player/dog ownership to the account, with explicit conflict handling.
2. Move economic commands, breeding random outcomes, and competitive rewards into
   server transactions. Imported local progress must not grant trusted paid/league
   status without validation.
3. Extend cloud persistence to cover every snapshot domain, including registrations
   and tutorial progress; existing cloud services do not yet cover all local state.
4. Add revisions, idempotent commands, migrations, and multi-device conflict rules.

A managed PostgreSQL backend such as the existing Supabase setup can reuse the
current schema and domain rules. Scaling to a public multiplayer economy still
requires backend work, but changing storage does not require replacing the 3D game,
UI, dog model, or simulation.

## Verification

npm run type-check
npm run test
npm run test:storage (Vite on port 5173; Playwright Chromium installed)
npm run test:browser (agility desktop/mobile checks)

For the workspace browser installation set PLAYWRIGHT_BROWSERS_PATH=.browser.local.
Storage smoke checks cover startup without cloud calls, persistent dog/cash changes,
backup round trips, invalid backup rejection, reset, legacy copying, and tab locks.
Browser storage behavior references:
https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
