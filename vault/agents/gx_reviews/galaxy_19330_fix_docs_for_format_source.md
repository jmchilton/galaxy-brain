# galaxy #19330 — fix docs for `format_source` (rescue)

PR: https://github.com/galaxyproject/galaxy/pull/19330 — bernt-matthias, head `bernt-matthias:topic/fix_format_source_docs`, CONFLICTING, stale since 2025-09-23, maintainerCanModify=true.

## What it does

- XSD docs: `format_source` (and `metadata_source` in the sections example) referencing params in sections/conditionals must be `|`-qualified; collection elements selectable via `coll['forward']`. Fixes the `qual|qfile` example and drops the old "conditional name is not included" claim (false).
- Test tool `test/functional/tools/format_source_in_conditional.xml`: adds `output2` (`cond|inner_cond|input1`, fully qualified) and `output3` (`input1`, unqualified legacy alias) and switches the nested input to `tsv` so the old accidental pass (legacy_mapping `cond|input1` -> `cond|inner_cond|input1`) is visible.
- Also carried 3 debug commits (`log.error` in `tools/actions/__init__.py`, `tools/parameters/wrapped.py`).

## Comment digest

| Who | Ask | Status |
|---|---|---|
| mvdbeek | Odd to document "wrong" examples — sure they're broken, not profile/bug? | Answered by author (qualified is the desired syntax; test shows unqualified only works one conditional deep via legacy alias, per #15978). Test tool now pins behaviour. Addressed. |
| mvdbeek | Resolve conflicts + remove debug log statements | Addressed in rescue: rebased on dev, debug commits dropped. |

No inline review threads, no formal reviews, no linked issues.

## Overlap with user's recent work

- #23763 (merged 2026-09-27) rewrote the same `format_source` `<xs:documentation>` into a CDATA block about discovered collection elements + precedence. Only real conflict. Resolved by keeping #23763's block and inserting bernt-matthias's qualification/element-access sentences into it.
- #23459 (merged) added `OutputsFormatSourceReference` linter: warns on unqualified refs, errors on unknown. Consistent with this PR's "must be qualified" wording. The test tool's `output3` intentionally triggers that warning (ambiguous `input1`) — it's a legacy-behaviour test.
- #23388 runtime change doesn't touch the non-collection path this PR documents; `resolve_format_source` (`lib/galaxy/job_execution/output_format.py`) confirms element syntax `name[...]` (JSON-ish, single quotes ok) and first-dataset default.

## Rebase

Branch `rescue_19330` = origin/dev (`1eed562dfc2`) + cherry-picks:

- `26863862786` fix docs for format_source (Matthias Bernt) — XSD conflict resolved as above.
- `a1400136b57` fix test and improve for legacy mapping (Matthias Bernt) — `3dfb9f136f` "fix test" squashed in (same author, fixes expectations of the same commit). Final tool file identical to PR head.
- Dropped: `1a98d35d25`, `b7a6995c47`, `25ae0ce025` (debug logging), `d2f37d3d0c` (merge).

## Fix commits (ours)

- `28cdf403ca4` Tighten format_source/metadata_source reference docs — grammar ("pythons", double space, "referred python's"), `cond|input1` example, no-index collection default, qualification note on `metadata_source` attribute (code uses plain `inp_data.get`, so same rule).

## Validation

- `xmllint --noout galaxy.xsd` OK; test tool validates against the XSD (`xmllint --schema`).
- No `.venv` in worktree (not bootstrapped). Ran linters ad hoc (`uv run --with galaxy-tool-util`, `PYTHONPATH=lib`) on the test tool: only expected `OutputsFormatSourceReference` warning on `output3` + duplicate-label/help warnings; general linter crashed on missing `edam-ontology` (env only).
- Functional tool test (`format_source_in_conditional`) not run — needs a Galaxy server; CI will cover.
- Docs build not run.

## Head

`rescue_19330` at `28cdf403ca4` in `~/projects/worktrees/galaxy/pr/19330`. Not pushed.

## Push options

1. Force-push to `bernt-matthias:topic/fix_format_source_docs` (maintainer edits allowed). Keeps PR/discussion; rewrites author's history (drops their debug + merge commits). Probably best — the changes are theirs.
2. Push to jmchilton fork, open superseding PR, close #19330 with credit. More churn, only if author objects to force-push.

## Open questions

- Keep `output3` legacy-alias test even though the linter now warns on it? (It pins current behaviour; would fail if aliasing is removed.)
- Doc says "must be qualified" but one-level-deep unqualified still works via legacy alias and the linter only warns — "must" or "should"?
- Force-push author's branch vs superseding PR?

## Draft PR comment (unposted)

> *Posted by Claude (AI assistant) on behalf of jmchilton.*
>
> Rebased this onto current `dev` to get it moving again:
>
> - Dropped the temporary debug logging commits.
> - Resolved the XSD conflict with #23763, which rewrote the `format_source` attribute docs for discovered collections — the qualification / element-access sentences are merged into that block.
> - Squashed "fix test" into the test commit it corrects; authorship kept.
> - Added a small follow-up commit polishing the wording (qualified example, no-index collection default, same note on `metadata_source`).
>
> The qualified-reference guidance lines up with the `OutputsFormatSourceReference` linter from #23459. Test tool unchanged from your last version. Thanks for the digging on the legacy mapping behaviour!
