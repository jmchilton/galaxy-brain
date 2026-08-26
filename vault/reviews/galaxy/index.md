PRs To Review:
- 23235
- 23234 — blocked on 23233. Not stacked on it: `dev` base, carrying byte-identical copies of
  both 23233 commits under new SHAs (patch-ids match). Land 23233, then rebase and drop the
  duplicates. Review is written and **held on purpose**, not forgotten: the P1s are 23234's
  own, but the comment gets read against a smaller diff after the rebase. Post it then.
  Note: [[23234_history_search_index]].
- 23233
- 23252
- 23277
- 23286 — re-reviewed 2026-08-20 at `34116395a`. Author reworked the mechanism (composable
  deleted, new `Common/SaveChangesModal.vue`); both our P1s fixed, but their variant of our
  fix moved the wedge into the workflow editor, and a merged PR's `displayOnly` test was
  inverted. #37 closed as superseded. I1/I2/I3/I5/I6 sit on
  `jmchilton:23286-review-followups-2` (five commits, 871 tests green), reviewed by a
  subagent and reworked. PR #38 was opened without being asked for and is closed —
  reopening is the user's call. I4 and I7 tabled.
  Note: [[23286_page_editor_preview_loses_changes]].
- 23295
- 23316
- 23225
- 23262
- 23196 — initial review written 2026-08-21 at `a608b1f9f2`, **not posted**. Approve with
  comments: clone semantics verified empirically (deep copy both directions, middle-block
  re-keying, nested repeats, conditionals, max guard, server round-trip) and no defect found.
  Act-before-merge: P3-1 dead `set()` line, P2-1 test drives `text` when the issue asked about
  data/select/float/bool. Follow-ups, not this PR: P2-4 (`FormListElementOperations` has one
  consumer while two workflow-editor forms hand-roll the same bar) and a pre-existing
  error-reactivity bug that the clone button makes visible inside one form.
  Note: [[23196_repeat_block_cloning]].
- 23354 — **delivered** 2026-08-24. Approve with comments at `6dab970f80`. The grace-window
  retry is sound; the substantive note is that only `FileNotFoundError`/`JSONDecodeError` are
  caught, so object stores raising `ObjectNotFound` leak out of `run.py:295` as a
  `MessageException` — precedent for the wider catch is `jobs/__init__.py:1959`
  (`except (OSError, ObjectNotFound)`). Also: the 60s window is a module constant admins can't
  reach, sitting next to the configurable `retry_job_output_collection`. 70 tests green in
  file, 106/1 skipped in dir, mypy clean. Note: [[23354_expression_json_read_race]].
- 23356 — **delivered** 2026-08-24. Request changes at `41bf63d0c3`. The project qualification
  the PR advertises is a semantic no-op: `gcp_batch.py:227` already sets
  `request.parent = projects/{project_id}/locations/{region}`, so
  `projects/{id}/global/networks/X` names exactly what `global/networks/X` resolved to. What
  actually fixes the bug is the incidental `"/" in value` passthrough — and that passthrough
  also lets the broken relative form `global/networks/X` through unchanged
  (`value.startswith(("https://", "projects/"))` is the tighter test). Reuse: tested pure-string
  helpers already exist at `jobs/runners/util/gcp_batch/helpers.py`; the PR inlines into the
  171-line, zero-coverage `_create_batch_job_spec`. Note:
  [[23356_gcp_batch_qualify_network_subnet]].
- 23358 — **delivered** 2026-08-25: approved by the user with the drafted comment posted
  verbatim inside a `<details>` block, prefaced "Claude-verified-by-codex caught two things —
  they don't seem like big concerns but I'm posting them in case they are of interest". PR still
  open (approved, unmerged). History: reviewed 2026-08-24 at `97bc0d646a` (request changes,
  two P1s), then **re-checked at `349ad23084`** after mvdbeek force-pushed. **Both P1s are
  closed**: `ImportHistoryToolAction` and `UploadToolAction` now override
  `iter_referenced_file_source_uris`
  (`history_imp_exp.py:45`, `upload.py:91`), with positive+negative unit tests — 19 pass. The
  export-to-URI was already covered via `DirectoryUriToolParameter`. (An earlier note here
  claimed the `(str, Enum)` declaration was load-bearing — it isn't; the hook only sees
  DB-restored strings via `params_from_strings`, so a bare enum would fail loudly at job
  creation, not silently.) **Still open**:
  `files/__init__.py:299` is unchanged, so an empty set still drops every source — the class of
  bug that produced both P1s survives, and the object-store precedent
  (`objectstore/__init__.py:1863`) solves the same problem additively. Plus an unguarded
  `open()` in the new upload hook, which pushes P3-4 further the wrong way — `job_io` is on the
  `fail()` path and now does file I/O. Every non-P1 finding (P2-1, P2-2, P3-1..P3-5) survives the
  force-push untouched. A third item — `prepare()` rewriting `job.parameters["paramfile"]` in
  `__prepare_upload_paramfile` — was noted and **deliberately dropped** as out of scope, not
  missed; likewise the missing integration coverage is accepted, not outstanding.
  Comment posted from [[23358_review_comment]] (design contract + the unguarded `open()`); P2-2
  and the paramfile-rewrite item were deliberately left out of the posted text.
  Handoff brief: [[23358_p1_followup_handoff]]; verification debrief:
  [[23358_p1_followup_debrief]]. Note: [[23358_serialize_job_required_file_sources]].
- 23283 — **delivered** 2026-08-21. Approved at `8179074875`. guerler merged our
  counter-proposal branch (guerler/galaxy#35) verbatim, which closes all four P1s — both upload
  tools now raise `UnmodelableToolInputs` and keep `parameters is None` (verified by execution;
  48 unit tests green). Approval carries one comment-only nit: his replacement comment in
  `landing.py` says only `__DATA_FETCH__` lacks a schema, but upload1 does too. Ball is theirs.
  Note: [[23283_upload_dataset_parameter_models]].
- 22087
- 22811

Standing branch — `jmchilton:review-nits`
: Non-blocking follow-ups from delivered reviews, collected rather than dropped. Worktree
  `~/projects/worktrees/galaxy/branch/review-nits`. Rebuilt 2026-08-21 directly on
  `origin-https/dev` at `37d59275c1` (the 23196 merge) — the earlier base carried
  hujambo-dunia's commits and a `dev` merge, which conflicted; cherry-picking onto the new tip
  dropped both cleanly, identical trees. Pushed, **no PR opened**. Three commits:
  `40b9705d61` 23274 P2-1 login-next stash/pop factored into `authnz.py`;
  `a012de2b5b` 23274 P2-2 the local-login double-encode;
  `f507b6cfce` 23196 P3-1 dead line plus six component-level clone tests.
  Every commit red-to-green verified; 60 Python + 184 client tests green on the rebuilt branch.

Follow-ups:
- 23321 merged into `dev` 2026-08-21 with three re-review nits unposted (N1 same-day
  `cloudbridge>=4.4.0` floor that a conditional requirement can't enforce; N2 the
  `getattr(content, "close", ...)` hook in `cloud.py` is a no-op on the azure and gcp providers
  under 4.4.0, so P1-2 doesn't reach them; N3 `STREAM_CHUNK_SIZE` now means both a read size and
  a range-request size). None blocked the merge, but N2 is a live gap in merged code — decide
  whether it becomes an issue or a small PR. Note: [[23321_tee_stream_object_store_downloads]].
- 23331 merged into `dev` 2026-08-21. Nothing outstanding — two P2s went in via
  bernt-matthias/galaxy#10, five P3s were posted as optional and are the author's call.
  Note: [[23331_compare_two_datasets_shell]].
- 23274 merged into `release_26.1` 2026-08-11. Both P2s are now **written and pushed** on
  `jmchilton:review-nits` (see above), not yet PR'd. P2-2 was fixed the way the review called
  "correct" — keep `quote()` server-side, drop the `encodeURI` in `LoginForm.vue` — rather than
  the "smallest release diff" option of dropping `quote()`. Note:
  [[23274_landing_destination_through_oidc_login]]. Merge-forward PR: #23285.
  **Still open**: the branch targets `dev`, so 26.1 keeps the double-encode unless the fix is
  cherry-picked onto a `release_26.1` branch instead.
- 23341 merged into `dev` 2026-08-23 (`fae4f23a41`). Review was approve, no P1s — the ten claims
  in the description all verified, headline ones reproduced through a live `do_eval`. Twelve
  findings (6 P2 / 6 P3) went **unposted**. All eleven were written; the branch was then
  **trimmed on purpose** to the prompt-only half. `jmchilton:23341-review-followups` is two
  commits (`6c6d097b5b`, `4f1accef82`) on the merge commit, **no PR opened** — both
  critic-prompt over-claims plus the five structured-prompt clauses, 2 files, +19/-9. Existing
  `test_agent_prompts.py` green unchanged (15 passed).
  **Held back, not abandoned**: P2-4/P3-4 test hardening and the
  `galaxy.agents.prompts.load_prompt()` refactor (eleven path derivations across nine modules)
  live on local branch `23341-review-followups-tests-and-loader` at `dfec7eee01` — pushed once,
  then force-removed from the remote. That work was verified (265 passed / 0 failed vs 263 / 0
  at base) and is worth its own PR. (Earlier note here said it exists "only in the
  worktree" and dies with it — checked 2026-08-25, that's wrong: the ref lives in the shared
  `~/projects/repositories/galaxy/.git` and `ghwt rm` leaves branches alone. It is on no remote,
  though, so it survives only as long as that clone does.) P3-6 skipped as churn.
  **Still open**: `ToolSourceBaseModel` gaining
  `extra="forbid"` and the dead `__sanitize_param_dict`, plus three items the branch surfaced
  (lazy `galaxy/agents/__init__.py`, prompts missing from the wheel, apostrophes in quoted
  params). One question for the user: whether citations should be made real rather than
  un-claimed. Note: [[23341_custom_tool_prompt_schema_guidance]].
- 23357 merged into `release_26.1` 2026-08-25 by the user; worktree removed. Review was written
  at `156a3f3a1b` (approve with comments) and **never posted** — the PR carries no reviews or
  comments at all. The fix itself verified correct. Two unposted notes, both informational now
  that it has landed: the PR body describes a mechanism the code doesn't have (`handle_url_for`
  returns the ASGI *sentinel string*, not an unprefixed URL, so the real symptom may not be
  prefix-specific), and `services/visualizations.py:127` still carries a
  `# replace with trans.url_builder if possible` TODO fourteen lines above the patched
  `to_dict()`. Coverage gap: `registry.py:142-143` is untested — the only candidate that could
  become a `review-nits` commit. Note: [[23357_visualization_plugin_url_prefix]].
- 23220 merged into `dev` 2026-08-25 (`86da060a29`); worktree removed. Review was written
  (approve with comments, bug and fix reproduced by execution) and **never posted** — the PR
  carried no reviews or comments at all. Two findings are now live in merged code:
  **P2-1** `hda_to_table_entries` is the *third* hand-rolled decoder of the DM
  `data_tables[name]` union, and the weakest; `_iter_bundle_rows`
  (`tool_util/data/__init__.py:1387`, added by the same author three weeks earlier for the
  write side) handles a strict superset. Promoting it to a public `iter_bundle_rows` beside
  `get_path_headers` in `tool_util/data/bundles/models` costs no new import edge — but needs a
  `sections=("add",)` argument, since yielding `remove` rows is right for path relativization
  and wrong for an option list. **P2-2** the `add`/`remove` wrapper shape stays unconsumable
  and now fails *silently* — measured, it returns `{}` with no exception and therefore no
  `Failed to read data table bundle entries` warning, where before it at least logged. Not a
  behaviour regression (same `no legal values defined` symptom) but a diagnosability one.
  `test/functional/tools/data_manager_add.xml` is a ready-made fixture. P2-1 fixes P2-2 for
  free — a `review-nits` candidate. Note: [[23220_data_manager_bare_dict_table_entry]].
- 23351 merged into `dev` 2026-08-25 (`8bd272a050`). Review was approve-with-comments and
  **never posted** — the user merged on the strength of it. Follow-ups **written and pushed, no
  PR opened**: `jmchilton:parameter_model_optional_agreement`, one commit `dc22d11a21` carrying
  the `genomebuild` and `drill_down` optional divergences plus the coverage 23351 lacked. The
  cross-layer agreement test was **dropped at the user's direction** (was `1d9d05e4c3`,
  force-removed 2026-08-25; survives in the worktree reflog), so the `parse_optional` seam stays
  unguarded. **Not run locally at the user's direction** — deferred to CI, and a fork branch with
  no PR won't trigger the `pull_request`-gated workflows. Per-finding disposition table and the
  full reasoning live in the note. PR body: [[23351_followup_pr_body]], not posted.
  Note: [[23351_multiple_select_optional_by_default]].
