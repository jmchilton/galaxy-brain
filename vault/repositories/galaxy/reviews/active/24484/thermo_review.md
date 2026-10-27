# Thermo review — #24484

- Profile: [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md)
- Model: Claude Opus 5.5, medium effort
- Reviewed commit: `baeca0d7dc6ce8144de0ca0d95e6b5abb93a9ac4` (merge-base `557e7f327839`, base `dev`)
- Static review; nothing run.

## Verdict

Overall shape is sound. A dedicated identity-addressed route, a purpose-derived HMAC signer, and `MetadataFile.object_store_path_kwargs()` (which also de-duplicates `get_file_name`) are good, reusable additions. The object store changes extend existing `extra_dir`/`alt_name` addressing instead of inventing new addressing. The weak spot is the runner side. The staging mode is a raw destination string that gets re-checked in three places in the already 1613-line `pulsar.py`. Metadata file identity is also recovered by a reverse path lookup, even though the caller held the object a moment earlier. No file crosses 1k lines because of this PR (`pulsar.py` and `objectstore/__init__.py` were already over). `dev` target, so no follow-up refactor issue.

## Findings

### P2 1: Parse `object_store_staging` once into a typed staging policy instead of re-checking a raw string

`object_store_staging` is read as an untyped `destination_params.get(...)` in `PulsarComputeEnvironment.__init__`. It is then tested as `in OBJECT_STORE_STAGING_MODES` in `input_path_rewrite` and in `input_metadata_rewrite`, and again in `PulsarJobRunner._client_inputs`. Only `_client_inputs` validates it. That runs after tool evaluation has already called both rewrites, so a typo like `strem` is silently treated as "off" during rewriting and then fails the job at submit time, per job, rather than when the destination is loaded. `_client_inputs` also mixes several things: validation, the Pulsar version gate for redirect, the expiry, and a `functools.partial` whose call signature has to be explained in a comment (`# Called with (kind, object_id).`). All of that is added to a runner file that is already 1613 lines.

Code-judo move: build one small staging object (e.g. `ObjectStoreStaging` with `mode: Literal["stream", "redirect"]`, plus `redirect: bool`, `expires`, and a `url(kind, object_id)` method). Build it once, when the compute environment is created (validate there, or at destination parse time), and keep `None` when staging is off. Then:

- `input_path_rewrite` and `input_metadata_rewrite` test `self.staging is not None`.
- `_client_inputs` stops validating and stops building a `partial`. It just calls `staging.url(...)`.
- The metadata-id map (see P2 2) lives on the same object.

The object fits in `lib/galaxy/jobs/runners/util/` or next to the signer, not in `pulsar.py`. This removes the scattered membership checks, the late validation, and the partial-plus-comment. It also keeps staging logic out of the busy runner.

### P2 2: `_metadata_file_with_path` recovers a `MetadataFile` from its path that the caller already had

`input_metadata_rewrite(dataset, metadata_val)` only receives the stringified path. `lib/galaxy/tools/wrappers.py:337` calls `metadata_param.to_safe_string(rval)` on the `MetadataFile` just before calling the rewrite. To get the id back, the PR adds `_metadata_file_with_path`. It walks every `FileParameter` in the dataset's metadata spec, calls `get_file_name(sync_cache=False)` on each value, and matches path strings. The docstring itself says why: "tool evaluation hands the runner only the path". Path-equality matching is the kind of hidden data-shape assumption that breaks quietly, for example if a path rewriter or `false_path` changes the string. It also costs an object-store path computation for every file metadata on every lookup.

Either fix removes the helper entirely:

- (a) Pass the metadata object through the `ComputeEnvironment.input_metadata_rewrite` contract, e.g. an optional `metadata_file` argument supplied from `wrappers.py`, which holds `rval` before stringifying.
- (b) Drop the per-rewrite bookkeeping. In `_client_inputs`, build the `path -> MetadataFile.id` map from the job's input datasets' `MetadataFile` values, using the same `get_file_name(sync_cache=False)` that keys `path_rewrites_input_metadata`.

Option (b) keeps the change inside the runner. Option (a) is the cleaner contract.

### P3 1: `staged_input` uses `head`/`redirect` boolean modes and a "exactly one field set" result dataclass

`JobObjectStagingManager.staged_input` handles authorization, object lookup, size, and three transfer strategies in one method. The `head` and `redirect` flags switch between modes. `StagedInput` encodes the outcome as four optional fields with an "exactly one is set, none for HEAD" invariant documented only in its docstring. The API layer then re-derives the variant with `is not None` checks and an `assert staged.path is not None`.

A cleaner split:

- `_authorized_input(job_id, kind, object_id, expires, signature) -> (obj, path_kwargs)`, shared by both handlers.
- `size(...)` for HEAD.
- `transfer(..., redirect)` returning a small tagged union (`Redirect | Stream | LocalFile`) that the route matches on.

This makes the invariant a type instead of a comment, and makes the `head` flag go away.

### P3 2: Runner imports URL construction from `galaxy.managers`

`pulsar.py` imports `input_url` and `INPUT_URL_LIFETIME_SECONDS` from `galaxy.managers.job_object_staging`. That module also defines the DB-backed manager, which brings `galaxy.model`, the scoped session, and object store types into the runner's import graph. `input_url` is a pure function of the signer, ids, and `galaxy_url`. It can live with `StagingUrlSigner` in `galaxy/security/staging_signer.py`, or in a small `galaxy/job_execution` module, alongside the route-path constant that both sides need. The manager would import it from there instead. This keeps the runner→managers dependency from growing; `jobs/handler.py` is the only other place where it exists today. It would also put the URL format and route path in one place: right now the path is spelled out twice, as `INPUT_PATH` in the API module and as an f-string in `input_url`.
