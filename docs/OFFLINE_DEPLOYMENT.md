# Offline installation, operation and recovery

## Initial setup (one online preparation)

Install Node.js 22 or a compatible supported Node release. In the existing workspace run `npm ci`, then `npm run build`. Development verification additionally needs Playwright Chromium (`npx playwright install chromium`). No package installation or paid API is needed at runtime.

## Offline startup

Run `npm run offline`, then open **http://localhost:5173**. This uses `scripts/serve-offline.mjs`, Node built-ins and the already built `dist` directory; `node_modules` is not needed to serve the built app. For a prepared offline laptop, copy `dist/` and `scripts/serve-offline.mjs` with that directory relationship and run `node scripts/serve-offline.mjs`. Keep Node installed locally.

The server binds loopback, exposes only built files, accepts GET/HEAD and rejects traversal/write requests. It does not host a database or authenticate users. Its first successful browser load installs local offline resources; Home reports when they are ready. Keep the local launcher available for reliable startup. A service worker is an additional disconnected reload capability, not a native installer. No standalone executable or VR implementation is claimed.

Use the same **hostname, port and browser profile**. `localhost:5173`, `127.0.0.1:5173` and `localhost:5174` are different data origins. The optional `PRAGYA_PORT` environment variable changes the serving port; doing so changes the browser's data origin. The launcher fails rather than silently moving to a new port. Development/e2e servers are separate from the normal offline origin.

## Data and backups

Application records reside in browser IndexedDB **pragya-local**, schema version 4: scenarios, sessions, settings, trainees, learningPlans and training. No cloud upload or server-side database is required. The cache holds built application resources, not a backup of IndexedDB. Clearing browser/site data, private-profile cleanup, disk loss or a different origin can remove or hide records. A visible banner identifies temporary in-memory fallback; export before closing in that state.

Home → Backups & Transfer exports a complete versioned record backup in **Unrestricted local demo** (local-owner tooling). It contains private training records and is not encrypted. SHA-256 detects accidental modification; it is not a signature or protection against someone who can edit and recompute a checksum. Protect exported files with the host's filesystem controls or an approved encrypted storage system.

For recovery, open a clean browser profile at the intended local origin, choose the backup, review validated counts and click Restore validated backup. Existing identifiers cause rejection; nothing is reset, cleared or silently overwritten. Restoration validates versions, event fields, linked identities/units, assessment ownership, policy/scenario snapshots, assignment outcomes and learning references before one atomic transaction. Settings restoration is optional. Unsupported/corrupt files leave local data unchanged. Preserve a source copy if validation reports inconsistent historical references; do not delete the original database to work around an error.

Portable imports support original session exports, crew exports (including feedback), existing trainee bundles, scoring policies and scenario definitions. Identical embedded crew sessions can be explicitly reported as reused; conflicting data is rejected. Importing a standalone historical session does not assign it to a unit. Trainees can export their own full record; commanders export permitted aggregates from Unit Intelligence. Raw unit-session access requires instructor scope. Finish/abort an active exercise and wait for saving before import/restoration.

## Instructor and unit setup

Create a local commander/unit in Units & Identities. Create unit trainees there or link existing profiles. Add instructor identities/memberships, then select the trainee checkboxes and explicitly assign their instructor scope. Create cohorts from selected members. Existing identities can hold additional explicit roles; a commander needs instructor role **and trainee scope** to open raw supporting AAR records.

Instructor & Assignments opens the original scenario editor, immutable policy versions, individual/cohort assignments and reviews. Drafts are not playable. Duplicate or increment a version to change a published scenario/policy. Historical sessions require explicit unit association. Notes do not change recorded scores. Crew exercises require instructor scope over both participants in unit mode; unrestricted demo mode supports local rehearsal.

## Security and limits

Identity selection is **not authentication**. Anyone with the browser/OS account or developer tools can choose identities and inspect/modify local records. Service permission checks enforce app workflows, not a hostile-user trust boundary. Use separate OS accounts/browser profiles and filesystem protections for private local use. Secure authenticated multi-user deployment needs a separate server/desktop security design.

Duo Mode is one-laptop turn-taking with one engine/clock. Closed-LAN host/client synchronization, packaged executables, encryption and tamper-resistant storage are not implemented. Do not expose this static launcher as an authenticated unit server. Available graphics quality, reduced motion and interface scale are inherited from Settings; consult TEST_REPORT.md for measured host limits rather than assuming hardware certification.
