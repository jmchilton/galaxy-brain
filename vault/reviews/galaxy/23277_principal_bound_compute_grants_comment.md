# Proposed solution: principal-bound compute grants and job-scoped recrypt authorization

I suggest replacing the `crypt4gh_compute_*` HDA metadata contract with two explicit authorization
objects:

1. a durable, server-managed **compute grant** saying that one Galaxy user has delegated one encrypted
   dataset to one compute destination until a specified time; and
2. a short-lived **job authorization** proving to Service B that a particular active Galaxy job may
   recrypt that grant's header to one particular ephemeral job key.

This is deliberately narrower than a generic encryption framework. It fixes the current authorization
boundary while preserving the sound parts of the PR: the user's private key remains local, the large
encrypted body is not rewritten, the ephemeral job private key remains compute-side and memory-only,
and tools still receive ordinary plaintext paths.

## Required security invariants

The design should make these properties explicit and testable:

1. A compute delegation belongs to a `(Galaxy instance, user, dataset, destination)` tuple, not to an
   HDA's copyable metadata blob.
2. Copying or sharing ciphertext does not copy another user's compute delegation.
3. Galaxy rechecks the requesting user's current dataset access when each job starts; a grant does not
   override revoked Galaxy permissions.
4. Service B accepts a recrypt-to-job request only for an active Galaxy job authorized for that grant,
   dataset, destination, and presented job public key.
5. A job authorization is short-lived, audience-restricted, and replay-resistant.
6. Raw compute headers and keypair IDs are not exposed as editable dataset attributes.
7. No plaintext output is imported into an object store before the required encryption transformation
   and verification have succeeded.

## 1. Server-managed grant model

A first model could have this shape:

```text
Crypt4GHComputeGrant
    id: UUID
    user_id: FK(User)
    dataset_id: FK(Dataset)
    destination_id: str
    recryptor_id: str
    compute_keypair_id: str
    compute_header: bytes/text
    source_header_digest: str
    state: pending | active | revoked | expired
    expires_at: datetime
    create_time: datetime
    update_time: datetime
```

The important key is `(user_id, dataset_id, destination_id)`. Using the physical `Dataset` identity
allows same-user HDA copies to reuse a grant if that is desired, while the `user_id` prevents a copy
into another user's history from inheriting it. A grant UUID gives Service B and audit logs a stable,
opaque identifier without exposing database IDs.

`destination_id` is part of the key because the compute key and Service B are destination-specific.
This also fits the PR's stated future requirement for per-destination recryptor URLs: job mapping must
select a destination first, and then resolve a grant valid for that destination.

The grant should be owned by a dedicated manager and updated through typed Crypt4GH endpoints. It
should not be written through the legacy full dataset-attributes form. The HDA API can expose safe
derived state such as:

```json
{
  "crypt4gh_compute_ready": true,
  "crypt4gh_compute_expires_at": "...",
  "crypt4gh_compute_destinations": ["cluster-a"]
}
```

It should not serialize the compute header or keypair ID to ordinary dataset consumers.

## 2. Grant enrollment flow

The current Service A flow obtains a compute key directly from Service B and then sends the resulting
header and keypair ID through the browser into generic HDA metadata. A cleaner flow makes Galaxy the
authority that starts enrollment:

```text
Browser                 Galaxy                    Service B              Service A
   |                       |                          |                       |
   | POST grant for HDA    |                          |                       |
   |---------------------->| check user + HDA access  |                       |
   |                       | create pending grant     |                       |
   |                       | request grant-bound key  |                       |
   |                       |------------------------->|                       |
   |                       |<-------------------------| key id + public key   |
   |<----------------------| grant id + public key    |                       |
   |                                                                          |
   | original header + assigned compute public key -------------------------->|
   |<-------------------------------------------------------------------------| compute header
   |                                                                          |
   | PUT completed grant {grant id, compute header}                           |
   |---------------------->| validate pending grant                            |
   |                       |------------------------->| verify header under key |
   |                       |<-------------------------| signed receipt          |
   |                       | activate grant                                    |
```

Key details:

- Galaxy authenticates the user and resolves the HDA before creating the pending grant.
- Galaxy, not the browser, chooses the destination, Service B, grant ID, and compute keypair ID.
- Galaxy-to-Service-B key allocation is authenticated. Service B records the Galaxy issuer, grant ID,
  user subject, destination, expiration, and keypair together.
- Service A accepts the compute public key allocated to the pending grant and uses the local user
  private key to recrypt the dataset's original header.
- The browser returns only the compute header and pending grant ID. It cannot substitute a different
  keypair ID.
- The compute key should be unique per grant, or at least cryptographically and server-side bound to
  the grant and user. A compute header copied from another user's grant will then be undecryptable by
  the assigned key.
- Before activation, Galaxy asks Service B to validate that the submitted compute header can be opened
  by the keypair allocated to this pending grant. Service B does not return the session key; it returns
  a signed completion receipt covering the grant ID, keypair ID, compute-header digest, public-key
  fingerprint, destination, and expiry. Galaxy activates only an exact match.
- Grant completion should have a short deadline. Pending grants that are abandoned are expired and
  their Service B key material is removed.

This completion receipt lets Galaxy detect header or field substitution without possessing the
compute private key.

## 3. Job-scoped authorization

At enqueue or job setup, Galaxy should resolve the grant using the actual `job.user_id`, physical input
dataset, and selected destination. For every encrypted input it must verify:

- the job user still has the required Galaxy dataset permission;
- the grant is active and belongs to that user and dataset;
- the grant is valid for the selected destination and recryptor;
- the grant will remain valid for the configured walltime plus a safety margin.

Merely putting `user_id` into the JSON body is not sufficient because a caller could claim any ID.
Service B needs an authenticated statement from Galaxy. The statement should be a short-lived signed
authorization containing at least:

```json
{
  "iss": "<Galaxy instance>",
  "aud": "<Service B / destination>",
  "sub": "<opaque Galaxy user subject>",
  "grant_id": "<UUID>",
  "dataset_uuid": "<UUID>",
  "job_id": "<opaque job identifier>",
  "operation": "recrypt_header_to_job_key",
  "job_public_key_sha256": "<digest>",
  "iat": 0,
  "exp": 0,
  "jti": "<one-time identifier>"
}
```

The job public key is generated on the compute side, so there are two reasonable ways to bind it:

1. The trusted compute setup wrapper generates the key and calls a Galaxy internal endpoint using a
   job-runner credential. Galaxy checks that the job is active and returns the signed authorization
   bound to the supplied public-key digest.
2. Galaxy supplies a one-time signed challenge to compute. Service B atomically consumes that challenge
   on the first request and binds it to the first presented job key.

The first approach is stronger and resembles Galaxy's existing Pulsar pattern: Pulsar receives a
job-specific key and uses it to call job-scoped Galaxy endpoints while the job is active
(`lib/galaxy/jobs/runners/pulsar.py:680-699` and
`lib/galaxy/webapps/galaxy/api/job_tokens.py:27-69`). This should use a new Crypt4GH-specific scope and
endpoint rather than reusing the OIDC-token key or exposing a broader existing job credential.

Service B then verifies the Galaxy signature or calls back to Galaxy, checks `iss`, `aud`, `exp`, and
`jti`, loads the keypair bound to `grant_id`, verifies the user/dataset/destination relationship, and
compares the presented job public key's digest. Only then does it open the compute header and recrypt
to the job key.

The output-direction `/recrypt_header_to_user_key` request needs the same job authorization, with a
different `operation` value. It must be tied to the grant used for the input and to the active job so
that a bare keypair ID is never sufficient authority in either direction.

mTLS between Galaxy/compute and Service B is appropriate for transport and workload authentication,
but it is additive: the signed job authorization carries the user, dataset, grant, and job decision.

## 4. Explicit sharing semantics

The initial policy should be conservative and simple:

- Sharing an encrypted HDA shares ciphertext and ordinary Galaxy metadata, not an existing compute
  grant.
- A same-user HDA copy may resolve the same `(user, Dataset, destination)` grant.
- A different user gets no compute grant merely by copying the HDA.
- A recipient who is genuinely a Crypt4GH recipient can enroll their own grant using their own local
  key and an appropriate header packet.
- Revoking Galaxy dataset access prevents subsequent jobs even if a grant has not yet expired.

If the product instead wants an owner to delegate plaintext computation to another Galaxy user, that
should be a separate explicit operation that creates a recipient-specific grant and audit event. It
should not be an accidental consequence of metadata copying.

## 5. Output transformation and persistence

Authorization fixes who may decrypt; the output path still needs to become genuinely fail-closed. The
Crypt4GH finalizer currently predicts and reimplements Galaxy discovery before Galaxy's native output
materialization, which is why `from_work_dir`, tool-provided metadata, dynamic formats, and collection
elements diverge.

The encryption hook should run where all resolved output paths converge, after native discovery and
`from_work_dir` handling but before persistence. `ModelPersistenceContext` and the discovery/storage
callbacks in `lib/galaxy/model/store/discover.py` are the appropriate existing seam to extend. A small
payload-transform protocol is enough; it does not need to be a general encryption framework yet:

```python
class OutputPayloadTransform(Protocol):
    def transform(self, *, path: str, ext: str, dataset: DatasetInstance) -> TransformResult:
        """Transform a resolved output before persistence or raise to abort persistence."""
```

For an authorized Crypt4GH job, every persistable payload is passed through the transform. The
transform returns the encrypted path, wrapped datatype, and protected metadata. If it cannot determine
how to encrypt an output, it raises; it never silently continues.

Verification must occur before `perform_import()` or any move into the object store. The host should
know that protected processing was active and should require a positive manifest covering every
resolved output. Legitimate no-output tools and empty collections should emit an explicit successful
empty manifest, rather than relying on absence of evidence. On transformation or verification failure,
Galaxy must avoid import, purge temporary output bytes, and leave only an error dataset with no
downloadable plaintext payload.

## 6. Migration and compatibility

Existing `crypt4gh_compute_*` metadata must be treated as untrusted legacy state. It should not be
automatically converted into grants because its user binding is exactly what cannot be established.
On upgrade, Galaxy should ignore or clear it and require users to enroll new grants.

The feature should remain disabled unless the configured Service B advertises support for the
authenticated grant protocol. Startup validation should reject an enabled configuration with a legacy
anonymous Service B, a missing destination mapping, or insecure transport.

Short-term mitigations can land before the full protocol:

- strip compute metadata on all copy/import/export paths;
- stop serializing it to dataset clients;
- make the fields readonly and remove the generic dataset-attributes update path;
- refuse cross-user sharing/publishing of an HDA carrying legacy compute delegation;
- network-restrict the legacy Service B.

These reduce exposure but should not be presented as the final authorization design.

## 7. Minimum automated coverage

The security boundary should be demonstrated with tests rather than inferred from metadata presence:

1. Bob enrolls a grant; Alice copies Bob's HDA; Alice's job fails before contacting Service B.
2. Alice submits Bob's copied compute header or keypair ID to the grant API; activation is rejected.
3. A same-user copy either reuses the grant or deliberately requires reenrollment, according to the
   documented policy.
4. A job authorization with the wrong user, dataset, grant, destination, operation, job-key digest,
   audience, or expiry is rejected by Service B.
5. A consumed `jti` cannot be replayed with a second job key.
6. Revoked Galaxy access or a revoked grant prevents subsequent jobs.
7. Detailed HDA serialization contains readiness status but no raw compute header or keypair ID.
8. Declared outputs, `from_work_dir`, pattern discovery, tool-provided metadata, collection elements,
   extra files, no-output tools, and empty collections either produce verified Crypt4GH payloads or
   fail before object-store import.
9. Process interruption and cleanup failure leave no imported plaintext and produce a visible job
   error plus an administrator-auditable event.

This design turns the current implicit bearer capability into an explicit, revocable authorization
chain:

```text
authenticated user + dataset access
        -> compute grant
        -> active job + selected destination
        -> signed authorization bound to the job key
        -> Service B recryption
        -> verified encryption before persistence
```

That is the minimum shape I would expect for transparent decryption across a multi-user Galaxy
instance. It closes the copy path without conflating ciphertext sharing, storage location, and
plaintext-compute authority.
