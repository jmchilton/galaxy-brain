Run via Claude Opus 5.5.

# harden_url_abstractions_25.1: implementation debrief

**STATUS: BLOCKED** on a scope decision from John. The second [scope evaluation](scope_evaluation.md) recommends one more item. Under the process a second recommendation parks the branch rather than re-scoping again. Apart from that, the branch is hardened.

```
created .../differential-review/snapshots/20261103T033143Z-hardening-3355e25a9b2e.json
  hardening @ 3355e25a9b2e vs origin/release_25.1 (merge-base 832962784443)
  since 20261103T004924Z-implementation-5ec20de1c2fa:
    commits: 0 same, 1 rebased, 5 changed, 10 new, 1 dropped
    hunks:   12 carried, 15 changed, 12 new, 12 dropped
```

Head `3355e25a9b2` on `jmchilton/harden_url_abstractions_25.1`, base `release_25.1` at `83296278444`. 16 commits, 11 files, +548/−42 (about 120 lines in `lib/`). Part of [URL Abstraction Hardening](../../../../../projects/url_abstraction_hardening/index.md). Alt: `harden_url_abstractions_25.1_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)).

## Decision needed

**Should the DRS file source's object and access lookups go through `ValidatingSession` too?** Fold in the `retry_and_get` bug that drops `headers` on a 202 retry. That's about 10 lines in `lib/galaxy/files/sources/util.py` plus tests.

- **Yes:** add it as a re-scope commit after commit 13. Then re-run test challenges, Codex and the scope check on that commit. The 26.0 and 26.1 ports each need their own DRS edit, because `util.py` was rewritten there.
- **No:** the branch is READY as it is, and the DRS item becomes a follow-up.

## What the branch does

`validate_non_local` (`lib/galaxy/files/uris.py`) reads schemes and hosts the way Galaxy's HTTP clients do, and every stock fetcher of user URLs checks each hop with it before requesting it.

- **Baseline tests (1–4):** cover `validate_non_local`, the remote ZIP source, the http source's redirects and ftp URLs, and TRS servers built from user URLs.
- **Refactors (5–8):**
  - a `patch_http_open` test helper;
  - `TrsServer` takes a session factory;
  - the remote ZIP source uses one session;
  - `validate_non_local` takes a `schemes` tuple, defaulting to http/https.
- **Changes (9–16):**
  - case-insensitive schemes, including the non-admin `file://` checks;
  - hosts must read the same for `urlparse`, requests and urllib, so percent-escaped hosts and requests/urlparse disagreements fail to verify;
  - `ValidatingRedirectHandler` (urllib) checks each http file source hop;
  - `ValidatingSession` (requests) checks each hop for TRS servers built from user URLs and for remote ZIP;
  - remote ZIP socket timeouts;
  - the http source checks its initial URL;
  - the http source checks `ftp://` URLs at the initial URL, each redirect and the final URL.

**Behavior changes worth a release note:**
- `ftp://` URLs to non-public addresses that the http file source fetched before now need a `fetch_url_allowlist` entry.
- URLs whose host has percent-escapes, or that requests and `urlparse` read differently, now fail to verify.
- `validate_non_local` raises `RequestParameterInvalidException` for unparseable URLs instead of `ValueError`.

**Unchanged:** configured TRS servers, `api/proxy.py` (httpx, which already checks each hop), and callers using the default schemes with ordinary URLs.

## Reviews (round 2 applies to the head)

- [Normal review 1](subagents/normal_review_1.md) and the [re-scope review](subagents/normal_review_rescope.md).
- [Test challenges](test_challenges_debrief.md): moved passing cases into baseline commits, dropped tests that only failed with `TypeError`, added a TRS user-agent test, and fixed two test mypy errors.
- [Codex](codex_review.md): no findings. Round 1's two findings are fixed.
- [Thermo-nuclear](thermo_nuclear_review.md): one cleanup, an assert in `ValidatingSession.send`.
- [Baseline refactor](baseline_refactor.md): split out the `schemes` parameter as a refactor.
- [Scope evaluation](scope_evaluation.md): the DRS item. Round 1 is in [earlier_drafts/1/](earlier_drafts/1/scope_evaluation.md) and its re-scope in the [re-scope debrief](implementation_rescope_debrief.md).
- **Kept out of scope:**
  - user-templated RDM sources (dataverse, invenio, elabftw), which need a policy decision;
  - admin-configured fetchers;
  - a single parser in `validate_non_local`, which belongs on dev.

## Forward merge

The branch doesn't merge cleanly into 26.0 (4 branch files conflict) or 26.1 (7). So [`harden_url_abstractions_26.0`](../harden_url_abstractions_26.0/index.md) and [`harden_url_abstractions_26.1`](../harden_url_abstractions_26.1/index.md) port it. The ports follow this branch's scope, so the DRS decision applies to all three.

## Validation

- ruff, black, isort, mypy and `test/unit/files/` + `test/unit/workflows/test_trs_proxy.py` pass at every commit; the head has 177 passed, 17 skipped.
- `make format` changed nothing, and mypy is clean on the 11 changed files.
- API tests, run one class at a time with pytest:
  - `test_tools_upload.py`: `test_upload_from_valid_url_spaces`, `test_upload_from_invalid_url` and `test_fetch_html_from_url` passed (3/3). These cover job-side fetches through the http file source.
  - `test_drs.py` passed (5/5).
- Not run: CI and integration tests.
- **Remaining if DRS is added:** the DRS unit tests, `test_drs.py`, and a re-check of the forward-merge conflicts.
