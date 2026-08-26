# The compute header leaks the user's public key

Finding that invalidates the security premise of the recryptor-service branch drafted on
2026-08-14 (see [[23277_recryptor_pr_body]], now superseded). Raised by a Codex review, verified
here empirically against the pinned packages.

## Claim

A Crypt4GH compute header contains the **user's own public key in the clear**. Anyone who can read
the header — which in PR 23277 is ordinary, copyable dataset metadata — can recover that key
exactly. It therefore cannot serve as an authorization factor.

## Why

Two facts compose.

**1. The reference library writes the sender's public key unencrypted into every method-0 packet.**
`crypt4gh/header.py`, `encrypt_X25519_Chacha20_Poly1305`:

```python
pubkey = sodium.derive_pk(seckey)
...
return pubkey + encrypted_data[:clen]
```

**2. The pinned recryptor reuses the *decryption* key as the sender key.**
`crypt4gh_recryptor/operations.py`, `do_recrypt_header`:

```python
encryption_keys = list(map(
    lambda encryption_key_file: (0, decryption_key, crypt4gh.keys.get_public_key(encryption_key_file)),
    encryption_key_files))
```

The tuple is `(method, seckey, recipient_pubkey)`, and `seckey` here is `decryption_key` — the key
the header was just opened with. When Service A recrypts Bob's header to the compute key, it opens
with Bob's private key and then seals with **that same private key as sender**. So the emitted
compute header carries `derive_pk(bob_private)` = Bob's public key, in the clear, at a fixed offset.

Note the divergence from PR 23277's mock Service B, which generates a fresh ephemeral sender key per
recipient (`crypt4gh_test_utils.py`, `reencrypt_header`). **The mock and the real service disagree on
a security-relevant property**, and the mock is the more conservative of the two. Worth reporting to
23277 on its own: a test double that models the protocol more safely than the real implementation
will hide exactly this class of problem.

## Repro

Run under the recryptor service's venv (`uv run python`), which pins `crypt4gh==1.7.0` and
`crypt4gh-recryptor` from `GalaxySensitiveData-IS_py-recryptor`.

```python
import base64
from hashlib import sha256
from pathlib import Path
import tempfile

import crypt4gh.header
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

# Bob encrypts a file to himself.
plaintext, encrypted = tmp / 'data.txt', tmp / 'data.c4gh'
plaintext.write_bytes(b'sensitive genomic payload')
with open(plaintext, 'rb') as i, open(encrypted, 'wb') as o:
    crypt4gh.lib.encrypt([(0, bob_seckey, bob_pubkey)], i, o)

# Service A: recrypt the header from Bob's key to the compute key.
user_header, payload = tmp / 'user.header', tmp / 'payload.bin'
assert do_save_header_and_payload(str(encrypted), str(user_header), str(payload)) == 0
compute_header = tmp / 'compute.header'
assert do_recrypt_header(str(user_header), str(bob_sec), [str(comp_pub)], str(compute_header)) == 0

# Alice has only the compute header.
header_bytes = compute_header.read_bytes()
recovered_raw = header_bytes[24:56]

canonical = ('-----BEGIN CRYPT4GH PUBLIC KEY-----\n'
             + base64.b64encode(recovered_raw).decode() + '\n'
             + '-----END CRYPT4GH PUBLIC KEY-----\n')
genuine = bob_pub.read_text()

print('present verbatim:      ', bob_pubkey in header_bytes)
print('offset 24:56 matches:  ', recovered_raw == bob_pubkey)
print('key file identical:    ', canonical == genuine)
print('sha256 matches:        ',
      sha256(canonical.encode('utf8')).hexdigest() == sha256(genuine.encode('utf8')).hexdigest())
```

Output:

```
present verbatim:       True
offset 24:56 matches:   True
key file identical:     True
sha256 matches:         True
```

The offset is `8` magic + `4` version + `4` packet count + `4` packet length + `4` method = `24`,
then the 32-byte key. The canonical file format is deterministic, so the reconstruction is
byte-identical and hashes to the same value the recryptor service stores as `user_hash`.

## Consequences

**The drafted `crypt4gh_user_public_key` check does not work.** Alice copies Bob's HDA, reads
`crypt4gh_compute_header` from dataset metadata, extracts Bob's public key, reconstructs the key
file, and supplies it with her own job key. The hash comparison passes, even with
`require_user_public_key: true`.

**It invalidates sveinugu's suggested mechanism too**, in both forms he proposed:

- Sending the user public key for validation fails, per the above.
- Crypt4GH sender-key validation (`sender_pubkey=` on decrypt) fails for a *different* reason: it
  proves the header was sealed by Bob's key, which is true no matter who submits the request. It
  authenticates the artifact, not the caller.

This is the empirical case for his own fallback — an **opaque, high-entropy token that never appears
in the header** — and for keeping the delegation in server-managed state rather than dataset
metadata. It converts that recommendation from an argument about taste into a demonstrated
requirement.

**It also means the compute header is more sensitive than it looks.** `crypt4gh_compute_header` is
`readonly=False, visible=True` in 23277 and is serialized to any user who can see the dataset, so
Bob's public key is exposed to every recipient of a shared history. Not catastrophic on its own — a
public key is meant to be publishable — but it forecloses any design that treats it as secret.

## What survives from the drafted branch

- Compute-mode CORS defaulting to no middleware at all. Independent of this finding and still right.
- The observation that `/get_compute_key_info` already binds keypairs to a user, and that
  `/recrypt_header_to_job_key` is the one route that ignores it. Still true; still the right place
  to *put* an authorization check. Only the choice of credential was wrong.
- `user_hash` remains useful as an identifier and consistency check — it just cannot be the thing
  that authorizes.

See [[23277_status_2026_08_14]] for how this changes the Galaxy-side comment.
