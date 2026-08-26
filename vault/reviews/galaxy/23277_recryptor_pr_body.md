> **SUPERSEDED — do not send.** The `crypt4gh_user_public_key` check this describes is
> bypassable: the user's public key is recoverable from the compute header itself. See
> [[23277_user_public_key_leak]]. The CORS claims here also overstate what changed.

> Posted by Claude (AI assistant) on behalf of @jmchilton — they reviewed and approved it, but did not write it personally.

Hi! This comes out of reviewing galaxyproject/galaxy#23277, and specifically out of [@sveinugu's comment there](https://github.com/galaxyproject/galaxy/pull/23277#issuecomment-5267416093) suggesting that the user's public key be added to the recrypt payload for validation. While reading this service to understand that suggestion, it turned out most of the mechanism is already here — so this is that idea wired up, offered as a starting point rather than a finished design. Very happy to have it reshaped or closed if you'd rather build it differently.

## The observation

`/get_compute_key_info` already allocates a compute keypair **per user public key** and persists the binding as `user_hash`:

```python
key_id_dir = ComputeKeypairFiles.lookup_last_exp_key_id_dir_or_create_new(
    settings, user_public_key_file.path.name)
```

And `/recrypt_header_to_user_key` already relies on it — it resolves the user key from the keypair rather than accepting one from the caller:

```python
user_public_key_path = settings.user_keys_dir.joinpath(compute_keypair.user_hash)
```

`/recrypt_header_to_job_key` is the one route that never consults it. It resolves the keypair by id, checks expiry, and recrypts to whatever job key the caller supplies. So on the input direction the service has no way to tell one user's job from another's — a keypair id plus a header is sufficient authority.

That matters for Galaxy because compute metadata (`crypt4gh_compute_header`, `crypt4gh_compute_keypair_id`) lives as ordinary dataset metadata and travels when a dataset is copied between users. The service-side check is not a complete answer to that — see "What this does not do" — but it is the half that lives here.

## What this PR does

**Binds `/recrypt_header_to_job_key` to the keypair's user.** New optional `crypt4gh_user_public_key`; when present it is hashed and compared against `compute_keypair.user_hash`, returning `403` on mismatch. The check runs before any recryption is attempted, and a rejected key is never written into `user_keys_dir`.

**Adds `require_user_public_key` (default `false`).** When enabled, a request omitting the field is rejected with `400`.

The default is deliberately permissive so that current callers keep working — including PR 23277 as it stands and your handoff demo. The tradeoff is explicit: while it is `false`, the check can be skipped by omitting the field, so it is only meaningful once callers send the key and deployments flip the setting. Happy to invert the default, or make it required outright, if you would rather this land fail-closed from the start.

**Scopes CORS per mode** via a new `allowed_origins` setting:

| Mode | Default | Why |
| --- | --- | --- |
| User | `['*']` (unchanged) | Service A is genuinely browser-facing. Deployments should narrow this to their Galaxy origin. |
| Compute | `[]` — no middleware at all | Only the compute-side Galaxy process calls Service B; no browser ever does. |

Also drops `allow_credentials`. Nothing here authenticates by cookie, and Starlette treats `allow_origins=['*']` **with** credentials specially — `preflight_explicit_allow_origin = not allow_all_origins or allow_credentials` — so it echoes the requesting origin back rather than sending a plain `*`. The practical effect today is that any page a user visits can reach their local Service A. That is not a plaintext break, since `/recrypt_header` seals to the compute node's key rather than a caller-chosen one, but it seemed worth closing.

## What this does not do

Being explicit, because the framing matters more than the diff:

- **It does not close the Galaxy-side cross-user path by itself.** Galaxy does not currently know any user's Crypt4GH public key — Service A holds it locally and sends it here on the user's behalf. Until Galaxy stores it per user and sends it with the job-key request, there is nothing to check against, and the setting cannot be turned on. That Galaxy-side piece is the larger half, and it is exactly the "stored Galaxy-side in the vault" idea from the 23277 comment.
- **The check is only as strong as the field's secrecy.** It stops a caller who does not know the user's public key. It does not stop someone who does and can reach this service directly — that is the "should not really be considered a 'public' key anymore" concern, and it points at a token rather than the public key as the long-term answer. A useful property either way: if the field is a token later, the payload shape does not change, and its scope can narrow from per-user to per-dataset/per-job without a protocol break.
- **`/recrypt_header_to_user_key` is left alone.** It already resolves the user from the keypair, and recrypting a header back toward a user the caller cannot decrypt for does not seem to gain an attacker anything. Say the word if you would like symmetry anyway.

## Tests

Six new tests on `/recrypt_header_to_job_key` (matching key accepted, another user's keypair rejected, omitted key allowed by default, required when configured, no recryption attempted on rejection, rejected key not written to storage) and six on CORS. Confirmed red before the change: the four enforcement tests fail against `main`.

`uv run pytest` — 31 passed. `flake8`, `isort`, and `yapf` are clean.

One note: `uv run pre-commit run --all-files` could not install its yapf hook here (`ModuleNotFoundError: No module named 'lib2to3'`, removed in Python 3.13+), so the formatters were run directly from the dev group instead. Unrelated to this change, but you may hit it on newer Pythons.
