# PR 23277 — Add Crypt4GH End-to-End Support for Galaxy

| | |
|---|---|
| **PR** | https://github.com/galaxyproject/galaxy/pull/23277 |
| **Author** | davelopez (David López) |
| **Base branch** | `dev` |
| **Head** | `19f1605b1c` |
| **Size** | 27 files, +4536 / −27 (incl. one new 3072-line module) |
| **Worktree** | `/Users/jxc755/projects/worktrees/galaxy/pr/23277` |
| **Verdict** | **Request changes.** 11 blocking findings, including a cross-user plaintext recovery path and a verifier that fails open in the exact case it exists to catch. |

Reviewed by three parallel agents (security/crypto, architecture/abstraction, datatype-client-config
surface). Raw counts before dedup: 14 P1, 26 P2, 17 P3. Consolidated below — several findings were
discovered independently by two reviewers and are merged.

**Nothing was executed.** No venv, no Galaxy start, no recryptor service. Everything here is a code
read; where a reviewer could not verify a claim it is marked **suspected**.

---

## The five things that matter

1. **A user can recover another user's plaintext** by copying a recrypted dataset and running any
   pass-through tool (§P1-1). Not theoretical — the recrypt request carries no principal at all.
2. **The admitted "discovered collection elements come back unencrypted" limitation is silent, not
   loud** (§P1-2). The job goes green and plaintext lands in the history. That is the difference
   between a known gap and a breach.
3. **Existing Pulsar / `tool_evaluation_strategy: remote` deployments break on upgrade** (§P1-4),
   because `remote_tool_eval` now imports `crypt4gh` and `aiohttp` unconditionally.
4. **The feature is not off when the flag is off** (§P1-5 through §P1-8). ~900 dynamically generated
   datatypes, a new sniffer on every binary upload, and upload extension rewriting all run
   unconditionally. The flag gates tool *matching*, not the feature.
5. **Zero automated tests** for a confidentiality feature whose safety rests on fail-closed branches.
   Every blocking finding below is a branch a single test would have exercised.

The design's *shape* is right and the effort is visible — see "Where this is genuinely sound" at the
bottom, which is not a courtesy section. The problems are specific wrong exits, not carelessness.

---

## P1 — Blocking

### P1-1. Cross-user plaintext recovery: the compute header is a bearer credential treated as ordinary metadata

> Longform walkthrough with diagrams: [[23277_cross_user_plaintext_recovery]] — builds this up from
> the Crypt4GH header/body split, and is the version to paste into a PR comment or send to the author.

The recrypt request carries **no principal**. `_build_recrypt_payloads:497-501` sends only
`crypt4gh_header`, `crypt4gh_compute_keypair_id`, and the attacker-chosen `crypt4gh_job_public_key`.
No API key, no bearer token, no user id, no signature — verified at `:492-503` and again for the
output direction at `_recrypt_header_to_user_key:2928-2931`. Service B therefore *cannot* bind a
request to a user; it can only answer "does keypair K open header H", which is yes for anyone holding
the pair. The header is a capability.

Both fields are plain dataset metadata that travels on copy — `crypt4gh_compute_header` is
`readonly=False, visible=True`; `crypt4gh_compute_keypair_id` is `readonly=False, visible=False` but
still in the API payload and still settable; `HistoryDatasetAssociation.copy_from`/`copy` propagate
`_metadata` (`model/__init__.py:6203`, `:6213`).

**Exploit.** User B recrypts `cohort.vcf.c4gh` in a shared or published history — the normal,
*intended* state, since Crypt4GH ciphertext is supposed to be safe to share. User A has read access.

1. A copies the dataset. The copy points at B's ciphertext (same `Dataset` row, same object-store
   file) and carries B's compute header and keypair id. A forges nothing.
2. A runs `cat` / `head` / `Select` on the copy. A owns the HDA, so `_get_dataset_for_edit`'s
   ownership check passes and the readiness guard passes.
3. Compute side POSTs `/recrypt_header_to_job_key` with B's header, B's keypair id, and A's fresh job
   public key. Service B returns a header A's job can open.
4. `_decrypt_recrypted_input:3010` writes B's plaintext into A's staging directory; the tool runs.
5. A reads the plaintext out of **tool stdout**, which nothing in this PR encrypts.

Output re-encryption doesn't help: `_recrypt_header_to_user_key` keys off `compute_keypair_id`, so
A's *output* is encrypted to B — but A already has the plaintext, and A chose the tool.

**Verified**: no principal in the payload; ownership enforced on the HDA but not on the key material;
metadata copies verbatim; stdout never encrypted. **Not verified (external)**: Service B's
implementation — but no implementation of it can close this, because Galaxy never says who is asking.

**Fixes** (any one closes it; ideally more than one): clear `crypt4gh_compute_*` on HDA copy across a
user boundary; mint the header per (dataset, user) and send an authenticated principal so Service B
can check ownership; stop marking the header `visible=True`/`readonly=False` — it is key material in
transit, not a user-editable attribute; and document that tool stdout/stderr is an unencrypted egress
channel for any decrypted input.

### P1-2. The verifier fails **open** when nothing was encrypted — this is what makes the admitted collection leak silent

`crypt4gh_remote_execution.py:2253-2255`:

```python
marker_dirs = _resolve_pre_success_marker_directories(working_directory=working_directory)
if not marker_dirs:
    return
```

`_c4gh_stage/outputs/` is never created eagerly — it exists only as a side effect of actually
encrypting something (`_write_output_markers:2028`, `_write_discovered_designation_marker:2101`, the
manifest writes). So **"nothing was encrypted at all" and "everything was encrypted correctly" are
indistinguishable to the verifier, and both are treated as success.** Every subsequent check — magic
bytes, discovered-designation mapping, residual-plaintext scan — sits inside that early return.

Feeding it: `collect_discovery_crypt4gh_output_specs:1076-1078` silently `continue`s when `base_ext`
is falsy or in `("auto", "data", "_sniff_", "input")` — i.e. the overwhelmingly common case. Two more
silent skips at `:1143` (`re.error`) and `:1137` (missing scan root), plus
`collect_declared_crypt4gh_output_targets:995`/`:1000`.

**Concrete path.** Upload `patients.fastqsanger.c4gh`, recrypt, run `split_file_to_collection` (or
any tool with `<discover_datasets format="auto">`). Collector silently skipped → nothing encrypted →
no marker dir → postrun exits 0 → verifier returns at `:2255` with zero diagnostics → **job green**,
decrypted patient reads in the history and at rest in the object store. The only signal is that the
element extension is `fastqsanger` rather than `*.c4gh` — which no user will police on a feature sold
as "transparent".

So the PR's "not working yet" list is precisely the set of cases where the design's *default* outcome
is "encrypt nothing", and the only thing standing between that and a leak is a verifier that doesn't
fire.

**Fix**: the verifier must not read "no evidence" as "no problem" — the host knows Crypt4GH staging
was active (it built `crypt4gh_config` at `jobs/__init__.py:1149`), so a missing marker directory is
itself a diagnostic. Separately, every `continue` above must `raise`: an output the encryptor cannot
type is an output it must refuse to let succeed.

### P1-3. Verification failure leaves plaintext at rest in the object store

The Crypt4GH verification block in `jobs/__init__.py` runs *after*
`import_model_store.perform_import(history=job.history, job=job)` (~`:2282`) — the author's own
comment acknowledges the ordering, for a different reason (`job.info` preservation).

`perform_import` creates the HDAs and **moves the output files into the object store**. That move is
a filesystem operation and is not rolled back. On verification failure the code sets
`final_job_state = ERROR` and writes `job.info` / `dataset_assoc.dataset.info` — **nothing purges the
file**. So the exact scenario the verifier exists to catch, "an output came back plaintext", results
in that plaintext being permanently written to the object store and attached to an HDA in the user's
history. Object stores get backed up, replicated, and browsed by admins.

**Suspected, not verified**: whether the user can still download an ERROR-state HDA (Galaxy generally
serves `/datasets/{id}/display` for errored datasets whose file exists). The at-rest leak is verified
regardless.

**Fix**: purge on verification failure (`full_delete()`), not merely ERROR — or better, verify
*before* `perform_import` so nothing unverified is ever imported.

### P1-4. `crypt4gh` and `aiohttp` are imported unconditionally — this breaks existing remote-eval installs

`jobs/__init__.py:105` and `remote_tool_eval.py:32` both do a module-level
`from galaxy.tools.crypt4gh_remote_execution import ...`, and that module does module-level
`import aiohttp` / `import crypt4gh.header` / `import crypt4gh.lib` (`:36-38`). `pyproject.toml:16,32`
lists both as **unconditional top-level dependencies**, not extras.

On a stock install with the flag off: both packages are imported in every job handler process at
startup. Worse, `remote_tool_eval.py` is the **compute-side** entry point for
`tool_evaluation_strategy: remote` — so every existing Pulsar / remote-eval deployment that upgrades
now `ImportError`s on job setup unless `crypt4gh` and `aiohttp` are installed remotely. **This breaks
a currently working, unrelated configuration.**

Compounding it, the optional extra is declared on the wrong package: `packages/tool_util` declares
`crypt4gh = ["crypt4gh", "aiohttp"]` (`:49-52`) and `packages/app` consumes it as
`galaxy-tool-util[cwl,edam,crypt4gh]` (`:26`) — but **nothing under `lib/galaxy/tool_util/` imports
either** (verified: `grep -rl crypt4gh lib/galaxy/tool_util/` is empty). All consumers are in
`galaxy.tools` / `galaxy.jobs` / `galaxy.util` / `galaxy.datatypes`, i.e. `packages/app` and
`packages/util`. `packages/tool_util` is in `packages_for_pulsar_by_dep_dag.txt`, so this looks like
an attempted workaround for the Pulsar problem — but it doesn't work, because the code lives in
`galaxy-app`. The same dependency is thus optional in one place and mandatory in the other.

`aiohttp` is defensible as a *declaration* — it was already an undeclared runtime import
(`tools/parameters/cancelable_request.py:8`, `files/sources/elabftw.py:73`) and already pinned, so
declaring it fixes a latent gap. `crypt4gh==1.8.6` is not: new, one consumer, reachable only when the
feature is on. It is a small EGA-maintained package; its maintenance status should be checked before
it becomes a hard dependency of every Galaxy deployment.

**Fix**: move the gate (`should_run_crypt4gh_remote_execution` needs no crypto) into a
dependency-free module, lazy-import the heavy module inside the `if` at `remote_tool_eval.py:158`
with a commented justification, put `Crypt4GHRemoteExecutionError` in a leaf `errors.py`, and declare
the extra on `packages/app`. ~20 lines; highest value-per-line in the review.

### P1-5. ~900 dynamic wrappers are appended to `sniff_order`; every binary upload reopens the file ~900 times

`registry.py:478` calls `_register_crypt4gh_datatypes()` *before* `append_to_sniff_order()`
(`:480-494`). All four of that function's filter conditions hold for every wrapper (distinct `type()`
class, has `sniff`, `is_subclass` False, no `uncompressed_datatype_instance`), so **all of them land
in `sniff_order`** — on the order of 800–1000 new sniffers, given 769 `<datatype>` elements in the
sample conf plus auto-generated `.gz`/`.bz2` types.

Note the contrast: the `uncompressed_datatype_instance` clause exists *precisely* to keep dynamically
generated wrappers out of `sniff_order` ("Do not add dynamic compressed types…", `registry.py:485-487`).
The Crypt4GH wrappers needed the same exclusion and didn't get one.

Text uploads skip them cheaply at the `is_binary` guard (`sniff.py:738`). **Binary uploads do not**:
`Crypt4GH` defines `sniff(self, filename)` and not `sniff_prefix`, so `sniff.py:757` fires and
`check_crypt4gh` → `read_crypt4gh_header` → **`open(path, "rb")` on every call**
(`util/crypt4gh.py:170`).

**Failure scenario**: feature off, upload a binary no early sniffer claims. Galaxy opens and reads the
file ~900 times before returning `binary`. Multiply by a bulk upload batch; on a network object store
with an S3 cache miss it is far worse.

**Fix**: exclude Crypt4GH wrappers from `append_to_sniff_order` and register a single generic sniffer
at a chosen position — and give `Crypt4GH` a `sniff_prefix` regardless, since `check_crypt4gh` needs
only the first 16 bytes and `FilePrefix` already has them.

### P1-6. Wrapper class names collide, corrupting the client's datatype subtype model

`build_crypt4gh_datatype` (`crypt4gh.py:276-287`) names each class
`f"{inner_datatype.__class__.__name__}Crypt4gh"` with `__module__` forced to
`galaxy.datatypes.crypt4gh`. But extensions are not 1:1 with classes — 120 extensions map to
`data:Text`, 49 to `binary:Binary`, 33 to `tabular:Tabular`. So 120 distinct extensions all produce
a class whose fully-qualified name is `galaxy.datatypes.crypt4gh.TextCrypt4gh`.

`managers/datatypes.py:34-52` keys `ext_to_class_name` by extension and `class_to_classes` by that
FQN; the client's `DatatypesMapperModel.isSubType` (`client/src/components/Datatypes/model.ts:26-36`)
resolves through both. Consequence: **any two of the 120 Text-backed `.c4gh` extensions are mutually
subtypes of each other in the client's model.** `isSubTypeOfAny` drives the collection builder, rule
builder, and tool-form input filtering, so those UIs will offer and accept wrong datatypes. Also
`getParentDatatype` does `fullClassName.split(".")[2]`, reporting "crypt4gh" as the parent of all of
them.

Server-side `isinstance` is unaffected (the class objects are genuinely distinct despite the shared
`__name__`) — this is purely a name-based-serialization defect. But it is client-visible and it ships
with the feature disabled, since `view_mapping` iterates `datatypes_by_extension` unconditionally.

### P1-7. The Recrypt button silently wipes the dataset's `dbkey`

`useCrypt4ghRecrypt.ts:104-112` calls `setAttributes(item.id, {name, info, ...computeAttributes}, "attributes")`,
which PUTs to `dataset/set_edit` → `controllers/dataset.py:352-362`. That endpoint's contract is *the
full attributes form*: it iterates every non-readonly metadata spec item and sets it from the payload,
so **anything absent is reset to `None`**. The existing consumer (`DatasetAttributes.vue`) submits the
whole form; this composable submits five fields.

For a Crypt4GH dataset the non-readonly spec items are `dbkey` plus the three `crypt4gh_compute_*`
elements. So clicking the key icon **resets `dbkey` to `"?"`**. Same call also overwrites `data.info`
with `""` whenever `misc_info` is null, and re-submits a possibly stale `item.name`.

**Failure scenario**: user assigns `hg38` to an encrypted BAM, clicks Recrypt, dbkey silently reverts,
and downstream tools fail or run against the wrong build. The toast says "Crypt4GH header re-encrypted
for compute."

**Fix**: don't reuse the whole-form endpoint for a partial update. The right path — `PUT /api/datasets/{id}`
through the deserializer at `managers/datasets.py:903` — **is already wired up in this PR** (it's where
`validate_crypt4gh_compute_metadata` hooks in); the client just doesn't use it.

### P1-8. Crypt4GH uploads are detected and extensions rewritten with the feature disabled

`sniff.py:944` runs `check_crypt4gh(converted_path)` on **every** uploaded file, on every install, with
no reference to the config flag. When true: `AUTO_DETECT_EXTENSIONS` → `infer_crypt4gh_file_ext`;
otherwise **the user's explicitly chosen datatype is silently rewritten** from `bam` to `bam.c4gh`
(`:960`), and `convert_to_posix_lines` / `convert_spaces_to_tabs` are skipped (`:969`, `:980`).

So on a plain Galaxy with the flag off, uploading a Crypt4GH file yields a `bam.c4gh` dataset that
matches no tool (`matches_any` returns False when staging is disabled), is undownloadable by direct
link (§P2-8), and carries a Recrypt button that can never work (§P2-9). Previously it would have been
stored as `data`/`binary` — inert, but not presented as a first-class type with broken affordances.

This is the change most likely to surprise an admin who enabled nothing.
`handle_uploaded_dataset_file_internal` already receives `datatypes_registry`, and
`Registry.enable_crypt4gh_transparent_staging` is right there (`registry.py:137`).

### P1-9. Galaxy's output discovery is re-implemented, and the copy is already behind

`collect_discovery_crypt4gh_output_specs:1054-1113` re-reads `discover_via`, `pattern`, `recurse`,
`match_relative_path`, `assign_primary_output` off the collector objects and re-implements the scan in
`finalize_discovered_crypt4gh_payloads:1120`. All of it already exists and is tested:
`tool_util/parser/output_collection_def.py:92,135,155` and `model/store/discover.py:1090,1102,1201`.

The copy **drops `discover_via == "tool_provided_metadata"` entirely** (`:1136`) — which is exactly the
`split_file_to_collection` case in the broken list. `match_relative_path` is serialised into the spec
(`:1105`) and never read by the finalizer.

Two divergent implementations of collection discovery in one codebase is arguably the worst
maintainability outcome here — worse than the file size — because the copy is invisible to anyone
changing the original.

**Structural root cause shared with §P1-2**: the encryption hook sits *in front of* Galaxy's
output-materialisation machinery and predicts its behaviour, rather than sitting behind it. The three
"not working yet" items are one defect. `from_work_dir` is copied by
`command_factory.__handle_work_dir_outputs` (`jobs/command_factory.py:236`) **after** `tool_script.sh`
has run the postrun; collection elements are materialised by `model/store/discover`; legacy metadata is
a hard `raise` at `:587`.

**Shape worth aiming for**: hook into `ModelPersistenceContext` (`model/store/discover.py:74`), where
every output path converges:

```python
class OutputPayloadTransform(Protocol):
    def transform(self, *, path: str, ext: str) -> tuple[str, str, dict[str, Any]]:
        """Rewrite payload at `path` in place; return (new_path, new_ext, metadata)."""
```

Crypt4GH implements it once; every discovery path gets encryption for free; ~330 lines of
re-implemented collector matching and most of the 490-line verifier become unnecessary because there
is no coverage gap left to verify. **This must be settled before the module is split**, because it
determines where the seams belong — otherwise the split cuts along lines that have to be re-cut.

### P1-10. `JobNotReadyException` is reused with inverted semantics, and the job is failed twice

`jobs/__init__.py:1843-1850` calls `self.fail(error_message)` **and then** raises
`JobNotReadyException`. That exception (`jobs/mapper.py:44`) means *"not ready yet, re-check later"* —
`handler.py:750` maps it to `JOB_WAIT`. Here it means "permanently failed". Reusing an existing
exception with the opposite meaning is worse than defining a new one; the next person to add an
`except JobNotReadyException` silently breaks this path.

It also raises out of `enqueue()`, whose only caller `BaseJobRunner.put()`
(`jobs/runners/__init__.py:207`) catches bare `Exception` and calls `job_wrapper.fail(...)` at `:213`
— so the job is failed twice with the same message. Either `fail()` and return `False` (the existing
`enqueue()` contract, already used for the over-quota case at `:1831`) or raise and let `put()` do it.
Not both.

### P1-11. The readiness guard runs on every job enqueue with no feature flag

`jobs/__init__.py:1819` calls `_assert_crypt4gh_job_readiness(job)` unconditionally in `enqueue()`.
Unlike every other crypt4gh hook in that file (`:2341`, `:2361`, `:2576`), it is not behind
`enable_crypt4gh_transparent_staging`. It materialises `job.input_datasets` **and**
`job.input_library_datasets` (`util/crypt4gh.py:375-378`) for every job on every install —
`input_library_datasets` is an infrequently-touched relationship, so this is a gratuitous lazy-load on
the hot enqueue path for a feature that is off. One-line fix.

---

## P2 — Should fix

### Fail-closed gaps

- **P2-1. `crypt4gh_cleanup_failure_is_job_failure` defaults to `false`, and in that branch the user
  is told nothing.** With the shipped default: decrypted plaintext inputs remain at
  `<working_dir>/_crypt/inputs/ds_<id>/plaintext`, plaintext output copies remain at
  `.../outputs/ds_<id>/plaintext` (`_finalize_output_target:1970` does `shutil.copyfile` and **never
  unlinks it** — verified, no `unlink` of `plaintext_path` anywhere), the job is marked **OK**, and
  `job.info` and `dataset.info` are untouched. The only record is a line in the handler log. The user
  who chose Crypt4GH precisely so their data would never sit unencrypted on a shared compute node is
  not told. Independent of the default, the `else` branch must still write to `job.info`/`dataset.info`
  — the option should choose "does this fail the job", not "does the data owner find out". Recommend
  the default become `true`.
- **P2-2. Cleanup-failure signalling is a substring match on tool stderr.**
  `CRYPT4GH_CLEANUP_FAILED_MARKER in (tool_stderr or "")`. Spoofable by any tool (low impact — a
  self-inflicted failure). The real problem: on SIGKILL (walltime, OOM, preemption) the wrapper never
  reaches the cleanup block, no marker is emitted, and **the host reads the absence as success** while
  plaintext survives on the compute node. Host-side `cleanup_crypt4gh_plaintext_artifacts` only helps
  when host and compute share a filesystem — not the remote-Service-B architecture this is built for.
  Invert to a positive attestation: write `_c4gh_stage/cleanup_ok` on success and treat its absence as
  failure.
- **P2-3. The dead configuration guard.** `crypt4gh_remote_execution.py:595-668` is a 70-line
  fail-closed guard asserting `tool_evaluation_strategy = remote`, `outputs_to_working_directory`,
  `metadata_strategy = extended`, and a non-empty service URL. **It has zero callers.**
  `jobs/__init__.py:123` imports a *different* function of the same name from `galaxy.util.crypt4gh`,
  which only checks metadata presence and expiry. Two functions, same name, different signatures, one
  dead — a live trap. Two config keys it reads (`enable_crypt4gh_transparent_input_matching`,
  `enable_crypt4gh_remote_execution_staging`) **don't exist in `config_schema.yml`** at all, so both
  `getattr(..., False)` reads are permanently `False`. Meanwhile `Crypt4GHGateConfig`
  (`remote_tool_eval.py:59-67`) **hardcodes** `outputs_to_working_directory=True`,
  `metadata_strategy="extended"`, `tool_evaluation_strategy="remote"` rather than reading them — so
  the gate asserts its own preconditions instead of verifying them. An admin who enables the feature
  but leaves `outputs_to_working_directory: false` gets no error anywhere, and runs the staging path
  in a mode whose fail-closed behaviour was never validated. Given how much of §P1-3 rests on
  `outputs_to_working_directory`, that is not cosmetic. Also ~170 lines of dead code including
  `Crypt4GHComputeEnvironment = Crypt4GHRemoteComputeEnvironment` (zero references) and a
  `del transparent_adapted_inputs` that computes a value solely to discard it.
- **P2-4. Plaintext staging: predictable paths, inherited umask, symlink-following writes.**
  `<working_dir>/_crypt/inputs/ds_<dataset_id>/plaintext` — sequential ids, standard layout, no
  `mkdtemp`-grade randomness. `mkdir`/`open` inherit the deployment umask (commonly `0755`/`0644`), so
  on a shared cluster filesystem other local users can read decrypted patient data for the job's
  lifetime. `exist_ok=True` plus symlink-following `open("wb")` means a pre-created symlink redirects
  the plaintext (precondition: write access to the working dir, so hardening rather than a standalone
  break). Fix: `mode=0o700` + explicit `chmod`, and `os.open(..., O_WRONLY|O_CREAT|O_EXCL, 0o600)`.
- **P2-5. The recryptor URL has no scheme validation and the documented example is plain HTTP.**
  `config_schema.yml` shows `http://127.0.0.1:47419`; `_ssl_context_for_reencryption_url:103` returns
  `None` for non-HTTPS and posts cleartext. What crosses that wire is wrapped session keys — a passive
  observer who also has the ciphertext recovers the plaintext. The same config block's docstring claims
  Galaxy "never handles private keys or plaintext payload bytes", which is true while the example hands
  session keys to the network in the clear. Not SSRF-shaped (admin-configured), but a typo'd or
  DNS-hijacked host becomes a decryption oracle for every job, with no pinning and no mutual auth.
- **P2-6. Output verification is an 8-byte magic check.** `_verify_payload_header_evidence:2413-2431`
  and friends read 8 bytes and compare to `b"crypt4gh"`. That catches the failure the author was
  chasing ("the postrun didn't run") and is worth having. It does **not** prove the file is encrypted
  (8 literal bytes are trivial to emit), that the header is well-formed (`read_crypt4gh_header` exists
  at `util/crypt4gh.py:159` and isn't called), or **that the payload is encrypted to the right
  recipient** — nothing compares the header's recipient to the user's key, so a compromised or
  misconfigured Service B can wrap the session key to an attacker's public key and every check passes
  while the job goes green. Worth restating in the PR description, because "verified to have valid
  Crypt4GH framing" reads to a skimming reviewer as "verified to be encrypted to the user".
- **P2-7. Plaintext sidecars land inside the dataset's extra-files directory.**
  `_finalize_discovered_extra_files:1265-1269` writes `<extra_files_dir>/<name>.c4gh.plaintext`,
  **outside `_crypt/`** — so `cleanup_crypt4gh_plaintext_artifacts` (which only rmtrees
  `_crypt/inputs` and `_crypt/outputs`) doesn't remove it and
  `_verify_no_residual_plaintext_staging_artifacts` doesn't see it, while the extra-files directory is
  persisted to the object store. It is contained today only *accidentally*, by
  `_verify_extra_files_manifest_evidence:2549` noticing an unmanifested entry — and per §P1-3, only
  after the sidecar has already been written to the object store. The `finally` block in
  `_finalize_output_target` already unlinks the other two temporaries; the omission looks like an
  oversight.
- **P2-8. `_assert_path_within_allowed_roots` returns silently on an empty root list** (`:2718-2720`)
  — a containment assertion whose degenerate case is "allow everything", used at 14 call sites. No
  reachable bypass today (`_resolve_allowed_root_paths` always synthesises a parent, and
  `finalize_about_to_persist_crypt4gh_payload:1656-1660` raises on empty), but it should `raise`, not
  `return`.
- **P2-9. TOCTOU on key expiry between enqueue and execution.** The enqueue guard only checks
  `expiration > now`, so a key expiring in one second passes and the user learns at execution. The
  compensating controls are decent and worth crediting (`_assert_minimum_ttl:3035-3049` demands
  `ttl_left > minimum_ttl` on the compute side; `_assert_key_valid_for_output_finalization:3069`
  re-checks at finalization), so the failure mode is a failed job, not a leak. But
  `_parse_destination_walltime:774-788` only understands `HH:MM:SS` — Slurm's `D-HH:MM:SS` and
  bare-minutes forms fall back to the 1-day default, so a 3-day job on `walltime: 3-00:00:00` can
  outlive its key mid-run, failing at finalization *after* plaintext has been on disk for three days.
  Check `galaxy.util` for an existing walltime parser before adding a third. No enqueue path bypasses
  `MinimalJobWrapper.enqueue()` — verified single call site, covering workflow scheduling, map-over,
  re-run and resubmission.

### Structure and reuse

- **P2-10. The dynamic-wrapper mechanism reinvents `auto_compressed_types`.** Galaxy has had this
  exact pattern for years (`registry.py:393-441`): take a datatype, produce a suffixed variant. The
  differences are all in the new code's disfavour — opt-in per datatype vs. unconditional for all;
  `type(name, (datatype_class, dynamic_parent), attrs)` **inheriting the real class** (so `isinstance`
  works and no `matches_any` override is needed) vs. holding the inner *instance* in an attribute;
  registered in `datatype_info_dicts`/`upload_file_formats`/converters vs. not; deliberately excluded
  from `sniff_order` vs. accidentally included (§P1-5); config-gated vs. not. Reusing the
  multiple-inheritance form removes the need for the `matches_any` override entirely, and a
  per-datatype opt-in (`auto_encrypted="true"`, mirroring `auto_compressed`) bounds the blast radius.
  **This is the finding to raise with the author even if nothing else changes** — the current shape is
  what forces §P1-5, §P1-6, and P2-11.
- **P2-11. Wrappers are missing from `datatype_info_dicts`**, so `/api/datatypes` omits every `.c4gh`
  extension and `Crypt4GH.display_behavior = "download"` (`crypt4gh.py:49`) is **dead** — the client
  will try to preview an encrypted blob. `edam_format`/`edam_data` are copied onto the classes but
  `registry.edam_formats` is never updated, so `/api/datatypes/edam_formats` disagrees with the class
  attributes. The registry ends up internally inconsistent: one structure says these types exist, four
  others say they don't.
- **P2-12. The service client should be extracted before merge — it's the cheap one.** ~150 contiguous
  lines (`:66-218`), one dependency direction, no external callers. A day's work now; later it isn't,
  because retry/timeout policy gets bolted onto each of three call sites and diverges, the `python -c`
  postrun bakes the module path into shipped job scripts, and the TLS-context special-casing spreads.
  Shape: `RecryptorClient` with `recrypt_header_to_job_key` / `recrypt_header_to_user_key`, typed
  request/response models, one home for TLS policy and `_summarize_http_error_response:2968`.
- **P2-13. `aiohttp` earns nothing here.** Used in exactly two places (`:128`, `:151`), both
  immediately wrapped in `asyncio.run()` — the module is entirely synchronous. The only gain is an
  `asyncio.gather` fan-out over typically 1–3 requests. Galaxy already has
  `galaxy.util.requests.RetrySession` (`:25`), which ships the `Retry`/`HTTPAdapter` behaviour the
  PR's own future-work list asks for, plus the Galaxy user-agent — and `httpx` is already pinned if
  async is genuinely wanted.
- **P2-14. Output encryption bypasses `command_factory` entirely.** `remote_tool_eval.py:196-208`
  concatenates the postrun into `tool_script.sh` directly. Galaxy's established mechanism is
  `CommandsBuilder` (`jobs/command_factory.py:307`) with `append_command`/`capture_return_code`, whose
  two existing consumers are `__handle_work_dir_outputs` and `__handle_metadata`. Writing directly
  makes the postrun a *third* output-handling stage with no defined ordering relative to the other two
  — which is the mechanical cause of the `from_work_dir` failure. It also means the 133 hand-rolled
  lines of exit-code shell in `build_crypt4gh_cleanup_wrapped_command:2744-2876` duplicate
  `CAPTURE_RETURN_CODE`.
- **P2-15. The postrun is a generated Python source string.** `build_crypt4gh_postrun_command:1367-1432`
  concatenates Python source with JSON-in-JSON (`json.dumps(json.dumps(...))` at `:1389`) and a
  `PYTHONPATH` derived from `Path(__file__).resolve().parents[2]` (`:1383`) — unlintable, untypeable,
  untestable except by string comparison, silently broken the moment the module moves (which the
  author's own future-work item 1 requires), and hard-coupling the compute node's lib layout to the
  submitting node's. Ship a real `python -m galaxy.tools.crypt4gh.postrun_main <spec.json>` entry point.
- **P2-16. Three representations of the same output target.** Frozen `_DeclaredCrypt4GHOutputTarget`
  (`:286`) → flattened to an untyped dict (`:1555`) → `finalize_about_to_persist_crypt4gh_payload`
  takes **17 keyword arguments** (`:1637-1654`) and reconstructs essentially the same dict → read back
  with `concrete_target.get("...", "") or ""`. The dataclass exists and is then discarded for
  serialisation; give it `to_dict`/`from_dict` (or make it Pydantic, which Galaxy uses extensively)
  and delete both the flattener and the 17-kwarg signature.
- **P2-17. `_purge_output_targets_after_finalization_failure` is 135 lines of 4× copy-paste**
  (`:1747-1881`) — four near-identical blocks with the same three `except` arms and the same two log
  messages, the third re-checking `errno` values it already caught by type. Collapses to ~30 lines
  behind one `_purge_path(...)` helper. Zero risk, and the clearest single instance of "this module is
  3000 lines because nothing was factored".
- **P2-18. `guess_ext_from_file_name` now overrides an explicit extension, name-only.** The crypt4gh
  branch (`sniff.py:599-603`) sits *before* the `requested_ext != "auto"` early return, and
  `infer_crypt4gh_file_ext` treats filename inference as priority 1. So a deferred fetch of
  `reads.txt.c4gh` with explicit `ext: bam` yields `txt.c4gh` — the documented "user's choice wins"
  behaviour, inverted. Nothing inspects content on this path (it's the deferred branch), so the
  extension comes purely from the name. `_is_generic_crypt4gh_file_ext` matches `c[^.]*4gh`, so
  `.chicken4gh` is claimed; **all 769 sample-conf extensions were checked and none collide**, so it's
  loose rather than dangerous — anchor it to `c4gh`/`crypt4gh`.
- **P2-19. `is_archive_download` returns True for all Crypt4GH datasets**, because the hook signature
  can't see the instance (`crypt4gh.py:189-201`). So `get_direct_download_url` returns `None` and
  **no presigned/redirect URL is ever issued** — every download streams through the Galaxy web process,
  and `Content-Length` is omitted on HEAD. For large encrypted genomics files on S3, that is exactly
  the benefit client-side encryption was meant to preserve, surrendered for all datasets to serve the
  minority with extra files. `is_archive_download` already takes `datatypes_registry` and `extension`;
  adding an optional `dataset` (both call sites have `dataset_instance` in hand) fixes it and leaves a
  better hook behind.
- **P2-20. Wrappers hold a stale inner-datatype reference across a registry reload.**
  `_register_crypt4gh_datatypes` early-outs on `if wrapped_extension in self.datatypes_by_extension:
  continue` (`:511-512`), but `load_datatypes` is re-entrant (Tool Shed datatype installs re-run it)
  and a shed repo can replace an existing extension's instance. The wrapper keeps
  `crypt4gh_inner_datatype` pointing at the **old** instance for the process lifetime. Early-out and
  re-entrancy verified in code; a shed datatype install was not exercised.
- **P2-21. The Recrypt button isn't gated on the feature flag** — though `managers/configuration.py:260-261`
  adds `enable_crypt4gh_transparent_staging` to the frontend config for apparently exactly this
  purpose. Grepping `client/src`: **neither new config key is referenced anywhere in the client.**
  Combined with §P1-8, a user on a feature-disabled install sees a key icon that can only ever produce
  a red toast. Also drop `crypt4gh_cleanup_failure_is_job_failure` from the frontend config — it's a
  job-failure policy internal with no client consumer, and `ConfigSerializer` is what anonymous users
  get.

### Config

- **P2-22. No startup validation that `crypt4gh_reencryption_service_url` is set when the feature is
  enabled.** First consulted at `crypt4gh_remote_execution.py:661`, failing at `:665` **per job** rather
  than at startup. The message is clear and actionable, so this is usability rather than a stack trace
  — but an admin who flips the boolean and forgets the URL learns from a failed job. Galaxy validates
  other paired config in `config/__init__.py`. Note also the pervasive
  `getattr(self.app.config, "enable_crypt4gh_transparent_staging", False)` idiom (7+ sites): the key is
  declared in the schema, so the attribute is guaranteed on a real config object and the defensive
  `getattr` only masks typos and defeats the type checker.

---

## P3 — Nits

- Dynamic `truststore` import in a bare `try/except Exception` (`:54-57`) — top-level so it satisfies
  the imports rule, but `except Exception` around an import turns a broken install into a silent TLS
  downgrade. Prefer `except ImportError` with a typed `ModuleType | None`.
- Service B's error body is echoed into user-visible `job.info` (`_summarize_http_error_response:2968-2992`,
  200 chars of third-party text) — `util/crypt4gh.py:16-17` explicitly promises error messages don't
  leak header bytes, and this path doesn't uphold it for text Galaxy didn't write.
- `_is_dev_style_https_reencryption_url` treats any single-label hostname as dev-style (`:95`,
  `"." not in hostname`). Verified harmless — truststore still validates against the OS store, which
  for an internal CA is arguably right — but the name suggests a dev-only escape hatch and invites a
  future "simplification".
- Inconsistent naive-datetime handling: the API-facing `validate_crypt4gh_keypair_expiration`
  (`util/crypt4gh.py:353-356`) accepts naive timestamps against host-local `now()`, while the
  execution-side `_parse_expiration` (`:3063-3064`) rejects them. The API accepts values the execution
  path will refuse. Make the API validator strict — it moves the error to where the user can act.
- `_effective_tool_evaluation_strategy` (`:697`) returns `""` for "unset", indistinguishable from a
  config typo; use `None` or an enum.
- `print(f"CRYPT4GH_DEBUG ...", flush=True)` at `:1533` — env-gated so not a default-path problem, but
  it writes to job stdout, which Galaxy parses. Use `log.debug`.
- 25 bare `except Exception` in one module. Several are legitimate cleanup guards; `:1305`
  (`except Exception: existing = {}` when parsing `galaxy.json`) silently discards a corrupt metadata
  file — the one place a loud failure is most wanted.
- `_resolve_pre_success_marker_directories:2337` probes three speculative locations for the marker
  directory. Guessing at a path layout you also wrote is a smell; share one derived constant between
  writer and reader.
- ~900 redundant entries injected into `datatypes_by_suffix_inferences` (`registry.py:515`, `:522`) —
  every key ends in `.c4gh` and is already short-circuited by the new branch at `:656-665`. Dead weight
  in a hot lookup dict.
- `model/deferred.py:280-287` passes `current_ext=dataset_instance.extension` on a path guarded three
  lines earlier by `if dataset_instance.extension != "auto": return`, so that branch is unreachable
  here. Copy-paste from the other three call sites.
- **Formatting will fail CI**: `sniff.py:950` is 132 chars and `:969` is 129 (limit 120), plus trailing
  whitespace and a stray double blank line at `crypt4gh.py:216`. The branch hasn't been through
  `make format`.
- `DatasetActions.vue:50-53` hand-codes `ext === "c4gh" || ext.endsWith(".c4gh")`, narrower than the
  server's `c[^.]*4gh` — a dataset with extension `crypt4gh` is Crypt4GH to Python and isn't to the
  client. Belongs in a shared client util.
- `useCrypt4ghRecrypt.ts:54` hard-codes `https://localhost:${port}` — scheme and host not configurable,
  and `https` to a self-signed local service fails with an opaque network error. The user preference is
  `type: text` with no validation (should be `integer`, or the whole base URL). The config schema's
  server-side example uses port `47419` while the client default is `61357`; the two services and their
  ports are never explained together anywhere.
- `useCrypt4ghRecrypt.ts:28-30,114-115`: `(item as unknown as Record<string, unknown>)` double-cast
  defeats the generated `HDADetailed` typing; `historyStore.loadCurrentHistory()` reloads the whole
  history and is a no-op outside the current history (multi-history view, shared dataset page), leaving
  stale UI after a successful recrypt. Half-recrypted state is possible but bounded — if `setAttributes`
  fails after the service call succeeded, the service has minted a keypair Galaxy has no record of.
  Only a toast; no retry, no cleanup.
- `pyproject.toml:16` inserts `"aiohttp"` before `"aiofiles"`, breaking local alphabetical order
  (cosmetic — the list isn't strictly sorted overall).
- `doc/source/admin/galaxy_options.rst:477-487` carries an **unrelated hunk** rewriting the
  `tool_source_database_connection` description — regeneration drift from a stale base. Drop it.

---

## Zero tests — a finding, not a process complaint

Nothing under `test/` mentions `crypt4gh` or `c4gh`. Every box under "Automated testing" in the PR body
is unchecked future work. For a confidentiality feature, this is substantive: **every blocking finding
above is a branch that takes the safe-*looking* exit, and a single test would have exercised each one.**

Minimum set before merge, none requiring a running Galaxy or recryptor service:

| Property | Test | Catches |
|---|---|---|
| Verifier doesn't fail open | `verify_crypt4gh_pre_success_output_evidence` with no `_c4gh_stage/` and a plaintext payload → expect raise | §P1-2 |
| Unencryptable outputs fail | `collect_discovery_crypt4gh_output_specs` with a `format="auto"` collector → expect raise | §P1-2 |
| Every output shape is covered or raises | table-driven over declared / `from_work_dir` / pattern discovery / `tool_provided_metadata` / `assign_primary_output` / `format="auto"` | §P1-9 (goes red now, stays red until the hook moves) |
| Failed verification purges | `finish()` with the verifier raising → assert dataset purged, not merely ERROR | §P1-3 |
| Compute metadata isn't a portable capability | B publishes a recrypted dataset, A copies and runs `cat` → expect rejection | §P1-1 |
| Feature-off import graph | subprocess `import galaxy.jobs`, assert `crypt4gh`/`aiohttp` not in `sys.modules` | §P1-4 |
| `sniff_order` doesn't grow by ~900 | one assertion on `len(registry.sniff_order)` | §P1-5 |
| `ext_to_class_name` values are unique across `.c4gh` | one assertion | §P1-6 |
| Config prerequisites enforced | `metadata_strategy="directory"` + Crypt4GH input → expect raise at enqueue | P2-3 |
| Cleanup failure is user-visible | flag `false` → assert `job.info` still carries the message | P2-1 |
| Staging permissions | `0o700` dir / `0o600` file under umask `022` | P2-4 |
| Postrun script is stable | golden-file test of `build_crypt4gh_postrun_command` output | makes P2-14/P2-15 safe to attempt |

The datatype layer (`test/unit/data/datatypes/`) is pure functions over strings and 16-byte headers —
the cheapest thing in the entire PR to test, and untested.

---

## Position on the author's own future-work list

The author already names three refactors. Taking a position on each, plus two they omitted:

| Item | Before merge? | Why |
|---|---|---|
| **Reduce module size** | **Partially** | The full split can wait, but three extractions are pure subtraction and should happen now: delete ~170 lines of dead code (P2-3), collapse the 135-line purge duplication (P2-17), extract the service client (P2-12). ~350 lines off, zero behaviour change. The `staging`/`finalize`/`verify` boundary genuinely can wait — it depends on where §P1-9 lands. |
| **Generalize the encryption framework** | **No — and actively don't** | N=1. Any interface designed now gets shaped by Crypt4GH's peculiarities (per-job keypairs, header/body split, an external recryptor) and will be wrong for whatever comes second. The right pre-merge investment is a **seam**, not an abstraction: route the postrun through `CommandsBuilder` (P2-14) and hook output transformation into `ModelPersistenceContext` (§P1-9). With those, generalising later is adding an implementation; without them it's re-plumbing. |
| **Decouple service communication** | **Yes** | Cheapest item, fastest-growing cost. ~150 lines, one class, three call sites. See P2-12. |
| *(omitted)* **Fix the output-coverage gap** | **Yes — the real blocker** | §P1-2 + §P1-9. Framed as three bugs in a "not working yet" list; it's one architectural mismatch, and it determines what the module's internal boundaries should be. |
| *(omitted)* **Un-import the optional dependency** | **Yes** | §P1-4. Affects every deployment including flag-off ones, breaks existing remote-eval installs, ~20 lines. |

---

## Where this is genuinely sound

Stated explicitly so the author doesn't have to defend it.

**Key handling is right.** The per-job private key never touches disk, the DB, `galaxy.json`, or logs —
every occurrence traced. `X25519PrivateKey.generate()` (`:817`) is `cryptography`'s CSPRNG, not a
home-rolled PRNG. Fresh per job, generated on the compute node so only the public half crosses the
network, and not reused for output encryption (`_encrypt_plaintext_to_compute_key:2885` mints a
separate ephemeral key per call).

**No home-rolled crypto.** Everything goes through `crypt4gh.lib.encrypt/decrypt` and
`crypt4gh.header.parse`. The module never constructs a nonce, derives a key, or touches an AEAD.

**TLS is never disabled.** No `verify=False`, no `ssl=False`, no `CERT_NONE`, no `check_hostname=False`
anywhere in the diff. The `https://localhost` path uses `truststore.SSLContext(PROTOCOL_TLS_CLIENT)`,
reading the OS trust store — the correct mkcert story, still validating chain and hostname. Absent
truststore it falls back to `ssl=True`, i.e. stricter. Timeouts are set on both call sites
(`ClientTimeout(total=30)`).

**Transport and finalization failure paths fail closed** — `_parse_recrypt_header_to_job_key_response:512,531`,
the response-count check at `:430`, `_recrypt_header_to_user_key:2938-2955`, and the
`except Exception: _purge...; raise` wrappers at `:1631` and `:1742` all fail closed and clean up.

**Path containment was taken seriously**: `_assert_path_within_allowed_roots` before every
`unlink`/`rmtree`, explicit `allowed_root_paths` provenance threaded through destructive operations,
explicit symlink rejection at `:2624`. Real adversarial thinking, and the layering intent (frozen
dataclasses, fail-closed defaults, a host-side verifier refusing to green a job without positive
evidence) is the right posture for this problem.

**`matches_any` is correctly scoped** — the override lives on `Crypt4GH` only and doesn't touch
`Data.matches_any` or `CompressedArchive.matches_any`. With the flag off it degrades to a plain
`isinstance`, semantically identical to the base. This is the one place the gating is genuinely right.

**`preserve_crypt4gh_inner_file_ext` is a true no-op for non-Crypt4GH datatypes**, so the four
re-detection call sites change nothing for existing types — the "extension retention during
re-detection" concern checks out clean.

**No extension collisions.** All 769 sample-conf extensions checked against both `^c[^.]*4gh$` and a
`.c*4gh` suffix — nothing existing can be mistaken for a wrapper, and `wrap_crypt4gh_file_ext` is
idempotent. Multi-part extensions (`fastqsanger.gz.c4gh`) resolve correctly.

**`upload_file_formats` is untouched**, so the upload dialog's dropdown doesn't gain 900 entries —
the loudest possible regression, avoided.

**The client reuses `setAttributes`** rather than hand-rolling Galaxy-side HTTP, and raw `axios` for
the external Service A call is defensible since the generated client doesn't apply to a third-party
host. The only global axios interceptor attaches an `AbortSignal` — no credentials or Galaxy headers
leak to the external service.

**Imports are at module top level throughout** — no function-buried imports introduced anywhere in the
PR. The problem is the opposite of the usual one: the imports that *should* be deferred (§P1-4) are
eager.

**Config is documented and regenerated** — all three keys have descriptions and appear in
`galaxy.yml.sample`, `galaxy_options.rst`, and `_galaxy_config_schema_attributes.py`, with sane defaults.

---

## Restating the two design principles

**"Galaxy never sees private keys or unencrypted data" — partially true, and the precise statement
matters.** The Galaxy *web and handler* processes never see either: verified. But the compute-side
`remote_tool_eval` process is Galaxy library code (`lib/galaxy/tools/crypt4gh_remote_execution.py`)
running as the job user, and it generates a private key and decrypts the data with it. That is inherent
to the architecture and not a flaw — it's where the trust boundary actually sits. The PR's phrasing
invites a reviewer to believe no Galaxy-controlled code ever holds plaintext, and it does. The key is
handled well; the plaintext less so (P2-1, P2-4, P2-7).

**"Fail-closed throughout" — not yet.** Transport and finalization are genuinely fail-closed. The
*verification* path is fail-open in its most important case (§P1-2), the discovery path is fail-open by
`continue` (§P1-2), the cleanup-failure path is fail-open by default and silent (P2-1, P2-2), and the
configuration guard that would have caught the misconfigurations is never called (P2-3). The shape of
the design is right; five specific branches take the wrong exit.
