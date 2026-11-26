# Implementation debrief

```
created .../tool_security_static_findings/differential-review/snapshots/20261126T153646Z-revision-d4e4f68dd259.json
  revision @ d4e4f68dd259 vs origin/dev (merge-base ce63095e7a8a)
  since 20261126T041329Z-hardening-d4ae281e442c:
    commits: 1 same, 1 rebased, 1 changed, 3 new, 98 dropped
    hunks:   85 carried, 0 changed, 0 new, 0 dropped
    new     005924736eae Add a static security review of tool command and configfile templates
    new     6cda8d23eb07 Add a declarative spec, access patterns and docs for the security review
    changed 6779934056ae Catalog the security review's rules, classify what it cannot decide (21 differing hunks)
    new     d4e4f68dd259 Review tool directories with the security review CLI, add --fail-on
```

**STATUS: READY.** This revision only rewrites the history. The code is unchanged.

- Head moves from `d4ae281e442` to `d4e4f68dd25` on `jmchilton/tool_security_static_findings`. The old head is kept as alt `tool_security_static_findings_alt_cherry_pick_history` (`alts/cherry_pick_history.md`).
- John authorized the rewrite on 2026-11-26 without checking with mvdbeek first.

## Commits (on `ce63095e7a8`)

1. `7ea120eef20`, mvdbeek: "Move ToolParameterSanitizer to galaxy.tool_util.parser".
   - Reused unchanged, so it keeps its SHA and has no Claude trailer. If the move lands on dev first, the branch drops it on rebase.
2. `005924736ea`, mvdbeek, co-authored by John: "Add a static security review of tool command and configfile templates".
   - The analyser, the judge, the original file-only CLI, the console script and the analyser tests.
3. `6cda8d23eb0`, John: "Add a declarative spec, access patterns and docs for the security review".
   - The spec, the runner, `patterns.py`, the admin docs and `MANIFEST.in`.
   - The tree after this commit equals the alt `_alt_original_scope` (`92320a751cb`).
4. `6779934056a`, John, co-authored by Marius: "Catalog the security review's rules, classify what it cannot decide".
   - `rules.py`, `classify.py`, the spec `codes` and the generated Rules and codes docs.
5. `03acc356d7c`, John: "Pin the security review CLI's text and JSON output".
   - The pin of the old CLI, kept separate so commit 6's test diff shows the change in behaviour.
6. `d4e4f68dd25`, John, co-authored by Marius: "Review tool directories with the security review CLI, add --fail-on".

How the commits were built: commits 2–4 are tree snapshots restored from `92320a751cb` and `d4ae281e442` by path. Commit 4's docs are HEAD's docs with the old CLI prose (one hand edit), and commit 6 restores the full HEAD tree.

Every message describes static behaviour only. None of the commits carries a "Baseline tests" prefix. The brief mentioned one real baseline-tests commit, but none exists: both prefixed commits tested code that is new in this branch. The sanitizer move goes first instead.

## Checks

- `git diff d4ae281e442 d4e4f68dd25` is empty. Both trees are `86b9efe7716`, and the merge-base is still `ce63095e7a8`.
- Security unit tests at each commit:

  | Commit | Passed |
  |---|---|
  | 2 | 488 |
  | 3 | 556 |
  | 4 | 566 |
  | 5 | 569 |
  | 6 | 590 |

  Commit 1 was not re-tested. It is the unchanged earlier commit.
- ruff, black and isort are clean. mypy from `lib/` shows the same 22 errors in 11 unrelated modules as the base.
- Pushed with `--force-with-lease` from `d4ae281e442`.
- rerere: `rerere.enabled` was unset in the shared clone, and `rr-cache` (293 older entries) existed, so rerere was implicitly on. It is now set to `false`, and the entries are untouched. No conflict resolution was used.

## Children

`tool_patches_static_findings` and `tool_security_runtime` are built on `d4ae281e442`. Move them with `git rebase --onto tool_security_static_findings d4ae281e442 <child>`. The tree is identical, so this needs no conflict resolution.

## Decisions for John

1. ~~**The sanitizer move (`7ea120eef20`).**~~ Decided (John, 2026-11-26): stays the first commit of this branch; no re-export shim at the old path.
2. **PR split.** `scope_evaluation.md` lists options A–F. The new history splits cleanly after commit 3, which is the original scope.
3. **Behaviour.**
   - Non-XML tools make the run exit 1.
   - The `unchecked`/`uncheckable` naming.
   - `--judge` doesn't affect `--fail-on`.
   - `classify` gates on code level only.
4. **Spec.**
   - Should cases pin the classified `uncheckable_locations`?
   - Should `path_like_name` fold into `element_identifier_shell_injection`?
   - Should `level` become an expectation?
5. **Analyser restructuring (for mvdbeek).**
   - Split `interp.py`.
   - Use a registry for the call models.
   - Use `Rule` at the emit sites.
   - Remove the thread-local recording.
   - About 20 "job check" comments remain.
