# PR 17164 — Containerized set metadata (fresh re-review)

Reviewed exact head `eae4b5bc7ebbeb8bbb555079e48b60c5c235d30d` against the
current `origin/dev` merge base `20dedd9d5243282d28a8125cb7c40245153a9d16` (current
`origin/dev` at review time: `1d72e430482883a6a22e348e2b29079a6d414b97`). The PR is
out of draft, mergeable, and all reported CI checks are green.

## Verdict

Request changes. The rebase substantially improved the branch and fixed every original
container-command blocker, but I would still post three blocking findings:

1. opting into containerized metadata silently falls back to host metadata if the requested
   container cannot be resolved;
2. the shipped runtime claims S3 support but omits the dependency for Galaxy's `s3`,
   `aws_s3`, `swift`, and `generic_s3` object stores; and
3. Pulsar does not apply its container-image path rewrite to an absolute metadata image,
   unlike the ordinary tool container path immediately above it.

There are two additional non-blocking correctness/API findings: `PulsarObjectStore` still
crashes through the new concrete-backend API, and object-store mount order is derived from a
set even though mount order is semantically significant.

## Blocking findings

### 1. `containerize: true` fails open to host metadata

`BaseJobRunner._get_metadata_container()` returns the result of
`container_finder.find_container()` directly (`lib/galaxy/jobs/runners/__init__.py:606-646`).
`ContainerFinder.find_container()` deliberately returns `None` when the configured engine is
not enabled or no resolver selects the explicit description. `build_command()` then passes
that `None` into `__handle_metadata()`, whose existing branch simply emits the normal host
metadata command (`lib/galaxy/jobs/command_factory.py:258-306`).

Consequently a typo/mismatch such as `engine: singularity` on a Docker-only destination, a
disabled explicit resolver, or a destination without the requested container engine does not
fail the job or configuration. Galaxy silently executes metadata on the host even though the
admin explicitly requested isolation. `retry_metadata_internally: false` does not help: this
is not a failed remote metadata attempt, it is host execution selected while constructing the
job script.

This also explains the remaining gap in the integration test. CI genuinely ran and passed:

```
test/integration/test_metadata_containerized.py::test_tools[metadata_bam]
test/integration/test_metadata_containerized.py::test_tools[composite_output]
```

However, both assertions are stock framework-tool success checks. If
`_get_metadata_container()` returns `None`, the local test can use the Galaxy virtualenv and
embedded Pulsar can use the same checkout, so both can still pass without executing the image
that `setUpClass()` built. There is no assertion on the generated command, executed image, or
an image-only marker/dependency.

When `metadata_config.containerize` is true, failure to resolve the requested metadata
container should raise (analogous to `requires_containerization`) rather than selecting the
host path. Add a focused command-construction test that makes the resolver return `None`, plus
an assertion that a successful configuration emits the image/container command. Ideally the
integration image should also provide an observable marker that cannot be produced by the
host path.

### 2. The runtime's advertised S3 support does not cover Galaxy's S3 object store

`packages/job_execution/Dockerfile` explicitly installs `boto3`,
`azure-storage-blob`, and `python-irodsclient`. The new object-store extras similarly define:

```toml
s3 = ["boto3"]
all = ["python-irodsclient", "azure-storage-blob", "boto3"]
```

But Galaxy has two distinct S3 implementations:

- `type: boto3` loads `lib/galaxy/objectstore/s3_boto3.py` and needs `boto3`;
- `type: s3` / `aws_s3` and `swift` / `generic_s3` load
  `lib/galaxy/objectstore/s3.py`, which imports the legacy `boto` package and raises its
  `NO_BOTO_ERROR_MESSAGE` when it is absent
  (`lib/galaxy/objectstore/__init__.py:1928-1950`, `s3.py:8-31`).

None of the locally installed Galaxy packages declares `boto` as an object-store dependency;
the monolith gets it from the root/pinned environment. The runtime image therefore cannot
load a serialized legacy S3/Swift object store for extended metadata, despite the admin guide
saying the standard image includes "the S3 ... clients." The new `s3` extra is also named for
the wrong plugin, and `all` is not all supported object stores.

At minimum, install/declare `boto` for the advertised S3 baseline and distinguish extras such
as `boto3` versus legacy `s3`; alternatively narrow the documentation and names and explicitly
reject unsupported stores. Add an image import/config smoke test for each backend claimed by
the standard image.

### 3. Pulsar metadata images bypass the compute-environment path rewrite

For ordinary tool containers, `PulsarJobRunner` resolves the container and immediately calls
`_rewrite_container_for_compute_environment(container, compute_environment)`
(`lib/galaxy/jobs/runners/pulsar.py:615-625`). This is required when a Singularity/Apptainer
image is an absolute Galaxy-side path and a Pulsar `file_actions` rule maps container paths on
the execution host.

The metadata container is resolved on the next line, but is never passed through that helper
before `build_command()` embeds it. Thus a destination using the documented Singularity path
with a prebuilt SIF and Pulsar path rewriting will reference the Galaxy-side image path on the
remote host. Registry/URI Docker images are unaffected because the helper intentionally only
rewrites absolute paths.

Apply the same rewrite to `metadata_container` and add a unit case parallel to the existing
tool-container rewrite coverage.

## Non-blocking findings

### The new abstract concrete-backend API is not implemented by `PulsarObjectStore`

The PR adds abstract `ObjectStore.get_concrete_store_backends()`. `BaseObjectStore` implements
it by invoking `_get_concrete_store_backends`, but only `NestedObjectStore` supplies that
private method; `PulsarObjectStore(BaseObjectStore)` supplies neither. Reproduced at this head:

```
PulsarObjectStore.__new__(PulsarObjectStore).get_concrete_store_backends()
-> AttributeError: 'PulsarObjectStore' object has no attribute '_get_concrete_store_backends'
```

The intended Pulsar-runner paths now avoid `get_disk_paths()`, so this no longer breaks the
normal remote-metadata path as the older review claimed. It remains a public API regression
for this in-tree store (and an abstract-method compatibility break for direct out-of-tree
`ObjectStore` implementations), and a local/container runner combined with that store will
still hit it in `_find_container()`. Prefer a safe empty default at the base API and override
only concrete/nested stores.

### Storage mount ordering remains nondeterministic

`get_disk_paths()` returns `set[str]`, and `_expand_volume_str()` joins that set directly.
Python string-set order differs across processes. Container mount ordering is meaningful for
overlapping bind targets, and `preprocess_volumes()` itself uses last-wins semantics for
duplicates. Sort the paths before constructing `$storage` (or return an ordered collection).

## Prior-review reconciliation

- **Fixed:** the reverted `default_ro`/Singularity security regression. Current volume code
  retains dev's `ro`/`rw` behavior.
- **Fixed:** unresolved literal `$galaxy_root` in the metadata mount list. The default fragment
  is now conditional.
- **Fixed:** metadata job directory ending read-only. `$working_directory:rw` is emitted last.
- **Fixed:** Galaxy-local paths leaking into Pulsar metadata mounts. Both job directory fields
  now use the remote staging root and Pulsar no longer gathers Galaxy storage paths.
- **Fixed:** `output_paths=None`; callers now use an empty set for Pulsar.
- **Fixed:** hardcoded synthetic tool/image versions and mixed-release image dependencies.
- **Fixed:** no image build/publish path and no admin documentation. The PR now has a dedicated
  build workflow and substantial deployment documentation.
- **Improved:** integration tests disable internal metadata retry and CI actually executes the
  two Docker cases. They catch a broken container invocation, but still cannot detect the
  fail-open/no-container path described above.
- **Still present, low priority:** metadata-container construction duplicates much of
  `_find_container`, `ToolInfo.disable_galaxy_root_mount` hardcodes the internal tool ID, the
  nested config shape is YAML-only, and unrelated Selenium/test-resolver fixes remain in the
  feature diff.

## Validation

- Exact head and current PR discussion/CI inspected; no existing review comments duplicate
  these findings.
- CI integration log inspected: both new containerized metadata tool cases passed.
- Local focused tests:
  - `test/unit/tool_util/test_container_classes.py`
  - `test/unit/app/jobs/test_pulsar_runner.py`
  - **28 passed**.
- `test/unit/objectstore/test_objectstore.py`: **65 passed, 12 skipped, 2 failed**. Both failures
  are pre-existing/environmental in this worktree (`TransferConfig` is `None` because local
  `boto3` is not installed), not caused by the PR.
- Direct `PulsarObjectStore.get_concrete_store_backends()` reproduction above confirms the
  remaining API defect.
- `git diff --check origin/dev...HEAD` passed; worktree remains clean.
