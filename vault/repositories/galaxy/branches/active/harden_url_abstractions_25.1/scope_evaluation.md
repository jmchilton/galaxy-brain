Run via Claude Opus 5.5.

# harden_url_abstractions_25.1: scope evaluation (round 2, after re-scope)

**Recommendation: expand, modestly, by one item: the DRS file source.** Route its object and access lookups (`retry_and_get`, `_get_access_info` in `lib/galaxy/files/sources/util.py`) through `ValidatingSession`, like the TRS and remote ZIP requests, and fold in a bug on the same lines (`retry_and_get` drops `headers` when it retries after a 202). Decision for John. Everything else stays as it is: the first evaluation's three items are on the branch, no review since the re-scope raised a scope change, and the items set aside last time stay out.

Reviewed at head `3355e25a9b2` (16 commits) against `origin/release_25.1` at `83296278444`. Sources: the re-scope debrief and its normal review, test challenges round 2, Codex round 2 (no findings), thermo-nuclear round 2, baseline refactor round 2, the first evaluation, and the project index. A private note was appended.

## Possible Decompositions

The branch adds 548 lines and removes 42. About 135 changed lines are in `lib/` (`uris.py`, `http.py`, `remotezip.py`, `trs_proxy.py`) and the rest are tests. Commit numbers follow `baseline_refactor.md` round 2. Ordering constraints:
- `ValidatingSession` arrives in the TRS commit (12), and remote ZIP (13) uses it.
- The ftp commit (16) needs the `schemes` refactor (8) and the initial-URL check (15).
- `ValidatingRedirectHandler` arrives in 11.

- **A. One PR.** All 16 commits, baselines first.
- **B. Shared reading first, then one PR per consumer:**
  1. Baselines 1–4 and refactors 5–8 (tests and pure refactors only).
  2. `validate_non_local` reading (9–10).
  3. http file source (11, 15, 16).
  4. TRS (12).
  5. Remote ZIP (13, 14).

  PRs 3–5 depend on 2. PR 5 depends on 4 unless `ValidatingSession` moves into PR 2.
- **C. All of `uris.py` first, then consumer wiring:**
  1. Baselines (1–4).
  2. Refactors (5–8).
  3. `uris.py` (9, 10, plus `ValidatingRedirectHandler` taken out of 11 and `ValidatingSession` taken out of 12).
  4. Consumer hop checks (11–16, now only wiring and tests).
- **D. Two PRs, matching the project's two halves:**
  1. One URL reading: baselines 1, refactor 8, and 9–10.
  2. Every hop checked: the other baselines and refactors, then 11–16.

With the recommended expansion, the DRS commit lands after 12 (it needs `ValidatingSession`). It joins the TRS/remote ZIP piece in B, the consumer PR in C, or the second PR in D. Its baseline (DRS lookups with no allowlist entry, still passing on base) joins the baseline commits.

## Scopes considered

### 1. As implemented (keep)

`validate_non_local` takes an opt-in `schemes` tuple, compares schemes case-insensitively, and refuses hosts that requests or urllib would read differently (percent-escapes, and requests' prepared host for http(s)). The http file source checks the initial URL, every redirect hop and the final URL for http, https and ftp. TRS servers built from user URLs and the remote ZIP source send every request through `ValidatingSession`, and remote ZIP requests have a timeout. Both adapters live in `galaxy.files.uris`.

| Pros | Cons |
|---|---|
| <ul><li>The first evaluation's expansion is done, and the reviews since have found no gaps in it (Codex had no findings, and the thermo review fixed one assert).</li><li>Clean history: 4 baselines, 4 pure refactors, 8 changes, each with a red step.</li><li>Port conflicts are known: 4 files on 26.0 and 7 on 26.1, unchanged by the re-scope.</li></ul> | <ul><li>The stock DRS source checks its download leg, but not the two lookups that produce the download URL. That's inconsistent within one source, the same way the http source was with ftp before the re-scope.</li><li>A reviewer who sees `ValidatingSession` wrap TRS and remote ZIP will look for the other stock `requests.get` on a user-supplied host.</li></ul> |

### 2. Modest expansion: DRS lookups through `ValidatingSession` (recommended)

Scope 1, plus `fetch_drs_to_file` opens one `ValidatingSession(fetch_url_allowlist or [])` and passes it to `retry_and_get` and `_get_access_info`. The session keeps `timeout`, and adds Galaxy's user agent the way `TrsServer` does. Fold in `retry_and_get` passing `headers` on its 202 retry.

| Pros | Cons |
|---|---|
| <ul><li>All three stock file sources that fetch user URLs (http, remote ZIP, DRS), plus TRS servers built from user URLs then go through the same two adapters. That's the project's stated goal.</li><li>No new plumbing: the allowlist is already a `fetch_drs_to_file` argument. The work follows the remote ZIP commit's shape: about 10 lines in `lib/`, tests with `responses` plus `fake_public_dns`, the way `test_drs.py` already works.</li><li>The headers fix is a real bug in the same function: admin-configured DRS headers are lost on retry. 26.1 still has it.</li></ul> | <ul><li>Admins whose DRS servers sit on addresses outside the public range must add them to `fetch_url_allowlist`. That needs a release note, the same as for ftp.</li><li>26.0 and 26.1 rewrite `util.py` (compact identifiers, S3 download; +317 and +375 lines). The port branches need their own DRS edit, and must decide about 26.x's added `requests.get` calls. They don't need new branches, only more conflicts in branches that are already needed.</li><li>A 17th commit, after a re-scope already happened.</li></ul> |

<details>
<summary>Why DRS is different from the sources set aside last time</summary>

The first evaluation set aside dataverse, invenio and elabftw because they "don't consult the allowlist at all today". Checking them would be a new policy for user-templated file sources, with template and config questions. DRS has none of those:
- It's a stock plugin (`_ensure_loaded("drs")` in `galaxy.files`), not a user template.
- `DRSFilesSource._allowlist` already reads `fetch_url_allowlist` and hands it to `fetch_drs_to_file`, which already forwards it to the access URL download.

So the policy is already decided and plumbed. Only the two lookups don't apply it. That matches the TRS case the branch already covers: user URL in, plain `requests.get`, now `ValidatingSession`.

Compact identifiers (`drs://prefix:id`) aren't supported on 25.1 (`_not_implemented`). On 26.x they resolve through identifiers.org, which is a fixed, configured host and not a user URL. The port branches can treat it like configured TRS servers.

</details>

### 3. Contraction: drop the redirect handler's `schemes` parameter

From thermo round 2: the handler's scheme refusal can't fire for its only caller, because urllib's `http_error_302` already limits redirects to http, https and ftp. Instead, hard-code urllib's scheme set in the handler and drop `FETCH_SCHEMES`' second use.

| Pros | Cons |
|---|---|
| <ul><li>Removes a parameter, a branch and a caller-side constant.</li></ul> | <ul><li>Both shapes are correct. The current one keeps the handler's default the same as `validate_non_local`'s, which suits a future dataverse or invenio caller.</li><li>Churns commits 11 and 16 on a release branch for no change in behavior.</li></ul> |

Disposition: keep as implemented.

### 4. Items carried forward (no change)

| Item | Disposition |
|---|---|
| Up-front check on `req.full_url` instead of the final `page.geturl()` (thermo 2) | Leave. It changes behavior only under an admin-customized `url_regex`, and it interacts with 26.1's `_requote_http_url`. Better handled on a port branch or dev. |
| Single URL reader in `validate_non_local` | Dev, as decided in round 1. It changes bracketed IPv6 handling and creates whole-function conflicts on 26.x. |
| Remote ZIP checks its source twice (`validate_uri_access` plus the first session send) | Leave. One extra DNS lookup, and `validate_uri_access` also does the `file://` admin check. |
| dataverse, invenio and elabftw lookups | Out of scope, already set aside. The adapters are ready in `galaxy.files.uris` when that policy is decided. |
| Tool shed and tool data table URL fetches | Out of scope. They're admin-configured, like configured TRS servers. |
| `bounded_get` consolidation | Dev or 26.1, with the single-parser work. |
| Test nits (`_realize_with_redirect` name, `fake_public_dns` re-export) | Leave. Renaming would churn several commits through autosquash. |
