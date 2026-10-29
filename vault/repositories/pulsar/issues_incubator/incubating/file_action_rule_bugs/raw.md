# Raw: FileActionMapper rule bugs (combined issue)

Found by gx_research while writing galaxy-brain `vault/research/Component - Pulsar Input Staging.md` (B1, B2 and B3 there). Verified against Pulsar tag `0.16.0` (9c34a78b), which Galaxy pins as `pulsar-galaxy-lib==0.16.0`. `master` (827ece21) changes nothing in `action_mapper.py` or `path_mapper.py`, so all three still apply. John asked for one combined issue.

## 1. `unstructured` staging rules crash when Galaxy rewrites parameters

`pulsar/client/path_mapper.py:66-73`:

```python
def check_for_arbitrary_rewrite(self, local_path):
    path = str(local_path)
    action = self.action_mapper.action({"path": path}, path_type.UNSTRUCTURED)
    if not action.staging_needed:
        return action.path_rewrite(self.path_helper), []
    unique_names = action.unstructured_map()        # <- missing path_helper
```

- `BaseAction.unstructured_map(self, path_helper)` (`action_mapper.py:323`) takes a required `path_helper`, so this raises `TypeError: BaseAction.unstructured_map() missing 1 required positional argument: 'path_helper'`.
- Only the legacy `FileStager` path (`staging/up.py:238`, `rewrite_paths` mode) passes it.
- The line has been unchanged since `27ce4493` (2013, `lwr/lwr_client/path_mapper.py`). The `path_helper` parameter was added later and this call site was missed.

**Who hits it.** Galaxy's `PulsarComputeEnvironment.unstructured_path_rewrite` → `check_for_arbitrary_rewrite`, under `rewrite_parameters: true`. That is the default for Galaxy's REST, MQ, embedded and coexecution Pulsar runners. Galaxy calls it for select-option values that expose a `path` (`lib/galaxy/tools/wrappers.py:236-242`), i.e. data-table / `.loc`-driven reference files, and for unstructured values during evaluation (`tools/evaluation.py:680-693`).

Pulsar's own documented example triggers it: `docs/files/file_actions_sample_1.yaml:18-22`, the `/mnt/indices/**/bwa/**/*.fa` glob with `path_types: unstructured`, `action: transfer`, `depth: 1`. The job fails while Galaxy builds the command.

**Reproduction** (Galaxy dev 7761eeb, real `PulsarComputeEnvironment` with a mocked wrapper and the rule `{"path": "/galaxy/indices", "path_types": "unstructured", "action": "transfer"}`):

```
unstructured_path_rewrite: BaseAction.unstructured_map() missing 1 required positional argument: 'path_helper'
```

**Follow-on to check when fixing.** `unstructured_map` returns `{path: unique_name}`, not remote paths. `check_for_arbitrary_rewrite` then joins one name onto `unstructured_files_directory` and returns the whole map as "new rewrites". Galaxy's `unstructured_path_rewrite` (`lib/galaxy/jobs/runners/pulsar.py:1475-1481`) caches those map values as if they were remote paths, so a second lookup of a sibling path would return a bare relative name.

**Test gap.** `test/path_mapper_test.py` has no unstructured case.

## 2. Prefix rules ignore path boundaries

`pulsar/client/action_mapper.py:758-770`:

```python
class PrefixPathMapper(BasePathMapper):
    def __init__(self, config):
        self.prefix_path = abspath(config['path'])

    def _path_matches(self, path):
        return path is not None and path.startswith(self.prefix_path)   # no separator check

    def to_pattern(self):
        pattern_str = rf"({escape(self.prefix_path)}{escape(sep)}[^\s,\"\']+)"   # requires separator
```

- `prefix` is the default `match_type` whenever a rule has a `path`.
- A rule for `/galaxy/data` also matches `/galaxy/database/...`, `/galaxy/data2/...` and so on. Note that `abspath` strips any trailing `/` the admin writes.
- `RewriteAction` then does a prefix swap with `from_posix_with_new_base`.

**Reproduction** (Galaxy dev 7761eeb, real `PulsarComputeEnvironment`, with the docs' rule from `file_actions_sample_1.yaml:27-31`, `/galaxy/data` rewritten to `/work/galaxy/data`):

```
/galaxy/database/files/dataset_1.dat -> /work/galaxy/data/base/files/dataset_1.dat
```

That `/galaxy/data` + `/galaxy/database` layout is a common one. With `none`, `transfer` or `remote_*` prefix rules, the wrong action silently applies to datasets: they get staged when they shouldn't, or not staged when they should.

**Fix direction.** `path == prefix or path.startswith(prefix + sep)`, matching `to_pattern`. `from_posix_with_new_base` may need the same boundary check.

## 3. `RewriteAction.path_rewrite` ignores its `path` argument

`pulsar/client/action_mapper.py:430-434`:

```python
def path_rewrite(self, path_helper, path=None):
    if not path:
        path = self.path
    new_path = path_helper.from_posix_with_new_base(self.path, self.source_directory, self.destination_directory)   # self.path, not path
    return None if new_path == self.path else new_path
```

- `BaseAction.unstructured_map` (`action_mapper.py:330-336`) calls `self.path_rewrite(path_helper, path)` for each file a `depth >= 1` lister finds. Every sibling therefore rewrites to the trigger file's remote path.
- Probe: `path_rewrite(h, "/src/b/y")` on an action for `/src/a/x` returns the rewrite of `/src/a/x`.
- Today this is reachable only through the legacy `FileStager` path, because #1 crashes first on the rewrite-parameters path. Fixing #1 exposes it to the main path.

**Fix:** use `path` in both places.

## Suggested shape

These are three small fixes plus tests in `test/path_mapper_test.py` and `test/action_mapper_test.py`:
- an unstructured transfer rule through `PathMapper.check_for_arbitrary_rewrite`;
- prefix boundaries;
- rewrite with an explicit `path`.

## Notes

- Not security issues.
- Related Galaxy-side incubator records (filed separately on galaxyproject/galaxy): `pulsar_none_action_extra_files_crash`, `pulsar_pwd_home_target_dropped`.
