# ShedVersion: "has this tool changed since the published revision?" — plan

Follow-up to verified finding P2 1. #1752 compares only the rendered tool XML, so changes to scripts, data tables, dependency XML or other repository files go unseen. This plan defines what "changed" means and where the comparison data comes from. It splits the work into a cheap guard for #1752 and a full comparison as a follow-up.

## Findings

### Tool Shed reuse: nothing to reuse for content

- `RepositoryMetadataManager.set_repository_metadata` (`lib/tool_shed/metadata/repository_metadata_manager.py`) creates a new installable revision only when `new_metadata_required_for_utilities()` is true. That union covers four checks:
  - `new_tool_metadata_required`: a tool's version changed, or a new tool id appeared.
  - `new_tool_dependency_metadata_required` and `new_repository_dependency_metadata_required`: the saved dependencies aren't a subset of the new ones.
  - `new_data_manager_required`: the data managers aren't equal.
- Otherwise it rewrites the latest row in place, setting `changeset_revision = tip` and `metadata = new`. `compare_changeset_revisions` (used by reset-metadata) has the same metadata-only shape. **None of these look at file contents.** They are why a same-version push silently replaces content, and they can't fix it. They also need the shed app and DB, so they can't be imported.
- The real harm is more precise than "installed Galaxies never see an update." The old changeset stops being installable. Installed Galaxies are offered an in-place revision update through `updated_changeset_revisions`, but the tool guid and version stay the same. One `owner/repo/tool/version` then names two different behaviors, and an install is only updated if an admin applies the update.

### What a client can fetch from the main Tool Shed today (probed 2026-10-24, version 26.1.2.dev0)

| Source | Result |
|---|---|
| `GET /api/tools/{owner~repo~tool}/versions/{v}/tool_source` | 200. Macro-expanded XML, about 2s per call (hg clone server side) |
| `/api/repositories/get_repository_revision_install_info`, `/api/repositories/{id}/metadata` | 200. Tool ids and versions, requirements, test `required_files` *names*, repository and tool dependency metadata. **No file hashes or contents** |
| hgweb `raw-file/`, `file/?style=raw`, `archive/*.tar.gz`, `manifest/`, `json-manifest/` | **403** |
| hg wire protocol (`?cmd=capabilities`, `?cmd=lookup`) | 200, so `hg clone -r <cs>` works |
| `/repository/download?repository_id=…` | **404, "No route"**. Removed with the legacy controllers (galaxy `8fc135eb2e8`) |
| Changeset descriptions | Not exposed. `ctx.description()` is only used in alert emails. That rules out the idea of git-diffing against the `commit <sha>` that `shed_update` writes into the message |

So there is no file-level source today. Comparing the realized repository against the published tree needs one of these:
- (a) An optional `hg clone -r <changeset>`. This needs `hg` on PATH and downloads the full history, including test-data.
- (b) A new Tool Shed endpoint. Recommended.

### Side finding (separate issue, not security)

`planemo/shed/interface.py::REPOSITORY_DOWNLOAD_TEMPLATE` still targets `/repository/download`. That breaks `shed_download`, `shed_diff` and `shed_update --check_diff` against the main Tool Shed. Probed with the real id `151e66967802e5d0`: it returns 404. `tests/shed_app.py` still serves the dead route, so planemo's tests stay green. The fix belongs with endpoint (b), which can also add `/archive`.

### Existing abstractions to reuse

- **Realization**: `realized_repository.path` is exactly what `build_tarball` uploads, with `.shed.yml` include/exclude applied and `.git`, `.hg` and `.shed.yml` dropped. Hash files from there.
- **Per-tool file scope**: `ToolSource.parse_required_files()` and `RequiredFiles.find_required_files(tool_dir)`, available at the 25.1 floor. Galaxy's default excludes are `test-data/`, `tool-data/` and `.hg`. This is the same declaration Pulsar uses to stage tool-directory files, so it is Galaxy's own answer to "which files does this tool need at run time." Caveat: `find_required_files` appends the default excludes to `self.excludes` on every call. Build a fresh `RequiredFiles` for each call, and fix that upstream as a drive-by.
- **Macros**: `galaxy.util.xml_macros.imported_macro_paths` (galaxy-util 24.1 or later) only sees top-level imports. Simpler and recursion-proof: treat any XML whose root is `<macros>` as covered by the rendered-XML comparison.
- **galaxy-tool-util hosting**: `AbstractTool.get_externally_referenced_paths` (code files plus macros) exists only on `dev` and is untagged. Planemo pins `galaxy-tool-util>=25.1,<26.2`. Build in planemo first. Upstreaming a `tool_runtime_files()` helper is optional later, if the Tool Shed wants the same semantics server side.

### How often a cheap guard is enough

In a sample of tools-iuc `main` (git tree API), 455 tool dirs have 2 or more XML files. Applying the plan's rule below, **227 have nothing besides covered XML and ignored files**, and 13 more have only install-time files. scanpy (the #1525 case) is one of the 227. kegalign (`run_lastz_tarball.py`) and bcftools (`tool-data/`, `tool_data_table_conf.xml.sample`) are not. Among the files outside those categories, `tool-data`/`.sample` files are the most common, followed by `.py`, `.txt`, `.png` (help images) and `.R`.

## Definition

A same-version tool is **unchanged** only if both of these hold:
1. Its rendered (macro-expanded) XML equals the published `tool_source`, canonicalized as in #1752.
2. None of its **behavior files** differ from the published changeset, by sha256.

The behavior files are the union of these, all as repository-relative paths in the realized repository:
- **Tool-scoped**: if the tool declares `<required_files>`, the files that `find_required_files(tool_dir)` matches plus any `<code file>`. Otherwise, every file in the repository except the covered, ignored and install-time files below. Declaring `required_files` is how a tool opts in to precise per-tool scoping.
- **Repo-wide install-time** (count for every same-version tool): `tool-data/**`, `*.loc.sample`, `tool_data_table_conf.xml.sample`, `tool_dependencies.xml`, `repository_dependencies.xml`, `data_manager_conf.xml`, `datatypes_conf.xml`.

These files are never behavior files:
- **Covered by (1)**: tool XMLs, and XMLs whose root is `<macros>`. This keeps a sibling-only macro change scoped to the tools whose rendering changed.
- **Ignored**: `test-data/**`, `README*`, `LICENSE*`, `CHANGELOG*`, and dotfiles. Realization drops `.git*`, `.hg` and `.shed.yml`, but it uploads `.lint_skip` and `.tt_skip`. planemo-ci-action also runs `touch .lint_skip` in every IUC repo before `shed_lint`. If dotfiles aren't ignored, every IUC tool would stay "unknown".

## Design

New module `planemo/shed/tool_changes.py`. It stays in planemo because of the version pin.

```python
FileDigests = Mapping[str, str]  # repo-relative posix path -> sha256 hex

class PublishedRepository(NamedTuple):
    owner: str
    name: str
    changeset_revision: str            # latest installable
    tool_versions: Mapping[str, str]   # tool id -> version
    files: Optional[FileDigests]       # None: shed can't provide file digests

class PublishedFiles(Protocol):
    def file_digests(self, owner: str, name: str, changeset_revision: str) -> Optional[FileDigests]: ...

class LocalRepository(NamedTuple):
    root: str
    files: FileDigests
    covered: frozenset[str]        # tool + <macros> XMLs
    install_time: frozenset[str]

ToolChangeStatus = Literal["unchanged", "changed", "unknown"]

class ToolChange(NamedTuple):
    status: ToolChangeStatus
    changed: tuple[str, ...] = ()  # paths, or "tool XML"
    reason: str = ""               # why status is unknown

def fetch_published_repository(tsi: ToolShedInstance, owner: str, name: str, files: PublishedFiles) -> Optional[PublishedRepository]
def local_repository(realized_path: str) -> LocalRepository
def tool_behavior_files(tool_path: str, tool_source: ToolSource, local: LocalRepository) -> frozenset[str]
def compare_tool(tool_path: str, tool_source: ToolSource, local: LocalRepository,
                 published: PublishedRepository, published_tool_source: Callable[[], Optional[str]]) -> ToolChange
```

How `compare_tool` decides, cheapest check first:
1. `behavior = tool_behavior_files(...)`. If `published.files` is None and `behavior` is non-empty, the result is `unknown("published repository files unavailable: <first few paths>")`. This check needs no `tool_source` fetch, so it skips the server-side clone.
2. If `published.files` is set, list every path in `behavior` whose local digest differs from the published one or is missing on either side. If that list is non-empty, the result is `changed(paths)`.
3. If `published_tool_source()` is None, the result is `unknown("published tool source unavailable")`.
4. If the XML differs, the result is `changed(("tool XML",))`. Otherwise it is `unchanged`.

`PublishedFiles` implementations:
- `ToolShedFileDigests(tsi)`: calls endpoint (b), and returns None on 404 or a request error.
- `NoPublishedFiles`: the default until (b) is deployed.
- Possibly `HgClonePublishedFiles`, opt-in when `hg` is on PATH (see the questions).

`_same_tool` and `_published_tool_source` from #1752 move into this module.

**`lint_shed_version` after #1751 and this change:**

```python
published = local = None  # fetched lazily on the first loaded tool, then cached
for tool_path, tool_source in yield_tool_sources(...):
    ...
    if published is None:
        published = fetch_published_repository(tsi, owner, name, ToolShedFileDigests(tsi))
        if published is None:
            return
        local = local_repository(realized_repository.path)
    ts_version = _published_version(published, tool_id)  # keeps the single-tool / n-tool quirks
    if ts_version is None:
        continue
    local_v, ts_v = parse_tool_version(tool_source.parse_version()), parse_tool_version(ts_version)
    if local_v > ts_v:
        continue
    detail = ""
    if local_v == ts_v:
        change = compare_tool(tool_path, tool_source, local, published,
                              lambda: _published_tool_source(tsi, owner, name, tool_id, ts_version))
        if change.status == "unchanged":
            lint_ctx.info(f"{tool_id}: unchanged since the latest installable revision ({ts_version})")
            continue
        detail = f" ({_describe(change)})"   # "changed: run_lastz_tarball.py" / "published repository files unavailable"
    lint_ctx.error(f"{tool_id}: version {tool_source.parse_version()} is less or equal than ... {ts_version}{detail}", "ShedVersion")
```

Notes on that sketch:
- The four Tool Shed calls now run once per repository instead of once per tool. The fetch stays lazy, so repositories with no tools, such as `package_*` and suites, and tests that don't mock the Tool Shed still make no calls.
- Equality is tested on `parse_tool_version` values (#1751), and `tool_source` is looked up by the shed's version string.
- That resolves P2 2 (the #1751 merge) and P3 3 (the error now says which comparison applied).

**Tool Shed endpoint (b)**, in Galaxy:
- `GET /api/repositories/{encoded_repository_id}/revisions/{changeset_revision}/files` returns `{"files": [{"path", "sha256", "size"}]}`.
- Compute it from `repo[changeset].manifest()` and the file contexts' data, the same way `readme_util._read_readme_from_manifest` reads files. There's no clone, and the result never changes for a given changeset.
- Model it on the `/revisions/{cs}/readmes` route in `api2/repositories.py`.
- Optionally add `/archive` (`hg archive`) to restore `shed_download` and `shed_diff`.

## Fold vs follow-up

- **Fold into #1752 (Phase 1, about 60 lines of code and 80 of tests).** Ship `compare_tool` with `NoPublishedFiles` only. A tool is skipped when its XML matches *and* it has no behavior files. That fixes P2 1's correctness hole with no new endpoint and still covers #1525 (scanpy). kegalign keeps the error until Phase 2, unless its tools declare `required_files`. This replaces the docs-only commit `e75c4806` on the review branch.
- **Follow-up issue (Phase 2).**
  - Galaxy, the Tool Shed endpoint: about 100 lines plus an API test.
  - planemo, `ToolShedFileDigests`, the hoist and the per-file comparison: about 200 lines plus about 150 of tests.
  - Separately, planemo's dead `/repository/download` route.
- **Overall: suggest Phase 1 to the author as the P2 1 fix, and track Phase 2 as a follow-up.** Phase 2 needs a Tool Shed change and a main-shed deploy that the author doesn't control.

## Tests (red-to-green, through `shed_lint`)

Reuse the review branch's `responses` harness in `tests/test_shed_lint.py` (`_shed_version_tools`, `_mock_tool_source`). For Phase 2, add `_mock_published_files(rsps, digests)`, with the digests taken from the isolated copy *before* the test mutates it. #1751's `_FakeToolShed` equal-version case should move onto the same harness.

| Case | Fixture / setup | Expect | Phase |
|---|---|---|---|
| Unchanged repo | `single_tool` with `related_file` removed | info and exit 0 (the current test, adapted) | 1 |
| scanpy-shaped repo plus `.lint_skip` and `README.md` | `single_tool` minus `related_file`, plus both files | info | 1 |
| Unchanged XML, extra repo file, no digests | `single_tool` as shipped (`related_file`) | ShedVersion "published repository files unavailable". **Red on the PR head today** | 1 |
| Tool XML change | existing `cat2` edit case | ShedVersion "changed: tool XML" | 1 |
| Shared macro, sibling-only change | in-test `macros.xml` (root `<macros>`) imported by cat and cat2; edit a token only cat2 uses (the published body is the old render) | cat2 errors, cat info | 1 |
| test-data-only change | edit `test-data/1.bed` | info | 1 (and 2) |
| `tool_source` 404 | existing | ShedVersion "published tool source unavailable" | 1 |
| Wrapper script change, per-tool scope | `single_tool_required_files` (`helper.py`) plus an in-test sibling tool with no shared required files; digests published, then edit `helper.py` | only `cat_required` errors, naming `helper.py` | 2 |
| No `required_files`, repo file change | `single_tool`, edit `related_file` | every same-version tool errors | 2 |
| Data table / `.loc.sample` | in-test `tool_data_table_conf.xml.sample` and `tool-data/x.loc.sample`; edit the loc sample | all same-version tools error | 2 |
| Dependency XML | copy `package_1_changed/tool_dependencies.xml` over `package_1`'s into the `single_tool` copy | all same-version tools error | 2 |
| Digest endpoint 404 | as above | falls back to Phase 1 behavior | 2 |
| Same digests | all published | info | 2 |

Galaxy side: an API test in `lib/tool_shed/test/functional/` (run it with the `galaxy-toolshed-tests` skill). Upload a repository, then check `/files` paths and sha256 for the tip and for an older changeset.

## Unresolved questions

1. Phase 1 in #1752: offer it as a review-branch commit, or ask the author to write it?
2. Same version but behavior files changed: error (recommended, same as master) or warning?
3. When digests are unavailable: error with the reason (recommended), or keep #1752's XML-only skip with a warning?
4. test-data-only changes: no bump (recommended, matching Galaxy's `required_files` default excludes)? If so, should `<tests>` edits inside the XML also stop forcing a bump, by stripping `<tests>` before canonicalizing?
5. Data tables: repo-wide (recommended, simpler), or scoped to tools that use `from_data_table` / `table_name`?
6. Help images (`static/images/**`, `.png`): ignored like README, or behavior files?
7. Endpoint (b) under your Tool Shed work, and should it also add `/archive` to fix `shed_diff` and `shed_download`?
8. Is an opt-in `hg clone` source worth adding before (b) is deployed? Recommendation: no.
9. File the dead `/repository/download` route as its own planemo issue now?
