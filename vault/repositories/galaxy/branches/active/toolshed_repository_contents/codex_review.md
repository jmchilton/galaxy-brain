# Codex review — toolshed_repository_contents

Codex reviewed `a8553cff3ca...6f115b07e29`, read-only. It reported 3 findings: 1 fixed, 2 not acted on.
- **Fixed in `e52392b4c12`:** `RepositoryPage` came back with no revision, tools or READMEs after returning from Contents.
  - The fix added a red-first vitest case that mounts with metadata already cached, then made both the newest-revision watcher and the READMEs watcher `immediate`.
  - Making the READMEs watcher immediate also fixes a gap already on dev: a page mounted with a `changesetRevision` prop never fetched READMEs.
- **Checks:** shed vitest 217 passed; typecheck clean; lint 0 errors (13 warnings, all already there); prettier clean.

## Not acted on

- **Non-UTF-8 filenames are listed but return 404** (`repository_files.py`). Confirmed. It's the same known limitation the implementation debrief recorded. A fix needs a reversible path encoding that both endpoints share. Shed repos rarely have such filenames, so it's left for John to decide.
- **CORS hides `ETag` and blocks `If-None-Match` preflight** (`APICorsRoute`, `cors_preflight`). The claim is true, but it comes from Galaxy's shared CORS policy, which deliberately allows only safelisted headers.
  - Browser HTTP-cache revalidation still works cross-origin. Only JS that sets validators by hand is affected.
  - Widening the policy would change core Galaxy CORS behaviour, which is out of scope here.
  - Follow-up on 2026-10-15, after a decision by John: `ETag` stays deferred until a consumer exists. A related gap was fixed in `6521d02fde2`: the reflected Origin plus `Cache-Control: public` needed `Vary: Origin`.

<details>
<summary>Full Codex findings</summary>

1. **P1 correctness — `RepositoryPage.vue:110`, initialize the revision when mounting with cached metadata.** The watcher now observes the newest hash, not a freshly computed array, and isn't immediate. The store keeps metadata during refresh, so a remount sees the same hash, the watcher never fires, and `currentRevision` stays `""`. Tools, revision warnings, actions and READMEs are all missing. *Verdict: CONFIRMED.* Found an extra ordering issue: the READMEs watcher was registered after the immediate watcher, so it also had to be made immediate.
2. **P2 api-contract — `repository_files.py:40`, filename identity across listing and lookup.** `b'caf\xe9.txt'` is listed as `caf�.txt`. The lookup re-encodes that as UTF-8, so the request 404s, and distinct names can collapse into one. *Verdict: CONFIRMED, known limitation, deferred.*
3. **P2 api-contract — `api2/repositories.py:719`, CORS for conditional requests.** `ETag` isn't exposed and `If-None-Match` isn't in the preflight allow-list. *Verdict: NEEDS-DECISION, shared Galaxy CORS policy, not changed.*

Coverage note from Codex: it read the full diff plus the surrounding code, but its sandbox couldn't run the test suites.

</details>
