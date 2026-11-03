Run via Claude Opus 5.5.

# harden_url_abstractions_25.1: re-scope debrief

The first [scope evaluation](earlier_drafts/1/scope_evaluation.md) recommended a modest expansion. The pre-expansion branch is kept as `harden_url_abstractions_25.1_alt_original_scope` at `178587b7e40` ([alts/original_scope.md](alts/original_scope.md)).

The expansion added three things, plus fixes from the [re-scope review](subagents/normal_review_rescope.md). The branch is now head `46d9408d239`, 15 commits, rebased onto `release_25.1` at `83296278444`.

- **`ftp://` in the http file source:** `validate_non_local` takes an opt-in `schemes` tuple (default http/https, so other callers are unchanged), and `ValidatingRedirectHandler` takes the same tuple. The http file source passes http, https and ftp, so it checks the initial URL, each redirect target and the final URL for all three schemes.
- **The redirect handler moved:** `ValidatingRedirectHandler` now lives in `lib/galaxy/files/uris.py` from the commit that adds it, next to `ValidatingSession`.
- **Remote ZIP timeouts:** `DEFAULT_SOCKET_TIMEOUT` on the HEAD and range requests, in their own commit.
- **Fixes from the re-scope review:**
  - a bare `http` with no `://` is returned unchanged again (`upload_common`'s pasted text), and baseline cases now pin it;
  - hosts with percent-escapes no longer verify for any scheme, since urllib decodes escapes in hosts that requests leaves alone;
  - the history no longer adds the redirect-scheme refusal in one commit and changes it in the next.

All lint checks and `test/unit/files/` + `test/unit/workflows/test_trs_proxy.py` pass at every commit, with 180 passed and 18 skipped at the head. The first round's hardening debriefs moved to `earlier_drafts/1/`, and hardening reruns from the start.
