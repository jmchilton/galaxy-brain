# Failure to prepare one tool's conda environment rolls back an entire Tool Shed repository install

Installing `devteam/picard` to run `picard_MarkDuplicates` fails and removes all 31 newly installed
tools from disk after dependency-environment preparation raises for a *different* tool in the same
repository — `picard_CollectRnaSeqMetrics`. The workflow then fails with
`required tools are not installed`, naming only `picard_MarkDuplicates`, whose own dependency
(`picard=3.1.1`) installs fine.

Galaxy's cached dependency manager materializes reusable, combined dependency environments so jobs
do not repeatedly construct them in their working directories. These cache directories are the
executable environments used for dependency activation, not disposable copies of already-runnable
environments. The problem here is the failure boundary: an exception preparing one per-tool
requirement set is treated as failure of the entire Tool Shed repository installation, removing
unrelated tools whose requirements resolved successfully.

## Where it happens

`lib/galaxy/tool_shed/galaxy_install/install_manager.py:646-651`:

```python
new_tools = [self.app.toolbox._tools_by_id.get(tool_d["guid"], None) for tool_d in metadata["tools"]]
new_requirements = {tool.requirements.packages for tool in new_tools if tool}
[self._view.install_dependencies(r) for r in new_requirements]
dependency_manager = self.app.toolbox.dependency_manager
if dependency_manager.cached:
    [dependency_manager.build_cache(r) for r in new_requirements]
```

`new_requirements` is a set of **per-tool** requirement tuples, so `build_cache` runs once per
distinct requirement set in the repository. The comprehension on line 651 is unguarded: one
`DependencyException` propagates out of `install_tool_shed_repository`, is caught by the generic
handler in `install_repositories` (`:530`), and that handler calls
`repository_util.set_repository_attributes(..., status=ERROR, ..., remove_from_disk=True)`
(`:536-544`) — which logs `Removed repository installation directory` (`repository_util.py:676`)
and takes every tool in the repository with it.

The two dependency-preparation stages use different failure contracts. An unsuccessful combined
solve during `install_dependencies` (`:648`) is represented as an unresolved result, allowing
resolution to continue through individual or later resolvers. Once dependencies have resolved
individually, failure to materialize their combined cached environment raises
`DependencyException`. That distinction is reasonable at the dependency layer, but the Tool Shed
installation path does not isolate the exception to its owning requirement set: it escapes into the
generic repository rollback handler and removes every tool in the repository.

## Worked case

`devteam/picard`, changeset `bdd173c2d3e3`, 31 tools. Per the Tool Shed API:

```
picard_CollectRnaSeqMetrics -> [('picard','3.1.1'), ('ucsc-gff3togenepred','447'), ('ucsc-gtftogenepred','447')]
picard_MarkDuplicates       -> [('picard','3.1.1')]
```

`CollectRnaSeqMetrics` needs `gtfToGenePred` to build a refFlat file. On osx-arm64, bioconda
publishes `ucsc-gff3togenepred` / `ucsc-gtftogenepred` at **482**, while the requested `=447`
builds are unavailable for that platform. The exact combined requirement set therefore cannot be
installed:

```
conda create ... --name mulled-v1-8ff374b5... picard=3.1.1 ucsc-gff3togenepred=447 ucsc-gtftogenepred=447
Removing failed conda install of [CondaTarget[package=picard,version=3.1.1], ...]
```

That failed exact solve is relevant context, but it is not by itself proof that the subsequent
throwing cache operation was attempting to install those exact pins. Resolution can fall through
to individual and versionless resolvers before `build_cache` materializes the dependencies that did
resolve. The traceback establishes that cache materialization raised for this requirement-set path;
additional logging of the resolved dependency set or the precise failing conda command would make
the immediate cause attributable.

Traceback as observed (planemo-managed Galaxy on `master`, 2026-09-04):

```
galaxy.tool_shed.galaxy_install.install_manager ERROR Error installing repository 'picard'
Traceback (most recent call last):
  File ".../install_manager.py", line 520, in install_repositories
    self.install_tool_shed_repository(
  File ".../install_manager.py", line 652, in install_tool_shed_repository
    [dependency_manager.build_cache(r) for r in new_requirements]
  File ".../tool_util/deps/__init__.py", line 418, in build_cache
    [dep.build_cache(hashed_dependencies_dir) for dep in cacheable_dependencies]
  File ".../deps/resolvers/conda.py", line 495, in build_cache
    self.build_environment()
  File ".../deps/resolvers/conda.py", line 516, in build_environment
    raise DependencyException("Conda dependency seemingly installed but failed to build job environment.")
galaxy.tool_util.deps.resolvers.DependencyException: Conda dependency seemingly installed but failed to build job environment.

galaxy.tool_shed.util.repository_util DEBUG Removed repository installation directory:
  .../shed_tools/toolshed.g2.bx.psu.edu/repos/devteam/picard/bdd173c2d3e3
```

(Traceback line numbers are from the `master` the run cloned; the citations elsewhere in this
document are against local checkout `a63da1dfd19`, v26.1.1-1026, and differ by a few lines.)

## Why the symptom is hard to read

Nothing downstream mentions the cache, the failing dependency, or the sibling tool. What an
operator actually sees, in order:

1. ~31 lines of `Error reading tool configuration file from path
   'toolshed.g2.bx.psu.edu/repos/devteam/picard/bdd173c2d3e3/picard/<tool>.xml':
   [Errno 2] No such file or directory` — the directory was just deleted;
2. `400 {"err_msg": "Workflow was not invoked; the following required tools are not installed:
   toolshed.g2.bx.psu.edu/repos/devteam/picard/picard_MarkDuplicates/3.1.1.0"}`.

Read forward, that is indistinguishable from a bad changeset pin, and it points at the one tool
that has nothing to do with the failure. Confirming the pin was innocent took a Tool Shed API
query against both changesets publishing `3.1.1.0` (rev 33 `2739d29a2af1`, rev 35
`bdd173c2d3e3`; both `downloadable: true`, both 31 tools).

The conda-layer message compounds it. `resolvers/conda.py:524` selects between two strings by
path length:

```python
if len(os.path.abspath(self.environment_path)) > 79:
    raise DependencyException("Conda dependency failed to build job environment. "
                              "This is most likely a limitation in conda. "
                              "You can try to shorten the path to the job_working_directory.")
raise DependencyException("Conda dependency seemingly installed but failed to build job environment.")
```

Shortening `TMPDIR` can therefore change the advice without changing the underlying solver failure:
the message is selected from the environment path length, not from conda's stderr. In this case the
logs also contain an exact requirement set unavailable on the platform, but the exception does not
identify which resolved dependency or constraint made cache materialization fail.

## Reproduction

As observed on osx-arm64, without Docker:

```sh
planemo test --conda_prefix ~/miniforge3 <workflow using devteam/picard/picard_MarkDuplicates/3.1.1.0>
```

`--conda_auto_install` defaults to `True` (`planemo/options.py:758`), and planemo maps it
straight onto the cache switch — `planemo/galaxy/config.py:678`:

```python
"use_cached_dependency_manager": str(kwds.get("conda_auto_install", False)),
```

which selects `CachedDependencyManager` (`tool_util/deps/__init__.py:93-94`), so
`dependency_manager.cached` is true and line 651 runs. **Default planemo flags take this path.**

Control: the same workflow, same fixture, same machine, run earlier with an uncached dependency
manager produced the identical failed `mulled-v1-8ff374b5...` conda create, no
`deps/_cache` activity, **no** `Error installing repository`, and executed
`picard_MarkDuplicates/3.1.1.0` to a green result. This demonstrates that the failed exact solve did
not need to invalidate the requested, unrelated tool. It does not establish that every tool in the
repository could run successfully without caching.

## Why this looks like a bug rather than a configuration problem

- Cached dependency management is an established production path, and a cached environment is part
  of runtime dependency activation. The issue is not caching itself or that all cache failures can
  be ignored; it is that a failure for one requirement set invalidates unrelated tools.
- Dependency installation represents an unsuccessful combined solve as unresolved and can continue
  through other resolvers, whereas cached-environment materialization raises. Letting that later
  exception escape into repository rollback gives the two stages very different blast radii.
- The blast radius is unrelated tools. A repository is a packaging unit, not a dependency unit;
  requirement sets here are explicitly per-tool.
- The resulting error names a tool whose dependencies installed successfully, which sends
  diagnosis toward the changeset pin.

## Possible fixes

1. **Guard the loop** (smallest): catch per requirement set, log the failing set and the tools
   that own it, and continue installing the repository. Unrelated tools remain available. The
   affected tool remains unresolved and may retry environment construction or fail when executed;
   catching the exception does not itself provide an uncached fallback.
2. **Separate the concerns in the exception handler**: preserve the repository and record a
   dependency-preparation warning when cache materialization fails, even if clone, metadata, and
   other repository-install failures remain fatal.
3. **Make the error attributable**: whichever of the above, name the requirement set and the
   owning tool id in the log, along with the resolved dependencies and failing conda command, so
   `required tools are not installed` can be traced back.

Option 1 alone would have preserved `picard_MarkDuplicates` in the observed run and turned the
unrelated requirement-set failure into an attributable warning.

## Open questions

- Is the whole-repository rollback (`remove_from_disk=True`) deliberate for *all* install
  failures, or only for the clone/metadata failures it was presumably written for?
- Would a pre-install solve check (are all pinned requirements available for this subdir?) be
  worth having independently, so this surfaces before any clone happens?

## Provenance

Found translating nf-core/sarek's GATK preprocessing plane to a Galaxy workflow; the failure
cost three of eight `planemo test` attempts and was twice misdiagnosed (stale conda lock, then
conda's own path-length advice) before the traceback was read. planemo 0.75.44, macOS arm64,
Docker unavailable.
