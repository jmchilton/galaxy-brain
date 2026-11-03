Run via Claude Opus 5.5.

# harden_url_abstractions_25.1: scope evaluation

**Recommendation: expand, modestly.** Keep everything that's on the branch and add three small items in code it already touches. (1) The stock http file source checks `ftp://` URLs the way it checks http(s), via an opt-in scheme parameter on `validate_non_local`. (2) The urllib redirect handler moves into `galaxy.files.uris` next to `ValidatingSession`, so both per-client adapters live in one module. (3) The remote ZIP HEAD and range requests get `DEFAULT_SOCKET_TIMEOUT`. Each one fits the branch's goal (one URL reading, every fetch hop checked) and adds only a few lines in files that already conflict on 26.0 and 26.1, so porting costs about the same. Three things stay out: the user-templated RDM sources (dataverse, invenio, elabftw) need a policy decision first, admin-configured fetchers stay unchecked like configured TRS servers, and collapsing to a single parser belongs on dev.

Reviewed at head `178587b7e40` against `origin/release_25.1`. Sources: normal review 1, test challenges, Codex review, the thermo-nuclear review, the baseline refactor, and the caller's list of known out-of-scope items. Each item they raised is covered below.

## Possible Decompositions

The branch adds 451 lines and removes 38: about 110 in `lib/`, the rest tests. Commit numbers follow `baseline_refactor.md`. One ordering constraint applies: `ValidatingSession` arrives in the TRS commit (11) and the remote ZIP commit (12) uses it. So either TRS lands before remote ZIP, or the session moves into the `uris.py` PR.

- **A. As one PR.** All 13 commits, with the baselines first.
- **B. Baselines + per-consumer PRs:**
  1. Baseline tests (1–4) plus the test patch helper (5). Tests only.
  2. `validate_non_local` reading (8–9).
  3. http file source (10, 13).
  4. TRS (6, 11).
  5. Remote ZIP (7, 12).

  PRs 3–5 depend on 2. PR 5 depends on 4 unless `ValidatingSession` moves into PR 2.
- **C. Shared pieces first, then consumers:**
  1. Baselines (1–4).
  2. Pure refactors (5–7), no behavior change.
  3. `uris.py` changes (8–9 plus `ValidatingSession`, taken out of 11).
  4. All three consumers' hop checks (10–13).

  Each consumer commit then carries only its wiring and tests.
- **D. Two PRs:** (1) baselines plus the `validate_non_local` reading (1–4, 8–9). (2) Redirect hops (5–7, 10–13).

  This matches the project's two halves: one URL reading, and every hop checked.

With the recommended expansion, the `ftp://` item joins the http file source piece, the handler move joins the `uris.py` piece, and the timeouts join remote ZIP.

## Scopes considered

### 1. As implemented

`validate_non_local` matches schemes case-insensitively, and it refuses URLs whose host requests would read differently from urllib/`getaddrinfo`. The http file source checks the initial URL and every redirect hop, and refuses redirects to schemes other than http(s). TRS servers built from user URLs and the remote ZIP source run every request through `ValidatingSession`. Configured TRS servers are unchanged.

| Pros | Cons |
|---|---|
| <ul><li>One concern per commit, baselines first, a red step for each fix.</li><li>Covers every caller of `validate_non_local` that follows redirects itself.</li><li>Port conflicts are known and short (see normal review 1).</li></ul> | <ul><li>The http file source fetches `ftp://` with no host check, while its redirect handler already refuses ftp targets. That's inconsistent within a single source.</li><li>The two per-client adapters live in different modules (`http.py`, `uris.py`), so a future urllib caller has nothing obvious to reuse.</li><li>Remote ZIP requests still have no timeout, though the branch rewrote those functions.</li></ul> |

### 2. Modest expansion (recommended)

Scope 1, plus:
- `validate_non_local(..., schemes=...)`: the default stays http(s). The http file source passes http/https/ftp. For `ftp://` the requests host comparison is skipped, because only urllib fetches ftp.
- `ValidatingRedirectHandler` moves to `galaxy.files.uris`.
- `timeout=DEFAULT_SOCKET_TIMEOUT` on the remote ZIP HEAD and GET.

| Pros | Cons |
|---|---|
| <ul><li>The http file source treats every scheme it fetches the same way, both at the initial URL and at redirects.</li><li>Other callers' behavior doesn't change, because ftp is opt-in. Admin-configured FTP file sources (`ftp.py`, which wins on host match) aren't affected.</li><li>`galaxy.files.uris` becomes the single place for URL checks and their per-client adapters, ready for a later urllib consumer.</li><li>Every edit lands in a hunk that already conflicts on 26.0 and 26.1, so port cost barely moves.</li></ul> | <ul><li>Admins who fetch through the http source from FTP hosts outside the allowlist will now be refused, the same as for http(s). That needs a release note.</li><li>Adds a parameter to a widely used function on a release branch.</li><li>The handler move touches the http source's commit again. This is cheap, because it no longer matches the old cherry-pick.</li></ul> |

<details>
<summary>Why ftp is opt-in rather than always checked</summary>

`_fetch_util.py` sends raw `ftp://`/`ftps://` URLs through `validate_non_local`, and `ftp.py`'s `score_url_match` routes `ftp://{host}` URLs to admin-configured FTP sources that use admin credentials. If `validate_non_local` checked ftp for every caller, fetch-API requests to an admin-configured FTP server on a non-public address would start failing unless the admin also added it to the allowlist. That is a regression risk on a release branch. The stock http file source is the only place where arbitrary `ftp://` URLs get fetched, so the check belongs there. Folding the http source's scheme test (`http.py:48`) into the same parameter removes its separate `urlparse(...).scheme` check.

I checked the comparison helper: `_host_matches_requests` returns True for plain ASCII ftp hosts, but False for IDN hosts (`ftp://bücher.example/`), because `prepare_url` doesn't IDNA-encode non-http schemes. So for ftp the comparison has to be skipped, not just reused.

</details>

### 3. Expansion: other fetchers that follow redirects themselves

Add hop checks to dataverse and invenio (`urlopen` downloads), elabftw (its own `requests.Session`), the tool shed `repository_dependency_manager` (`urlopen`), and tool data table URL fetches.

| Pros | Cons |
|---|---|
| <ul><li>Every redirect-following fetcher would share one adapter.</li><li>Scope 2 already moves the urllib adapter where these could use it.</li></ul> | <ul><li>The tool shed and tool data table URLs are admin-configured. The branch already leaves configured TRS servers unchecked, so checking these would be inconsistent with that decision.</li><li>dataverse, invenio and elabftw don't consult the allowlist at all today: not for the first request, not for API calls, not for downloads. Adding it is a new policy for user-templated file sources, with its own template and config questions. It isn't a redirect-consistency fix.</li><li>More files with their own 26.x histories means more port branches conflict.</li></ul> |

<details>
<summary>Suggested follow-up</summary>

Give the user-templated RDM sources their own branch: decide whether file-source templates whose URL comes from a user variable should run through `validate_non_local` or `ValidatingSession`, and how the allowlist reaches them (`FileSourcesConfig.fetch_url_allowlist` is already serialized to jobs). Scope 2 gives that branch both adapters in one module.

</details>

### 4. Expansion: one parser in `validate_non_local`

Replace the hand-written netloc splitting (credentials, IPv6 colon counting, `split_port`) with `urlparse(url).hostname`/`.port`, and keep the requests comparison.

| Pros | Cons |
|---|---|
| <ul><li>Removes about 30 lines of hand parsing. The thermo-nuclear review calls this the real simplification.</li><li>Bracketed IPv6 would resolve and go through the allowlist, instead of failing to verify.</li></ul> | <ul><li>26.0 and 26.1 both edit this function (the `strip()` change, an empty-netloc check, `UnicodeError` handling). A rewrite turns three small conflicts into a whole-function conflict on both ports, which runs against the "small enough to port" constraint.</li><li>Changes IPv6 behavior on a release branch.</li></ul> |

<details>
<summary>Where it fits</summary>

It fits best on dev, or on the newest port branch, together with consolidating `ValidatingSession` with `bounded_get` (`citation_fetch_hardening_26.1`), which normal review 1 also raised. Both are "one URL checker" cleanups that the per-release branches can't absorb cheaply.

</details>

### 5. Contraction: `validate_non_local` + http file source only

Drop TRS (6, 11) and remote ZIP (7, 12) and leave them for a follow-up.

| Pros | Cons |
|---|---|
| <ul><li>About a third smaller. The `trs_proxy.py`/`test_trs_proxy.py` conflicts on 26.1 go away.</li></ul> | <ul><li>Leaves two known callers that follow redirects without checks, which is the exact inconsistency the branch exists to remove.</li><li>Reviewers would ask why `ValidatingSession`'s natural consumers were left out.</li></ul> |

### 6. Small cleanups raised in reviews

| Item | Disposition |
|---|---|
| Redundant final `page.geturl()` check in `http.py` | Keep. Base code that 26.0 wraps in a `try`, so removing it grows that conflict. |
| `file://` prefix test duplicated in `validate_uri_access` and `TrsProxy.match_url` | Leave. Predates the branch, one line each, and `match_url`'s check exists for a different client. |
| `get_range`/HEAD with no timeout | Fold in (scope 2). The functions are already rewritten here. |
| Handler location | Fold in (scope 2). |
| `bounded_get` consolidation | Dev/26.1 (scope 4). |
| Uppercase schemes refused earlier by the fetch API's case-sensitive prefix test (`_fetch_util.py:157`) | Leave. The refusal happens before `validate_non_local` sees the URL, so the outcome is consistent. |
