# Initial review: galaxyproject/galaxy#23986, round 0

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5, effort: medium
- Reviewed commit: `ae37e517ebc3e8acbbd2225848f4b896511375f1` (merge-base `eec9c54787dc`)

## Summary

This is a careful, well-documented PR. The trust boundaries hold up: grants are bound to `(user, Dataset)`, kept out of serialization, and checked at submit and at dispatch. Plaintext stays in `_protected/` and the job directory. Outputs are encrypted inside Galaxy's own persistence path, then checked on the Galaxy side against the object store, not the compute host's report. Failures fail closed. The admin documentation already covers most of the residual risks I looked for: the unauthenticated compute service, the user service accepting any origin, plaintext left in the job directory, walltime margins, cleartext output names, and `$input.ext` showing the wrapper type. The design note (Crypt4GH-specific, no pluggable layer) is respected here.

I found no exploitable security issue at this effort level. The findings below are about correctness and consistency, mostly paths where decryption is skipped or applied inconsistently. These fail safe: the tool reads ciphertext and nothing leaks. They still produce wrong or failed jobs where the docs promise support.

## Findings

### P2 1 — Collection and JSON-serialized input paths skip the decrypted-input rewrite

`ProtectedInputsComputeEnvironment` points the tool at decrypted copies by overriding `input_path_rewrite`, `input_extra_files_rewrite` and `input_metadata_file_rewrite`. That works for anything that goes through a `DatasetFilenameWrapper` built with the compute environment: `$input`, `#for $e in $collection`, and `$collection.paths_as_file`, which iterates the element wrappers. Several established idioms read paths straight from the model instead:

- `DatasetCollectionWrapper.all_paths` and `all_metadata_files` (`lib/galaxy/tools/wrappers.py:779-786`) read `collection.element_identifiers_extensions_paths_and_metadata_files`, which calls `Dataset.get_file_name()` directly (`lib/galaxy/model/__init__.py:8295+`).
- `data_collection_input_to_staging_path_and_source_path` and `data_collection_input_to_path` (`lib/galaxy/tools/parameters/wrapped_json.py:43-72`). These back `$collection.serialize`, and `<configfile><inputs data_style="paths"/>` or `data_style="staging_path_and_source_path"` for collection parameters.
- For single datasets, `DatasetFilenameWrapper.all_metadata_files` (`unsanitized.get_metadata_file_paths_and_extensions()`) feeds `serialize()`'s `metadata_files`. It returns the *stored*, encrypted metadata files. `$input.metadata.bam_index` returns the decrypted staged ones.

For a protected job, each of these hands the tool the encrypted source file, or encrypted index, where it expects plaintext. The planner still decrypts the element into `_protected/`, because `_protected_inputs` sees it, but the tool never reads that copy. The admin docs say encrypted datasets are decrypted "inside conditionals, repeats and collections", and many IUC tools use JSON `inputs` config files or `all_paths` for collections.

Also, no integration test passes an encrypted dataset as a collection element (or inside a repeat or conditional). `test_crypt4gh_execution.py` covers collection *outputs* only, so this path has no test.

Fix: have the collection wrapper's `all_paths`, `all_metadata_files` and `serialize` go through the element `DatasetFilenameWrapper`s, which already carry the compute environment. Or have them consult `compute_environment.input_path_rewrite` and `input_metadata_file_rewrite` per element. Do the same for the single-dataset `all_metadata_files` in `serialize()`. Add an integration test with a collection input: one tool using `$collection.all_paths` or a `data_style="paths"` inputs config file, and one plain `#for` loop as a control.

### P3 1 — Decrypted inputs still report the wrapper extension to tools (`$input.ext`, staging names)

`DatasetFilenameWrapper.file_ext` returns `fastqsanger.c4gh` for an input the job decrypts. `get_staging_path()`, `name_and_ext` and the `serialize()` staging paths then produce names like `sample.fastqsanger.c4gh` for plaintext. Galaxy tools very often branch on `$input.ext` (`#if $input.ext == "fastqsanger.gz"`) or link inputs as `input.$input.ext` so the underlying program detects the format from the extension. Those tools take the wrong branch or misdetect the format on decrypted inputs. The admin docs list this as a limitation (`crypt4gh.md` "Tools see the wrapper datatype in `$input.ext`"), but it isn't a design decision in the PR description, and the fix would sit in code the PR already adds. The compute environment knows which inputs are decrypted (`plan.staged_input(dataset.id)`), and `ProtectedInput.ext` holds the inner extension. Optional: `file_ext` could ask the compute environment for the decrypted extension, as path rewriting already does, which would remove the limitation for the common idioms.

### P3 2 — Tools that receive user credentials can decrypt inputs, unlike tools that receive file sources

`_can_decrypt_inputs` (`lib/galaxy/managers/dataset_protection.py:156-160`) refuses tools given a `FileSourceConfigFile` because they "would send the decrypted data out of Galaxy". Tools declaring `<credentials>` (`Tool.credentials`, `lib/galaxy/tools/__init__.py:1345,1714`) receive the user's secrets for external services and can push data out the same way, but they pass. For consistency with the sibling path (REVIEW_FOCUS), refuse tools with `tool.credentials` as well, or document why credentials are different. The docs' "Galaxy only refuses tools it gives the user's file sources to" would need the same update.

### P3 3 — Typed wrappers match `binary`-only inputs through class inheritance, and are then decrypted

`Crypt4GH` subclasses `Binary`, and `Crypt4GH.matches_any` first returns `isinstance(self, datatype_classes)`. So `fastqsanger.c4gh` matches an input with `format="binary"`. `_read_datasets` then decides to decrypt, because `binary` isn't a Crypt4GH extension, and the binary-only tool gets plaintext FASTQ text. Either a binary input should receive the ciphertext, since that is what matched, or typed wrappers should match only through their inner datatype (and `c4gh` formats). Today the decision to match and the decision to decrypt come from two different rules. Optional: add a datatypes unit test pinning the intended behaviour.

### P3 4 — Job cache: `prepare()` comment contradicts same-user reuse

`Tool._may_reuse_job` deliberately allows reusing the *same* user's protected jobs, and the docs say "jobs decrypting data are only reused from the same user's earlier jobs". The second cache search in `MinimalJobWrapper.prepare()` (`lib/galaxy/jobs/__init__.py` around line 1501) skips every protected job, with the comment "Outputs of protected jobs are encrypted for the job's user, never reuse them". That is safe, but the comment states a different rule from the first search. Either word it as "only the submit-time search, which checks the job's user, may reuse protected jobs", or apply the same user check here.

### P3 5 — No warning when Crypt4GH is enabled without a walltime limit

`DatasetProtectionManager.job_margin` is `1 day + 1 hour + (walltime or 0)`. With no `walltime` limit, which is Galaxy's default, the margin silently assumes the job is queued on the cluster, runs and has its outputs encrypted within one hour of dispatch. A job on a grant inside its last day fails late, with its outputs purged. The docs tell admins to configure a walltime, but nothing at startup flags its absence. Log a warning (or refuse to start) when `crypt4gh_enabled` is set and `job_config.limits.walltime_delta` is `None`.

### P3 6 — The generic Crypt4GH extension regex accepts arbitrary `c…4gh` suffixes

`_is_generic_crypt4gh_file_ext` (`lib/galaxy/util/crypt4gh.py`) is `fullmatch(r"c[^.]*4gh", ...)`, so `cfoo4gh`, `cx4gh` and similar count as Crypt4GH wrappers when uploading and wrapping. If only `c4gh` and `crypt4gh` are meant, match that explicit set. Accepting never-intended input keeps it alive (REVIEW_FOCUS).

### P3 7 — Grants are not removed when a user is purged

`UserManager.purge` (`lib/galaxy/managers/users.py:320+`) deletes the user's addresses, authnz associations and other per-user rows, but leaves their `dataset_protection_grant` rows. Those rows hold bearer capabilities: headers sealed to a compute key. They become unusable, but they stay in the database indefinitely. As hardening, delete the user's grants in `purge`, or cascade from `User`.

### P3 8 — Uncommented function-level `crypt4gh` imports

`job_execution/protection/crypt4gh.py` imports `crypt4gh` inside `_decrypt_staged`, `_encrypt_body`, `protect_file` and `stage_inputs` without a comment. The reason is presumably that `crypt4gh` is a conditional dependency, and the module must import on hosts that only clean up. The `metadata_files` lazy import a few lines away does carry a comment. Add a one-line comment at the module's first such import, or use one guarded import at the top.

## Notes, not findings

- `dataset_protection.py` is close to 900 lines: the manager plus about 30 module-level helpers covering grant data, refusals, output verification and conversion retirement. It reads fine now, but verification (`finish_job`, `fail_job`, `_is_protected_as_recorded`) and grant bookkeeping could become separate modules if a thermo-style review asks for it.
- `_is_protected_as_recorded` reads the primary header from the object store backend through `get_data_head`, but checks extra files and metadata files through `dataset.extra_files_path` and `metadata_file.get_file_name()`, i.e. the cache. That is inconsistent with the stale-cache rationale given for the primary. Since the protector always encrypts anything that isn't a byte-identical copy of an encrypted input, this only matters for bugs, not for tool behaviour. I didn't verify a concrete stale-cache scenario, so I'm noting it rather than raising a finding.
- I saw no security-sensitive material, so I wrote no private security report.
