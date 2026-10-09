# PR #23273 — XPS datatypes

PR: https://github.com/galaxyproject/galaxy/pull/23273

Reviewed 2026-09-16 at `09dc0449d5ec23a299046a7ccb2fd59cf9daae4a` against target `dev`, merge base `dd33e5ce159c676292cb85e36063275fac4da5d5`. Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/23273` (clean after review).

## Verdict

The new datatype direction is reasonable, but this head is not merge-ready: automatic detection does not select two of the three datatypes, the VAMAS sniffer is built around an incorrect format assumption, and the fixture name breaks existing integration-test collection. There is also a concrete existing-datatype regression in filename inference.

**These concerns are already delivered by another reviewer**, not new feedback we need to post. [Arash's September 15 review](https://github.com/galaxyproject/galaxy/pull/23273#pullrequestreview-5211099804) and its inline comments cover all the findings below. No author replies or newer commits were present when checked. The useful next action is verification after author fixes, not another duplicate blocker comment.

## Verified findings (already posted; P2 unless otherwise stated)

### 1. Specialized sniffers run after the generic types

`lib/galaxy/config/sample/datatypes_conf.xml.sample:444–450` registers the datatypes without placing them in `<sniffers>`. Registry appends them at positions 359–361, after H5 (55) and TSV (245).

Using the actual sample registry and `guess_ext`:

```
test.vamas    -> vamas
test.xps.tsv  -> tabular
test.nxs.xps  -> h5
```

Moving the existing XpsTabular and NXxps instances immediately before generic TSV and H5 in memory changes the last two results to `xps.tsv` and `nxxps`. This is registry wiring, not a claim that their direct sniff methods fail the supplied fixtures. Explicit datatype selection still works.

Recommended fix: add explicit sniffer entries before the generic types and registry-level fixture assertions, not just direct-method doctests.

### 2. The VAMAS sniffer requires a technique in the wrong header

`lib/galaxy/datatypes/xps.py:105–124` inspects at most eight nonblank lines and requires one to be in `_VAMAS_TECHNIQUES`. Technique is a block-header field, not the experiment identifier on line 5.

Checked against the upstream [xylib VAMAS reader](https://github.com/wojdyr/xylib/blob/master/xylib/vamas.cpp), which reads the fixed format identifier first, then institution/model/operator/experiment identifiers, comment count and experiment/scan modes; technique is read later in each block. Its [real sample](https://github.com/wojdyr/xylib/blob/master/samples/mjr9_64c.vms) has `XPS` on physical line 35. Feeding that sample's genuine first eight lines to the PR's sniffer returns `False`; the sniffer necessarily stops before the remaining sample can matter.

Conversely, five ordinary text lines beginning `VAMAS interoperability workshop notes` with a bare `XPS` fifth line return `True`. The added `test.vamas` is aligned to the incorrect assumption (free-form first line and `XPS` fifth line), rather than a real interchange file. Its tab-separated x/y records are not the standard's one-value-per-line encoding. I did not install a separate full VAMAS parser; this fixture assessment is based on the upstream reader and visible structure, not a claimed parser execution.

Recommended fix: sniff the standard format identifier as the upstream reader does and replace the synthetic fixture with a small real, attributable VAMAS file. Do not merely increase eight to a larger guessed line count. Eight lines of a valid file need not contain a technique, so “all files fail” is too absolute: an experiment identifier could coincidentally equal `XPS`.

### 3. New filename aliases misclassify unrelated formats

`lib/galaxy/config/sample/datatypes_conf.xml.sample:445,449` adds `infer_from` for `vms` and `nxs`. `Registry.get_datatype_from_filename` prioritizes suffix inferences before registered extensions.

Actual results:

```
slide.vms -> vamas
slide.vmu -> vms       # existing Hamamatsu datatype
tomo.nxs  -> nxxps
```

Deleting just the two new aliases in the in-memory registry restores `slide.vms -> vms`, `slide.vmu -> vms`, and the pre-existing generic `tomo.nxs -> data`. Thus `.vms` is a real regression against an existing datatype; `.nxs` additionally overclaims NeXus containers unrelated to XPS. Filename inference is relevant when content cannot yet be sniffed, including deferred inputs; sniffer order does not fix these aliases.

Recommended fix: remove the broad aliases; use actual sniffing for downloaded content. If deferred `.vms` XPS inference is desired, its ambiguity with the existing image format needs an explicit separate policy, not an unconditional override.

### 4. The HDF5 fixture name prevents integration-test collection

The added `lib/galaxy/datatypes/test/test.nxs.xps` matches no registered datatype suffix. Existing `test/integration/test_datatype_upload.py:27–35` finds the datatype by longest registered extension, and constructs all cases at module import.

Executed that exact, unmodified `find_datatype` function extracted with AST (without importing or starting the integration server):

```
Exception("Couldn't guess datatype for file 'test.nxs.xps'")
```

Recommended fix: rename the fixture to `test.nxxps`, update its doctest reference, then verify fixture collection and automatic detection. This is a concrete suite-collection failure; no full integration-server run was needed to reproduce it.

## Smaller reuse/test issues

The XpsTabular metadata/preview override repeats the base implementation and drifts. For a three-column file headed `BE (eV) / KE (eV) / Counts`, metadata correctly records those names, but actual HTML renders `1.Binding Energy (eV) | 2.Intensity | 3` and renders the input header again as a data row. Column types are unconditionally float; a leading comment disables header recognition because `idx == 0` counts physical lines. These are also already covered by Arash's inline feedback.

Prefer the base Tabular inference/header/display seams, with an explicitly chosen header skip and `data_line_offset`. Arash's suggested replacement is a useful direction, not a fully verified drop-in solution: he notes its leading-comment and header-row-count caveats. Do not expand this PR into recognizing every vendor export unless that is intended scope.

Move `h5py` to module top (already imported there by `binary.py`, so there is no demonstrated optional-dependency reason). Black currently wants a blank line before the nested `_read_definition`; factoring the helper also resolves that. NXentry array-string handling/fallback robustness, exception logging, the standard URL, and docs registration are existing reviewer comments, not novel action items. The correct [ISO 14976 catalog entry](https://www.iso.org/standard/24269.html) differs from the PR's URL.

## Verification

- Three `xps.py` datatype doctests and six existing Tabular unit tests: **9 passed** (Python 3.13.12; reused read-only unit dependencies and the isolated temporary environment from #22976).
- Exact sample registry `guess_ext` and in-memory ordering correction reproduced as above.
- Actual filename inference and removal of only the two new aliases reproduced as above.
- Exact integration fixture-matcher function reproduced its failure without importing integration infrastructure.
- Genuine upstream VAMAS first-eight-line sniff rejection and ordinary-notes false positive reproduced.
- Actual XpsTabular metadata/HTML header mismatch reproduced.
- Ruff `--no-cache`: clean. Black `--check --diff --line-length 120`: one formatting change required, before the nested helper; its newer installation also emitted a Python target-version safety-check warning.
- No code changes, pushes, GitHub comments, or index edits. No full integration/backend server tests run; none required for these diagnostics.

Temporary diagnostic script: `/tmp/galaxy23273_review_diagnostics.py`. The existing passing doctests are useful smoke tests but miss registry selection, actual VAMAS structure, and metadata/preview behavior. No test assertion was weakened.

## Follow-up 2026-09-26

Checked the author's response commits `fa2f678fe9d` ("try to address review comments") and `0dda0617a58` ("add new test file") of 2026-09-24, plus our dev merge `3af7e261723`. Earlier head: `09dc0449d5e`. There are no author replies in any thread; the response is code only. No jmchilton review or comment exists on the PR. As noted above, arash's review carried our findings, so rows below cite his and lukaspie's comments. Any comment we post would be jmchilton's first on this PR.

### Response scope

- **XpsTabular removed** along with `test.xps.tsv`. This drops the tabular ordering issue, the metadata/peek drift, the CasaXPS/Prodigy sniff gaps, and the `comment_lines` / `file_ext` threads. It matches lukaspie's view that vendor text exports are too unstable to support ([r4092615241](https://github.com/galaxyproject/galaxy/pull/23273#discussion_r4092615241)). It is a reasonable scope cut.
- The PR is now two datatypes: `vamas` (text) and `nxxps` (H5 subclass).

### Status of outstanding requests

| # | Request (who, where) | Status | Evidence / correctness |
|---|---|---|---|
| 1 | Register sniffers before generic types (arash review body; our #1) | **Addressed** | `NXxps` sniffer is before `binary:H5` (sample conf ~1301). `Vamas` is added near the end of `<sniffers>` (~1551). `guess_ext`: `test.vms→vamas`, `test.nxs.xps→nxxps`, `test.mz5→h5`. The real xylib `mjr9_64c.vms` gives `vamas`. Correct. |
| 2 | VAMAS sniffer must match line-1 format identifier ([r4016513667](https://github.com/galaxyproject/galaxy/pull/23273#discussion_r4016513667); our #2) | **Addressed** | `xps.py:~90–105` requires exact line 1 `VAMAS Surface Chemical Analysis Standard Data Transfer Format 1988 May 4`, then any technique line in the prefix. The "VAMAS interoperability workshop notes" false positive now gives `txt`. Correct. It uses equality rather than `startswith`, which is fine. |
| 3 | Real VAMAS fixture replacing synthetic `test.vamas` (arash body; lukaspie [r4092716316](https://github.com/galaxyproject/galaxy/pull/23273#discussion_r4092716316)/[gist](https://gist.github.com/lukaspie/e073ea707a9d222c3c1b3919c83bd0fe)) | **Addressed in content, broken in name** | `test.vms` is byte-identical to the output of lukaspie's gist generator (reran it and diffed), so it is attributable. The `vamas` PyPI parser reads 1 block: XPS, REGULAR, 100 y-values, x start 105 / step -0.1. It lacks the `end of experiment` trailer. xylib reads the block count and does not need it (nit only). The name is the problem: see new problem A. |
| 4 | Technique list per ISO 14976 ([r4016513632](https://github.com/galaxyproject/galaxy/pull/23273#discussion_r4016513632); lukaspie [r4092754318](https://github.com/galaxyproject/galaxy/pull/23273#discussion_r4092754318)) | **Addressed** | `_VAMAS_TECHNIQUES` now equals pynxtools-xps `ALLOWED_TECHNIQUES`, including bare `AES`, which arash had questioned. Using lukaspie's list is reasonable. |
| 5 | Remove `infer_from vms` / `nxs` aliases ([r4016513749](https://github.com/galaxyproject/galaxy/pull/23273#discussion_r4016513749); our #3) | **Addressed** | Both removed. `slide.vms→vms` (Hamamatsu), `slide.vmu→vms`, `tomo.nxs→data`. Correct. The block also moved out of the Proteomics section to sit after `h5` (~250). The `description_url` is fixed to 24269. |
| 6 | ISO URL 25919→24269 ([r4016513593](https://github.com/galaxyproject/galaxy/pull/23273#discussion_r4016513593)) | **Addressed** | Module docstring and conf both fixed. |
| 7 | Rename `test.nxs.xps`→`test.nxxps` ([r4016513702](https://github.com/galaxyproject/galaxy/pull/23273#discussion_r4016513702); our #4) | **Not addressed** | The file is still `lib/galaxy/datatypes/test/test.nxs.xps`, and the new unit test references it too. The exact `find_datatype` from `test/integration/test_datatype_upload.py` still raises `Couldn't guess datatype for file 'test.nxs.xps'`. The module still fails at import, taking `objectstore/test_objectstore_datatype_upload.py` with it. lukaspie's reply ([r4092624027](https://github.com/galaxyproject/galaxy/pull/23273#discussion_r4092624027)) that real files end in `.nxs` is about user files, not harness fixture names. |
| 8 | h5py at module top; hoist `_read_definition`; fix `(1,)` array + non-Group default; log exceptions ([r4016513618](https://github.com/galaxyproject/galaxy/pull/23273#discussion_r4016513618), [r4016513728](https://github.com/galaxyproject/galaxy/pull/23273#discussion_r4016513728); anuprulez [r3785200086](https://github.com/galaxyproject/galaxy/pull/23273#discussion_r3785200086)) | **Addressed** | arash's helper was adopted verbatim, plus `log.debug` in the outer `except`. Verified with h5py: a root `default` pointing at a Dataset plus a `(1,)` `[b"NXxps"]` definition in an NXentry now sniffs True. Black is clean. The helper introduced UP045 lint: see new problem B. |
| 9 | Drop redundant `edam_format` ([r4016513709](https://github.com/galaxyproject/galaxy/pull/23273#discussion_r4016513709)) and `display_peek` override ([r4016513717](https://github.com/galaxyproject/galaxy/pull/23273#discussion_r4016513717)) | **Not addressed** (nit) | Both are still in `NXxps`. Harmless. |
| 10 | Should `NXmpes` sniff True? (arash r4016513728) / generic NeXus `nxs` type (lukaspie [r3764198832](https://github.com/galaxyproject/galaxy/pull/23273#discussion_r3764198832), [r4092548494](https://github.com/galaxyproject/galaxy/pull/23273#discussion_r4092548494)) | **No reply** | An `NXmpes` entry sniffs False. A generic NeXus datatype is a reasonable follow-up PR, not a blocker. It needs an explicit author answer. |
| 11 | Minor items from arash's body: title "abd", template PR body, docs rst, `Vamas.set_peek` discarding line count | **Not addressed** | Title still "Add Vamas abd nxxps…". The body is still the template. `galaxy.datatypes.xps` is absent from `doc/source/lib/galaxy.datatypes.rst`. `Vamas.set_peek` still sets a fixed blurb. `set_meta` / `open()` concerns are moot now that XpsTabular is gone. |

### New problems introduced by the response

**A. `test.vms` breaks the datatype-upload integration test (P2).** `find_datatype` matches fixture names by registered extension. `vms` is Hamamatsu, so the case becomes `datatype=Hamamatsu`, which has a `sniff` attribute and is not uploadable. The helper uploads with `file_type=auto`, and the upload sniffs as `vamas` with state ok. The assertion `file_ext == "vms"` then fails. This would surface as soon as problem #7 stops masking it. Fix: name the fixture `test.vamas` (Galaxy extension convention), keeping lukaspie's content. The user-facing `.vms` suffix question is separate and is already settled by removing the `infer_from`. Update the `Vamas` doctest and the new registry test accordingly.

**B. UP045 lint at the merged head (P2, pending CI).** Pinned `ruff==0.16.8` against merged `pyproject.toml` flags `xps.py:150` `Optional[str]` → `str | None`. It is the only UP045 hit in `lib/galaxy/datatypes/`. arash's "dev ignores UP045" no longer holds. Drop the `Optional` import.

**New test (`test_xps_sniffers_precede_generic_datatypes`, `test/unit/data/datatypes/test_datatypes_registry.py:86`).** The test is meaningful. The `nxxps` assertion would fail at `09dc0449d5e` because of sniff order, `mz5→h5` is a good negative control, and `vamas` is a smoke check of real registry ordering. The fixtures are wired into direct doctests and this registry test, but not into the integration harness (problem #7 and new problem A). The existing `test_datatype_upload.py` harness is the reusable coverage that auto-sniffs every fixture, so fixture names must satisfy it.

### Verification (2026-09-26, worktree at `3af7e261723`)

- `pytest --doctest-modules lib/galaxy/datatypes/xps.py test/unit/data/datatypes/test_datatypes_registry.py`: 7 passed. `test/unit/data/datatypes/test_sniff.py`: 36 passed. Borrowed venv from `pr/18467`, `PYTHONPATH=lib`.
- The black check is clean. `ruff@0.16.8` reports 1 error (UP045).
- Sample-registry `guess_ext`, `get_datatype_from_filename`, integration `find_datatype`, and h5py edge-case scripts: see the scratchpad `diag.py` / `diag2.py` from this session.
- `vamas` PyPI parse of `test.vms` succeeded. lukaspie's gist output diffed identical to it.

### CI

- `0dda0617a58` (response head): the only check run is CircleCI `get_code_and_test` → `get_code` failed. That is infra/checkout, not PR code. No GitHub Actions runs exist for that SHA, likely because the dev conflict blocked the merge ref (unconfirmed). **The response commits were never CI-validated.**
- `3af7e261723` (our merge): 41 jobs pending, 2 skipped. Expected PR-related reds are integration shards (collection error from `test.nxs.xps`) and lint (UP045). After the rename, expect the `test.vms` upload case to fail until it is renamed too.

### Next action

Request small remaining changes. The remaining work is two fixture renames and one annotation. Everything substantive, including sniffer ordering, the VAMAS sniffer, the real fixture, the aliases, and the h5py helper, is fixed correctly. Wait for the lint result before asserting B, or phrase it as expected.

Draft comment:

> *Posted by Claude (AI assistant) on behalf of @jmchilton — not authored by them personally.*
>
> Thanks, the rework resolves nearly everything: sniffers ordered ahead of H5, the VAMAS identifier check, the aliases removed, and the h5py helper fixed. The new `test.vms` also parses cleanly with the `vamas` reader. Dropping XpsTabular seems like the right scope. Three small things remain before this can go green:
>
> 1. **`test.nxs.xps` → `test.nxxps`.** `test/integration/test_datatype_upload.py::find_datatype` matches fixtures by registered extension and still raises `Couldn't guess datatype for file 'test.nxs.xps'` at import. That errors the whole module plus the objectstore variant. Please update the `NXxps` doctest and `test_xps_sniffers_precede_generic_datatypes` too.
> 2. **`test.vms` → `test.vamas`.** The same harness maps `test.vms` to the Hamamatsu `vms` datatype, auto-sniffs it as `vamas`, and asserts `file_ext == "vms"`. Fixture names only have to satisfy the harness. They don't change what suffix users upload, and with the `infer_from` gone `.vms` uploads are sniffed by content anyway. The content can stay as is. Please update the `Vamas` doctest and the registry test.
> 3. **Lint:** with the pinned ruff 0.16.8 and current dev config, `xps.py:150` hits UP045. Use `str | None` and drop the `Optional` import.
>
> Optional: the title still says "abd", and the PR body is the template. `galaxy.datatypes.xps` isn't in `doc/source/lib/galaxy.datatypes.rst`. The `NXmpes` / generic NeXus `nxs` question from the earlier threads could use a short answer, even if it's "follow-up PR".

**Update 2026-09-26:** we pushed the three blocker fixes ourselves at `88ba0c68b07` (`test.nxs.xps`→`test.nxxps`, `test.vms`→`test.vamas`, doctest/registry-test refs, `Optional[str]`→`str | None`). Upload-harness collection verified locally (338 cases; both fixtures map to their sniffed type). The draft comment above is stale: rewrite it to report these fixes and list only the minor items.
