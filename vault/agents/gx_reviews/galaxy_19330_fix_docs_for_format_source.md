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

## Linter follow-up (2026-09-29)

Pushed `d5355c9e1f4` to jmchilton:fix_format_source_docs: `format_source`/`structured_like` linting now resolves against runtime input keys.
- Qualified paths now include repeats (`name_N|`). The legacy alias drops conditional/section names but keeps repeats, as `visit_input_values` does.
- A single collection selector is accepted. #23459 wrongly flagged it as an error ("does not match any input") on IUC flash, sickle and fastq_paired_end_interlacer.
- Unmatched pipe paths, and repeat-nested names without a prefix, are now errors with a "Did you mean" suggestion. Legacy aliases stay warnings.
- `<data>` nested in output collections is now linted. The `OUTPUTS_COLLECTION_FORMAT_SOURCE` fixture gained the `input_readpair` input it had always implied; its assertions are unchanged.
- The XSD now says "should" rather than "must" and documents repeat indices.

Survey rerun with the new linter (see galaxy_19330_iuc_reference_survey.md): the only new errors are 5 in iuc barcode_splitter, fixed in tools-iuc#8471. The 8 galaxytools errors were already errors before. The selector false errors are gone.

Tests: `test_tool_linters.py` gives 112 passed and 1 failed. The failure is `test_linting_cwl_tool`, which needs CWL deps missing from the ad hoc uv env; there is no `.venv`. The 7 new tests were red before the linter change.

## Branch review (d5355c9e1f4)

Reviewed `git diff origin/dev...HEAD` (fresh `origin/dev`). Suite: 112 passed, 1 env failure (cwl). I confirmed each "verified" item with a probe script (scratchpad `probe.py`/`probe2.py`) or by reading the runtime code.

### 1. High: the legacy alias model is wrong. Runtime drops only the *innermost* conditional/section (verified)
`output.py` `_InputReferences._visit` (conditional/section branch passes `legacy` through; repeat branch appends to `legacy`). In `visit_input_values` (`tools/parameters/__init__.py:249-266`), conditionals and sections recurse with `parent_prefix=name_prefix`, which is the *full* prefix of the container. Repeats recurse with `parent_prefix=new_name_prefix`. So the legacy key is the qualified path minus only the nearest grouping segment, and only when that grouping is a conditional or section. The follow-up note above ("drops conditional/section names but keeps repeats") describes it wrongly too.
- The branch's own `format_source_in_conditional.xml` shows this. In the `extra_nesting` case, `output1` (`cond|input1`) gets `tsv` and `output3` (`input1`) falls back to `data`. The linter says the opposite: it warns that `input1` is an "ambiguous" match for both params.
- Sections `s1 > s2 > p` with `format_source="s1|p"`: runtime resolves it, but the linter gives the **error** "does not match… Did you mean 's1|s2|p'". With `format_source="p"`, runtime fails, but the linter only warns.
- `cond > repeat files > input1` with `format_source="files_0|input1"`: runtime has no such key, but the linter only warns ("use cond|files_0|input1"). It should be an error.
- Fix: in `_visit`, conditionals and sections should call `self._visit(child, qualified + [name], qualified)`. Repeats should call `self._visit(child, q + [seg], q + [seg])`, where `q = qualified`. Add fixtures for nested sections and for a repeat inside a conditional. Also fix the XSD sentence "Unqualified names inside sections and conditionals still resolve", which should say "the name of the *immediately* enclosing section/conditional may be omitted".

### 2. Medium: `structured_like` uses different resolution from `format_source`, but shares its legacy logic (verified by reading)
`execute.py:578` `sliced_input_collection_structure`:
- It allows an unqualified recursive search only when `profile < 26.0`. That search drops *all* nesting, so it is not the same rule as `LegacyUnprefixedDict`.
- For profile ≥ 26.0, unqualified names raise "Failed to find referenced collection", but the linter only warns.
- The search walks nested state dicts and never enters repeat lists, so `r_0|rc` can never resolve. The linter accepts that value silently.
- It does not check the parameter type. `structured_like="c|s"` (a select) produces only the unqualified warning.

Suggestion: pass per-attribute rules (legacy allowed, which legacy shape, repeats allowed, expected kind) instead of the bare `allow_element_selector` bool. Error on unqualified names for profile ≥ 26.0, and on repeat paths and non-collection targets.

### 3. Medium: legacy aliases fail silently after the job runs (verified by reading)
`<collection format_source>` for discovered elements (`output_collect.py:215-227`) and `metadata_source` on discovered elements (`MetadataSourceProvider`) resolve against `job.input_datasets` / `job.input_dataset_collections` association names. Those are plain dicts keyed by `prefixed_name`, with no `LegacyUnprefixedDict`. An unqualified reference there silently falls back to the default format or metadata. So for `collection[@format_source]` with `<discover_datasets>`, a legacy match should be an error, not a warning. The new XSD text ("still resolve for backward compatibility") is wrong in exactly the 26.1 case the same docstring then describes.

### 4. Low: `metadata_source` is documented but not linted (verified)
The XSD now gives qualification rules for `metadata_source`, but `metadata_source="nope"` lints clean. Runtime uses `inp_data.get(...)` (legacy alias ok at job creation) and silently skips unknown names. Either add it to the linter (it is the same resolver with no selector) or leave the docs to #23444. A cheap addition would make the doc change enforceable.

### 5. Low: runtime-valid keys the linter errors on (verified; pre-existing for 1, new for 3)
1. `multiple="true"` data `input` → `format_source="input1"` is a real runtime key (`actions/__init__.py:242`). The same applies to `data_collection` `coll` → `coll1`. The linter errors on both. This was pre-existing and is rare.
2. `<conversion name="x">` keys (`prefix + conversion_name`) are unknown to the linter. This is rare.
3. A `multiple="true"` data param fed a collection is keyed into `input_dataset_collections` (`collect_input_dataset_collections`), so `input['forward']` can resolve. The linter errors with "is not a collection input". That error is new with the selector check. Consider `is_collection = type == data_collection or multiple == true`, or downgrade it to a warning for multiple data.
- A param named `q_1` next to a repeat named `q` is rewritten to `q_0` by `normalize` and gets a false error (verified, very rare). This needs no action beyond maybe a comment.
- `argument`-only params, XML comments in `<inputs>`/`<when>`, and repeat→conditional→repeat qualified paths all behave correctly (verified).

### 6. Design: reuse vs. accretion
`_InputReferences` is a fourth tree walker, after the runtime `visit_input_values`, the typed `tool_util/parameters/visitor.py`, and the removed #23388 validator. `linters/tests.py:232` already uses `input_models_for_tool_source(tool_source)`, falling back when it raises. #23444 plans a resolver over `ToolParameterBundle`. As a stopgap on the XML side this is reasonable: it stays private and walks raw XML, so it still works when model building fails. But findings 1–3 show that the "which keys exist" rules live in three runtime places with three different legacy semantics, and the linter has reinvented one of them wrongly. Recommendation: keep it small and private for now. Put the key-shape rules in one place (for example a `runtime_keys(ref_kind)` method) so #23444's resolver can replace it cleanly. Mention the three legacy semantics in the #23444 thread. Before this PR grows further, it's worth deciding whether to build on `input_models_for_tool_source` now.

### 7. Nits
- `ELEMENT_SELECTOR` duplicates the regex in `output_format.py:49`. Import a shared constant from `galaxy.job_execution.output_format`. Note that tool_util can't import galaxy.job_execution (a packaging boundary), so the constant would need to move into tool_util and be imported by runtime.
- In `_check_input_reference`, the `if not matches:` block runs twice in a row, and the "did you mean" branch sits under the second one. This works, but an `if/elif` with early returns would read more clearly.
- The comment `# Same single-selector shape resolve_format_source accepts` is fine. The class docstring is accurate apart from finding 1.
- Tests are proportionate and not trivial, and no assertion was weakened (`OUTPUTS_COLLECTION_FORMAT_SOURCE` only gained a missing input). They are missing coverage for nested sections/conditionals (finding 1), a repeat inside a conditional with a repeat-relative legacy ref, and `structured_like` with profile ≥ 26.0.

## Review fixes (e64aa16c7e2)

This addresses branch-review findings 1–3 and corrects the "Linter follow-up" section above. That section said the legacy alias drops every conditional and section name; it actually drops only the innermost one, and a repeat keeps the full path.
- The legacy rule now follows `visit_input_values`, with tests for a conditional nested in a section and for a repeat inside a conditional.
- `structured_like` follows the mapped-over resolution rules (`execute.py` `sliced_input_collection_structure`):
  - qualified names only;
  - a bare name matches at any depth before profile 26.0, which warns; from profile 26.0 it is an error;
  - repeat paths are errors;
  - the target must be a data or collection param, since a mapped-over `data` input is valid.
- XSD: the legacy form is marked unsupported for discovered collections, for both `format_source` elements and `metadata_source`. Ordinary `metadata_source` does resolve legacy names through `LegacyUnprefixedDict.get`. The `structured_like` docs now cover the profile 26.0 rule and the repeat limit.
- Deferred: `metadata_source` linting; low item 4 (`name1`/conversion keys, and a selector on a `multiple` data param).
- Survey rerun: unchanged (5 iuc barcode_splitter errors, 8 galaxytools errors that were already errors). Tests: 117 passed; the one failure is the CWL test, which fails for environment reasons.
