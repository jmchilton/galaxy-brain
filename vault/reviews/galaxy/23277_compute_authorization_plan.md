# Crypt4GH compute authorization — implementation plan

Supersedes [[23277_principal_bound_compute_grants_comment]], which was written before we knew that
compute keypairs are allocated per user, that the user public key is recoverable from the header
([[23277_user_public_key_leak]]), and that sveinugu maintains both sides.

The headline change: **the copy path can be closed Galaxy-side alone, with no protocol change and no
service change.** That was not obvious before and it makes the first increment much cheaper than the
grant-model writeup assumed.

---

## The realization

Three facts compose:

1. `/get_compute_key_info` allocates a compute keypair **per user public key**
   (`ComputeKeypairFiles.lookup_last_exp_key_id_dir_or_create_new`). Bob and Alice get different
   compute keypairs.
2. Bob's compute header is therefore sealed to *Bob's* compute keypair.
3. Galaxy takes the keypair id straight from the **dataset's** metadata —
   `lib/galaxy/tools/crypt4gh_remote_execution.py:486`:

   ```python
   keypair_id = getattr(metadata, "crypt4gh_compute_keypair_id", None)
   ```

   That is the copied value. Alice's job presents Bob's header *and* Bob's keypair id, so Service B
   opens it with Bob's compute private key and everything succeeds.

If Galaxy instead resolves the keypair from the **job user's own enrollment**, Service B tries to
open Bob's header with Alice's compute private key and fails. Verified against the pinned packages:

```
Bob enrolls (expect 0): 0
Alice's compute key opens Bob's header (0 = yes, non-0 = refused): 3   # ValueError: No header packet could be decrypted
Control, Bob keypair (expect 0): 0
```

The copy path closes at the crypto layer. No token required for that threat.

### The policy answers itself

Better still, this removes the policy question rather than answering it. Service A recrypts using the
local user's **private** key, so Alice can only produce a valid compute header for a dataset her own
key can open — i.e. only if she is a genuine Crypt4GH recipient of that file.

So "may Alice compute on Bob's shared dataset?" reduces to "is Alice actually a recipient?", which is
decided by the file's own header rather than by Galaxy policy. Sharing ciphertext grants nothing;
being a real recipient grants everything. That is the right semantics and it needs no config flag.

---

## Phase 0 — the regression test, written red

Before any implementation. On the scaffolding added in `fdd99232d`
(`lib/galaxy_test/selenium/integration/crypt4gh/`), which already has a mock Service B, key
fixtures, `upload_crypt4gh_dataset`, and a registered-user harness.

- Bob uploads and recrypts. Alice copies the HDA into her history. Alice runs `cat1`.
- Assert the job fails **before** Service B is contacted and **before** any plaintext staging.
- Assert the mock recryptor recorded zero `/recrypt_header_to_job_key` calls — the mock is in-process,
  so a call counter is trivial and is the strongest form of this assertion.

This test is the executable form of the whole design. It fails today.

**Also fix the mock while here:** `crypt4gh_test_utils.reencrypt_header` generates an ephemeral sender
key per recipient, while the real `do_recrypt_header` reuses the decryption key as sender. The mock
currently models the protocol *more safely* than the real service, which hides exactly this class of
issue. Make it match.

---

## Phase 1 — Galaxy-side ownership resolution (closes the copy path)

Galaxy-only. No service change, no protocol change, no coordination needed.

**Server-managed enrollment.** A record keyed on `(user, destination)` holding `compute_keypair_id`,
expiry, and the user's Crypt4GH public key. This is the natural grain: the compute keypair is already
per user per expiry window, so storing it per dataset was always a mismatch. Not secret — a plain
model table, not the vault.

**Resolve from the job, not the dataset.** Replace the `crypt4gh_remote_execution.py:486` lookup with
a resolution against `job.user_id`'s enrollment for the selected destination. The compute *header*
stays per-dataset (it genuinely is per-dataset), but is recorded against the enrollment that produced
it.

**Readiness guard checks ownership.** `_assert_crypt4gh_job_readiness` should require that the header
on each input was produced under the job user's own enrollment, and fail with an actionable message
— "this dataset has not been recrypted by you; use Recrypt" — rather than letting it fail later as an
opaque 422 from Service B. Fail early, fail legibly.

**Lock the metadata.** `crypt4gh_compute_header` and `crypt4gh_compute_keypair_id` become
`readonly=True`, and the client write path goes away. Note this interacts with the
`deserialize_metadata` activation — worth extracting that separately first (see below), since making
these readonly is most of the reason the generic metadata write path was needed at all.

**Reuse rather than add.** Route the crypt4gh validation through the existing
`datatype.after_setting_metadata` hook instead of the hardcoded
`validate_crypt4gh_compute_metadata` import in `lib/galaxy/managers/datasets.py`. That turns a
special case in a generic manager into an extension point.

**Migration.** Existing `crypt4gh_compute_*` metadata is untrusted legacy state — its user binding is
precisely what cannot be established after the fact. Ignore or clear it and require re-enrollment.

Phase 0's test goes green here.

---

## Phase 2 — caller authentication and an opaque delegation (joint with sveinugu)

Phase 1 does nothing for someone who can reach Service B directly and supply Bob's keypair id —
wm75's scenario 2, and the reason he suggested compute admins restrict access. Network restriction
authenticates a *host*; the compute-side Galaxy serves every user, so a principal is still needed.

- Authenticate Galaxy/runner → Service B (mTLS, Unix socket, or deployment-appropriate equivalent).
- An **opaque, high-entropy delegation** established through the Service A flow that never appears in
  a header or dataset artifact — this is sveinugu's own second option, and the leak finding is the
  empirical case for choosing it over the public key.
- Store it in Galaxy's vault (`lib/galaxy/security/vault.py`), not in HDA metadata.
- A **protected mode** on Service B that rejects requests lacking it, rather than an optional field
  that can be omitted. An optional check is a downgrade path.
- Name the parameter for what it is — `crypt4gh_recrypt_authorization` or similar. Do not overload a
  key-shaped field; the storage and logging rules differ.

---

## Phase 3 — job-scoped authorization

Phase 2 leaves a user-scoped, long-lived secret: it stops Alice, but not replay, and not a
compromised job requesting recrypts for other datasets of the same user.

Bind the authorization to job, dataset, destination, job public key, and expiry. **Galaxy already has
this pattern** — Pulsar job tokens (`lib/galaxy/webapps/galaxy/api/job_tokens.py`,
`lib/galaxy/jobs/runners/pulsar.py`) are exactly "a compute-side process proves it is acting for one
active job." Use a new Crypt4GH-specific scope rather than reusing the existing credential.

---

## Track B — output convergence (orthogonal, runs in parallel)

Independent of authorization; needed regardless.

The finalizer currently predicts and re-implements Galaxy's output discovery
(`collect_discovery_crypt4gh_output_specs`, `finalize_discovered_crypt4gh_payloads`), which is why
`from_work_dir`, dynamic formats, and collection elements diverge — and why discovered collection
elements come back unencrypted. sveinugu reached the same conclusion independently and had moved this
into Galaxy's own discovery code before the port; ask for that branch and diff it rather than
rebuilding.

Move the encryption hook to where all resolved outputs converge — the discovery/persistence seam in
`lib/galaxy/model/store/discover.py` / `ModelPersistenceContext` — running after native discovery and
`from_work_dir` handling but before persistence. Also fix `verify_crypt4gh_pre_success_output_evidence`,
which currently returns success when no marker directories exist: absence of evidence is treated as
evidence of success in the one function whose job is to catch that.

This is also the honest answer to the Pulsar suggestion: the instinct is right — put the check where
outputs converge — but the convergence point exists Galaxy-side too, works for non-Pulsar
destinations, and Pulsar on a shared filesystem stages nothing.

---

## Suggested sequencing

1. Extract the `deserialize_metadata` activation as its own Galaxy PR (prerequisite, unblocks the
   readonly change, needs core review on its own merits).
2. Phase 0 test, red.
3. Phase 1, Galaxy-only — lands independently of anyone else's roadmap, closes the reported issue.
4. Open the recryptor issue and design Phase 2 with sveinugu while Phase 1 is in review.
5. Track B in parallel, starting from his pre-port branch.
6. Phase 3 once Phase 2's shape is settled.

---

## Unresolved questions

1. Enrollment grain — `(user, destination)` or `(user, destination, dataset)`? Per-dataset is more
   revocable; per-user matches how Service B already allocates.
2. Does anything legitimately need cross-user compute on the same ciphertext, beyond genuine
   Crypt4GH recipients? If so, Phase 1's semantics need an explicit override.
3. Does the header stay in dataset metadata (readonly) or move into the enrollment record too?
4. Same-user copies — reuse the enrollment silently, or require re-enrollment?
5. Is `work/phase2-recryptor-routes` already heading somewhere that Phase 2 should build on?
6. Who owns the Galaxy-side model change — is a new table acceptable, or is there appetite only for
   user preferences / vault entries?
7. Does the readiness guard's new failure mode need a UI affordance (a "Recrypt" prompt on a
   not-yours dataset), or is a job error message enough for now?
