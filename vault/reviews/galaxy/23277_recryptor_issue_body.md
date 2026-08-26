**Title:** `/recrypt_header_to_job_key` has no caller binding, and the user public key can't supply one

---

> Posted by Claude (AI assistant) on behalf of @jmchilton — they reviewed and approved it, but did not write it personally.

Hi! This comes out of reviewing galaxyproject/galaxy#23277, and specifically out of @sveinugu's
[comment there](https://github.com/galaxyproject/galaxy/pull/23277#issuecomment-5267416093)
proposing that the user's public key be added to the recrypt payload for validation. We tried to
implement that, found it doesn't hold up, and wanted to bring both halves here rather than leave it
buried in a long Galaxy thread.

Opening this as a design question, not a bug report — nothing below is a defect in this service.

## The binding already exists on one side

`/get_compute_key_info` allocates a compute keypair **per user public key** and persists that as
`user_hash`:

```python
key_id_dir = ComputeKeypairFiles.lookup_last_exp_key_id_dir_or_create_new(
    settings, user_public_key_file.path.name)
```

`/recrypt_header_to_user_key` already relies on it — it resolves the user key from the keypair
rather than accepting one from the caller:

```python
user_public_key_path = settings.user_keys_dir.joinpath(compute_keypair.user_hash)
```

`/recrypt_header_to_job_key` is the one route that never consults it. It resolves the keypair by id,
checks expiry, and recrypts to whatever job key the caller supplies. So on the input direction the
service cannot distinguish one user's job from another's.

We understand from the 23277 discussion that the Galaxy↔Service B connection is *assumed*
authenticated and that this isn't implemented yet. Worth separating the two, though: transport or
network authentication establishes which *host* is calling. The compute-side Galaxy process serves
every user on the instance, so even a fully authenticated caller still needs to say which user a
given recrypt is for. That's the gap this is about.

It matters for Galaxy because compute metadata (`crypt4gh_compute_header`,
`crypt4gh_compute_keypair_id`) currently lives as ordinary dataset metadata and travels when a
dataset is copied between users.

## Why the user public key can't be that binding

We built the obvious version — add `crypt4gh_user_public_key` to the payload, hash it, compare
against `compute_keypair.user_hash` — and then killed it, because it's bypassable using the same
request's own contents.

Crypt4GH method-0 packets are `writer_pubkey(32) || nonce(12) || ciphertext`, and the writer's
public key **must** be in the clear: it's the DH half the recipient needs to derive the shared key
(`decrypt_X25519_Chacha20_Poly1305` reads `peer_pubkey = encrypted_part[:32]`).

`do_recrypt_header` in the pinned `crypt4gh-recryptor` reuses the decryption key as the writer key:

```python
encryption_keys = list(map(
    lambda f: (0, decryption_key, crypt4gh.keys.get_public_key(f)), encryption_key_files))
```

So when Service A recrypts Bob's header to the compute key, the resulting **compute header carries
Bob's own public key in the clear**. Anyone holding that header — which is exactly what a copied
HDA carries — can recover it, rebuild the canonical key file byte-for-byte, and pass the check.

We verified this against the pinned packages:

```
Bob public key present verbatim in compute header: True
Recovered from fixed offset 24:56 matches Bob:      True
Reconstructed key file is byte-identical:           True
sha256 (what would be compared to user_hash):       True
```

<details>
<summary>Repro script</summary>

```python
import base64
from hashlib import sha256
from pathlib import Path
import tempfile

import crypt4gh.keys
import crypt4gh.lib
from crypt4gh.keys import c4gh
from crypt4gh_recryptor.operations import do_recrypt_header, do_save_header_and_payload

tmp = Path(tempfile.mkdtemp())
nopass = lambda: None

bob_sec, bob_pub = tmp / 'bob.sec', tmp / 'bob.pub'
comp_sec, comp_pub = tmp / 'compute.sec', tmp / 'compute.pub'
c4gh.generate(str(bob_sec), str(bob_pub), passphrase=None)
c4gh.generate(str(comp_sec), str(comp_pub), passphrase=None)

bob_seckey = crypt4gh.keys.get_private_key(str(bob_sec), nopass)
bob_pubkey = crypt4gh.keys.get_public_key(str(bob_pub))

plaintext, encrypted = tmp / 'data.txt', tmp / 'data.c4gh'
plaintext.write_bytes(b'sensitive genomic payload')
with open(plaintext, 'rb') as i, open(encrypted, 'wb') as o:
    crypt4gh.lib.encrypt([(0, bob_seckey, bob_pubkey)], i, o)

user_header, payload = tmp / 'user.header', tmp / 'payload.bin'
assert do_save_header_and_payload(str(encrypted), str(user_header), str(payload)) == 0
compute_header = tmp / 'compute.header'
assert do_recrypt_header(str(user_header), str(bob_sec), [str(comp_pub)], str(compute_header)) == 0

header_bytes = compute_header.read_bytes()
recovered = header_bytes[24:56]          # 8 magic + 4 version + 4 count + 4 length + 4 method
canonical = ('-----BEGIN CRYPT4GH PUBLIC KEY-----\n'
             + base64.b64encode(recovered).decode() + '\n'
             + '-----END CRYPT4GH PUBLIC KEY-----\n')
genuine = bob_pub.read_text()

print(bob_pubkey in header_bytes, recovered == bob_pubkey, canonical == genuine,
      sha256(canonical.encode()).hexdigest() == sha256(genuine.encode()).hexdigest())
```
</details>

**To be clear about whose problem this is:** it isn't one. Exposing the writer's public key is
required by the format, and reusing the user's key as writer is a deliberate choice that preserves
sender provenance — it's what makes `sender_pubkey=` validation possible in the first place. The
mistake was ours, in trying to use a value the format guarantees is public as though it were secret.

Worth noting that switching to ephemeral writer keys would *not* rescue the idea. It would only make
the bypass non-trivial, while leaving a public key doing a credential's job — which is worse,
because it would look like it worked.

## The same argument rules out sender-key validation as authorization

The other form of the suggestion — passing `sender_pubkey=` so the service refuses headers not
sealed by the expected user — fails for an independent reason. It proves the header was sealed by
Bob's key, which stays true no matter who submits the request. It authenticates the artifact, not
the caller. Still genuinely useful for provenance and for catching misconfiguration; just not for
authorization.

## What we think would work

Roughly what @sveinugu already floated as the better option ("a secure token, independently
brokered"), plus binding it to a specific job:

- An **opaque, high-entropy delegation** established through the Service A flow, that never appears
  in any header or dataset artifact.
- Held in server-managed state on the Galaxy side (vault or an explicit authorization relation),
  not in HDA metadata, so it doesn't travel when a dataset is copied.
- Exchanged at job dispatch for a **short-lived authorization** bound to at least the compute
  keypair, compute-header digest, job public key, principal, destination, and expiry.
- A protected mode on this service that rejects requests lacking it, rather than an optional field
  that can be omitted.

We'd suggest an explicitly opaque parameter name — `crypt4gh_recrypt_authorization` or similar —
rather than overloading a key-shaped field, since the storage and logging rules differ.

## Questions

1. Is a per-user (or per-job) authorization on `/recrypt_header_to_job_key` something you'd want
   here, or do you see it living entirely on the Galaxy side?
2. If it lands here, would you rather it be a protected mode that's off by default, or required
   once the Galaxy side can supply it?
3. Is there existing work on the `work/phase2-recryptor-routes` branch we should be building on
   rather than around?

Happy to do the implementation work on whichever shape you prefer — we had a branch for the
public-key version and dropped it once the above became clear, so no attachment to any particular
approach.
