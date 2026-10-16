# oidc_authorize_params_docs

- Workflow status: `merged` (refreshed 2026-10-16).
- Branch: `jmchilton/oidc_authorize_params_docs`; head `2114bf52153f669b12b9e8022571ee11bcf60130`, targets `dev` (`c63ffc2ccae`).
- Worktree: `~/projects/worktrees/galaxy/branch/oidc_authorize_params_docs`.
- [PR description](pr_description.md) · [Title choices](pr_titles.md).
- [Polish debrief](polish_debrief.md) · [Checklist](polish_checklist.md) · [Strengthening review](polish_strengthening.md).
- [Implementation debrief](implementation_debrief.md).
- CI: latest-head checks queued/pending; [docs build](https://github.com/jmchilton/galaxy/actions/runs/38643785032). Targeted local Sphinx build, XML parsing, formatting and hooks pass.
- User requested a draft PR on 2026-10-14; created against `dev` at `2114bf52153f669b12b9e8022571ee11bcf60130` with the prepared description verbatim and first proposed title.
- Standing instruction: retain draft status pending an explicit request to publish it for review.
- Human-read item is checked in the user-edited description; no approval to undraft recorded.
- Origin: gx_issues draft `oidc_extra_authorize_params`, rejected as an issue because the feature already works; see `vault/agents/gx_issues/to_file/reject_oidc_extra_authorize_params.md` (moves to `old/` once John accepts the rejection).
- Related: #23253 ("OIDC documentation outdated"), #23836 (PKCE docs, the section this one follows).

Docs only. No issue to close.

## TICK — 2026-10-15

GitHub now reports non-draft; this tick did not change its draft setting. Docs coverage passes. Unchanged package/SSH typing, container-registry resolution, and mulled conda HTTP 502 failures are unrelated to this documentation/sample XML change; failed workflows rerun. Move to `ready` based on live PR state.

## Morning refresh — 2026-10-16

GitHub confirms [#24133](https://github.com/galaxyproject/galaxy/pull/24133) merged at 2026-10-16T06:07:38Z, head `2114bf52153f669b12b9e8022571ee11bcf60130`. Removed from the active queue and archived this record under `merged/`. Clean worktree removed with ghwt after verifying pushed history.
