# Blocking: compute decryption authority is a copyable dataset attribute

I think the current design has a cross-user authorization problem that needs to be resolved before
merge. The short version is that a user's delegation to the compute recryptor is represented as
ordinary dataset metadata, while the compute service treats that metadata as sufficient authority to
recrypt a header to any newly supplied job key. Dataset metadata copies, but the user's authority to
decrypt should not.

This finding assumes the intended security policy is that sharing Crypt4GH ciphertext does **not**
implicitly grant the recipient permission to recover its plaintext. If Galaxy instead intends ordinary
read access to an encrypted HDA to include plaintext computation, that policy needs to be stated
explicitly in the feature design and user interface. The current implementation does not express or
enforce either policy: Service B receives no principal, so it cannot distinguish an owner's job from a
recipient's job or produce a meaningful authorization audit trail.

## Why the header matters

A Crypt4GH file consists of a small header followed by a bulk-encrypted body. Recryption opens a
header packet with one private key and seals the same session key to a different public key; the large
encrypted body does not change.

```text
cohort.vcf.c4gh
+----------------------------------------------+
| header: session key sealed to a recipient    |  small and replaceable
+----------------------------------------------+
| body: payload encrypted with the session key |  large and unchanged
+----------------------------------------------+
```

This is the useful property on which the PR is built, but it also means the recryptor is an access
broker. A compute header may be harmless without the compute private key, but a service willing to
open that header and reseal it to a caller-selected public key turns the header and its keypair ID into
a bearer capability. Authorization has to happen before that resealing operation.

## What the PR records

The recrypt action stores the following on the HDA as datatype metadata
(`lib/galaxy/datatypes/crypt4gh.py:59-110`):

- `crypt4gh_compute_header`
- `crypt4gh_compute_keypair_id`
- `crypt4gh_compute_keypair_expiration_date`

The compute header is declared `readonly=False, visible=True`; the keypair ID is also writable. More
generally, the detailed dataset serializer emits every item in the datatype metadata specification
without filtering on `visible` (`lib/galaxy/managers/datasets.py:748-775`). These values are therefore
being handled as user-facing dataset attributes, not as server-managed authorization state.

That distinction becomes important when an HDA is copied. `HistoryDatasetAssociation.copy()` points
the copy at the same underlying `Dataset` row and then copies all metadata
(`lib/galaxy/model/__init__.py:6234-6264`). The ordinary history-content copy API uses this method
(`lib/galaxy/managers/hdas.py:211-242`). Copying metadata is correct for fields such as `dbkey` and
column definitions, but it is not correct for a delegation belonging to a particular user.

## What Service B receives

For each input, `_build_recrypt_payloads()` sends this request
(`lib/galaxy/tools/crypt4gh_remote_execution.py:471-503`):

```json
{
  "crypt4gh_header": "<compute header from HDA metadata>",
  "crypt4gh_compute_keypair_id": "<keypair id from HDA metadata>",
  "crypt4gh_job_public_key": "<fresh public key selected for this job>"
}
```

It does not send a user identity, HDA or dataset identity, job identity, Galaxy authorization, signed
grant, or proof tying the job public key to the authorized job. The output-direction request similarly
sends only a header and keypair ID
(`lib/galaxy/tools/crypt4gh_remote_execution.py:2921-2931`).

This is not merely an unspecified companion-service concern. In the current recryptor implementation,
`/recrypt_header_to_job_key` looks up a private key by the supplied keypair ID and recrypts the supplied
header to the supplied job public key. The FastAPI application installs CORS but no authentication
middleware, and the route has no authentication or authorization dependency. Its own route tests call
the endpoint without credentials:

- [`compute.py`](https://github.com/elixir-europe/crypt4gh-recryptor-service/blob/25ed776aa8e98bef7d7978752f7f96b18a998877/src/crypt4gh_recryptor_service/compute.py)
- [`app.py`](https://github.com/elixir-europe/crypt4gh-recryptor-service/blob/25ed776aa8e98bef7d7978752f7f96b18a998877/src/crypt4gh_recryptor_service/app.py)
- [`test_compute_routes.py`](https://github.com/elixir-europe/crypt4gh-recryptor-service/blob/25ed776aa8e98bef7d7978752f7f96b18a998877/tests/test_compute_routes.py)

Those files were checked at companion-service commit
`25ed776aa8e98bef7d7978752f7f96b18a998877`.

TLS protects the request in transit, but it does not answer whether the caller is allowed to decrypt
this dataset. Restricting the endpoint to a compute network would authenticate a location at best; it
still would not distinguish two users' jobs on that compute system.

## Cross-user path

The resulting path is:

1. Bob uploads a Crypt4GH dataset that his private key can open.
2. Bob clicks Recrypt. Service A uses Bob's local private key to produce a header for the compute
   keypair, and Galaxy stores that header and keypair ID on Bob's HDA.
3. Bob shares or publishes the history. Sharing encrypted bytes is reasonably expected to be safe
   unless the UI says it is also sharing a decryption delegation.
4. Alice, who has legitimate read access to the shared HDA, copies it into her history. The copy points
   at the same ciphertext and carries the compute metadata.
5. Alice submits a tool using her HDA. Galaxy's normal ownership check sees an HDA in Alice's history,
   and the Crypt4GH readiness guard sees a present, unexpired compute header and keypair ID. Neither
   check asks which user created that delegation.
6. Compute creates a fresh job key and asks Service B to recrypt Bob's compute header to that key.
   From Service B's perspective this request is indistinguishable from Bob's legitimate request.
7. `_decrypt_recrypted_input()` writes the plaintext into Alice's job workspace before invoking the
   tool (`lib/galaxy/tools/crypt4gh_remote_execution.py:2995-3016`).

Alice does not need to forge a Crypt4GH packet or compromise a private key. The supported copy action
transfers all values needed by the recrypt endpoint.

## Plaintext recovery and output encryption

A conventional `cat input > declared_output` is not, by itself, guaranteed to give Alice the final
file: the PR attempts to encrypt declared outputs and recrypt them back to the user associated with the
compute keypair. The narrower and accurate claim is that Alice's job has been given unauthorized
plaintext and can recover it through any permitted egress channel, including:

- tool stdout or stderr, which this PR does not encrypt;
- a tool with network egress;
- an unmanaged path or extra file;
- an output shape missed by the Crypt4GH finalizer.

The last case is already present in the PR. Discovery collection skips common dynamic formats and
non-pattern discovery (`crypt4gh_remote_execution.py:1054-1144`), while the verifier treats a missing
marker directory as success (`crypt4gh_remote_execution.py:2248-2255`). The PR description itself says
that discovered collection elements currently return unencrypted. Those output bugs make recovery
easier, but they are not the root authorization problem: decrypting the input for Alice's job was
already the policy failure.

## Why metadata-level mitigations are incomplete

Clearing `crypt4gh_compute_*` during a cross-user HDA copy would close the exact path above and is worth
doing as defense in depth. Marking the fields readonly and hiding them from dataset serialization would
also reduce exposure. Neither establishes the missing security invariant:

> Service B may recrypt a dataset header to a job key only when Galaxy has authorized that active job,
> user, dataset, destination, and job key.

Copy hooks do not cover every way datasets move through histories, libraries, collections, imports,
and model stores. Hiding a value is not authorization, and authenticating only the Galaxy instance or
compute host still does not identify the user or dataset grant. The delegation needs to become a
server-managed relation between a principal and a dataset, and the recrypt request needs a job-scoped
authorization that Service B can verify.

At minimum, I think the PR needs an explicit decision about whether sharing ciphertext grants
plaintext computation, an implementation that enforces that decision, and a regression test in which
one user copies another user's recrypted HDA and attempts to run a tool. With owner-only delegation,
that test must fail before any call to Service B and before any plaintext staging occurs.
