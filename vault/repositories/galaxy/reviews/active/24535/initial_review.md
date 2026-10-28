# Initial review — galaxy#24535

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Opus 5.5, effort medium
- Reviewed commit: `deed873a70a` (base `origin/release_26.2` @ `b7f7834d94a`)

## Verdict

Approve the code; retarget the integer half. Both fixes are small and correct. `IntParameter.marshal` unwrapping singleton lists is the right layer. Registering `sel` is the right fix for 26.2. But the `comment_lines` regression isn't specific to 26.2. Commits `72dcfbe09dd` and `f9c022e2d6e` landed on `release_25.1`, and `release_25.1`, `release_26.0` and `release_26.1` now all carry the same strict `marshal`. Chopin2 will break on the next point release of each of those branches unless the fix lands on `release_25.1`. No blocking code bugs and no security concerns.

Verified locally: `test/unit/data/datatypes/test_tabular.py` gives 44 passed on the PR head. The framework/integration test was not rerun.

## Findings

### P2 1: Integer-metadata fix belongs on `release_25.1`, not `release_26.2`

The PR describes the Chopin2 failure as 26.2-only ("passing on release_26.1"). That is no longer true. `IntParameter` with the strict `marshal` (commit `72dcfbe09dd`, PR #24357, base `release_25.1`, plus hardening in `f9c022e2d6e`) is present at the current heads of `origin/release_25.1`, `origin/release_26.0` and `origin/release_26.1`. On each, `Tabular.comment_lines` uses `param=IntParameter` and `marshal(["7"])` raises `RequestParameterInvalidException`. The 26.1 validation was most likely run before the 25.1 change merged forward on 2026-10-26. No release tag contains `72dcfbe09dd` yet, so retargeting now keeps the regression out of any shipped point release. Merging forward only goes upward, so a 26.2-only fix leaves three branches broken.

Suggested fix: split the PR. The `metadata.py` change, its unit-test additions, the `metadata_defaults` tool and its registration in `sample_tool_conf.xml` and `test_extended_metadata.py` go to `release_25.1`. The `sel` registration stays on `release_26.2`, since the coercion it responds to (`a43a281d4fa`, PR #23866) is only on `release_26.2`. Minor: the PR milestone is 27.0 while the base is `release_26.2`.

### P3 1: `sel` datatype entry lacks a `description` and is shown in upload

The new line is `<datatype extension="sel" type="galaxy.datatypes.data:Text" subclass="true" display_in_upload="true"/>`. Its sibling `Text` subclasses (`source.*`) and its neighbour `scf` all carry a `description`. `sel` is a generic, tool-specific BayeScan output name, so showing it in the upload format list without a description is unclear to users. Add `description="BayeScan selection output"` or similar, or use `display_in_upload="false"`.

## Design notes (no action required)

- **Layer choice for the int fix.** `MetadataToolOutputAction.apply_action` (`lib/galaxy/tool_util/parser/output_actions.py`) always applies `.split(",")` to defaults. Fixing this there would need per-element type knowledge, and the TODO there says `MetadataElementSpec` doesn't provide it. Param class isn't a usable proxy either: `column_names` and other plain `MetadataParameter` elements rely on the split. Putting the fix in `IntParameter.marshal` has another benefit: it also normalizes legacy stored values. Before `72dcfbe09dd`, `comment_lines` defaults were stored as `["7"]`, and `wrap` now returns `7` for them rather than the raw list. The cost is that the metadata API now also accepts `["7"]` as an int. That is a small, harmless loosening. A typed `MetadataElementSpec` would be the real abstraction, but it's out of scope for a release-branch fix.
- **Other typed params.** `IntParameter` is the only scalar-typed param with strict validation. Select, Range, Column, ColumnTypes and List params expect lists, so the split matches them. Plain `MetadataParameter` int-like elements (for example a `columns` default) would still store `["5"]`, but that is pre-existing behavior, not a regression. No other parameter shares this failure.
- **Edge values probed.** `["7"]` gives `7`, `[" 7 "]` gives `7`, `[""]` gives `None`, and `[None]` gives `None`. `("7",)` is still rejected, because tuples are never produced by `split`. `[]`, multi-element, nested, `[True]` and `[3.7]` lists are rejected, and the unit tests cover them.
- **`sel` approach.** Registering each unknown extension one at a time is whack-a-mole. Deployments that use their own `datatypes_conf.xml` won't pick it up from the sample either. Still, #23866 explicitly accepted uniform `data` coercion, and registering a real datatype is the sanctioned remedy. A wrapper-side change in tools-iuc would be an alternative, but it would not fix already-installed revisions. This is fine as is.
- **Test placement.** The `metadata_defaults` framework tool runs in the standard framework suite (via `sample_tool_conf.xml`) and in the extended-metadata integration suite. It covers both metadata-setting paths and goes red on base. The unit-test additions are parametrize rows on existing tests, not new trivial tests. The tool name is generic but its column names are Chopin2-flavoured, which is fine.
