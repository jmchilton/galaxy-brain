# PR 23277 — Cross-user plaintext recovery, explained

Longform walkthrough of **P1-1** from [[23277_crypt4gh_end_to_end]]. That note states the finding;
this one builds it up from the format primitive so the reasoning can be checked independently, and
so the diagrams can be lifted into a PR comment or a mail to the author.

PR: galaxyproject/galaxy#23277 — davelopez, "Add Crypt4GH End-to-End Support for Galaxy".
Head `19f1605b1c`. Line references are against that commit in
`~/projects/worktrees/galaxy/pr/23277`.

**One-line statement of the defect:** a user's consent to have a dataset decrypted on the compute
cluster is stored as a property *of the dataset* rather than as a relation *between a user and a
dataset*, and dataset properties copy.

---

## 1. What a Crypt4GH file is

Two parts. The body is bulk-encrypted once with a random session key. The header is that session
key, wrapped separately for each recipient's public key.

```
  secret.fastq.c4gh
  ┌──────────────────────────────────────────────┐
  │ HEADER   session_key sealed to Bob's pubkey  │  ← small, swappable
  ├──────────────────────────────────────────────┤
  │ BODY     ~40 GB, encrypted with session_key  │  ← never changes
  └──────────────────────────────────────────────┘
```

"Recryption" means: someone who *can* open the header unwraps the session key and re-seals it to a
different public key. The body is untouched — you rewrite ~100 bytes and the same 40 GB file is now
readable by a new party. That is the elegant property of the format, and it is why this PR's entire
design is header-shuffling. See `_recrypt_header_to_user_key` at
`lib/galaxy/tools/crypt4gh_remote_execution.py:2900-2918`: parse the header, note its length, write
the new header, `shutil.copyfileobj` the rest.

The consequence that matters here:

> **The header is the entire access-control decision.** Holding a header that your key opens *is*
> authorization. There is no separate ACL, and the format does not intend there to be one.

---

## 2. The intended flow

Three key-holders and the crossings between them.

```
   ┌─ USER SIDE ────────────┐   ┌─ GALAXY ─────┐   ┌─ COMPUTE SIDE ───────────┐
   │                        │   │              │   │                          │
   │  Bob's browser         │   │  Postgres    │   │  Service B (recryptor)   │
   │  Service A (localhost) │   │  + job dir   │   │  holds compute privkey   │
   │  holds Bob's privkey   │   │              │   │                          │
   └────────────────────────┘   └──────────────┘   └──────────────────────────┘

  STEP 1 — Bob clicks "Recrypt"        client/src/composables/useCrypt4ghRecrypt.ts:89-123

    header_bob ──► Service A ──► header_compute
                  (Bob's key)          │
                                       ▼
                             setAttributes(hda_id, {crypt4gh_compute_header,
                                                    crypt4gh_compute_keypair_id,
                                                    crypt4gh_compute_keypair_expiration_date})
                                       │
                                       ▼
                             ┌───────────────────────────────┐
                             │ HDA metadata (Postgres)       │
                             │  crypt4gh_header       (Bob)  │
                             │  crypt4gh_compute_header      │
                             │  crypt4gh_compute_keypair_id  │
                             └───────────────────────────────┘
                             lib/galaxy/datatypes/crypt4gh.py:59-110

  STEP 2 — a job runs                  crypt4gh_remote_execution.py:415-504

    generate ephemeral job keypair (fresh per job, memory-only — this part is correct)
                                       │
    POST /recrypt_header_to_job_key ───┼──────────────► Service B
                                       │                unwrap w/ compute privkey
                                       │◄────────────── reseal to job pubkey
                                       ▼
                            decrypt body with job privkey
                                       ▼
                          PLAINTEXT on disk in the job dir     (_decrypt_recrypted_input:3010)
                                       ▼
                                  tool reads it
```

Step 1 is Bob's **consent**: "this dataset may be decrypted on the compute cluster." The concept is
right. The defect is entirely in *where that consent is recorded*.

---

## 3. What the request actually carries

`_build_recrypt_payloads` — `crypt4gh_remote_execution.py:497-501`. This is the whole payload:

```
  POST /recrypt_header_to_job_key
  {
    "crypt4gh_header":              "<compute_header, read from HDA metadata>",
    "crypt4gh_compute_keypair_id":  "<read from HDA metadata>",
    "crypt4gh_job_public_key":      "<ephemeral, this job>"
  }

  ╔══════════════════════════════════════════════════════════════╗
  ║  NOT PRESENT:  user id · session token · job id · signature  ║
  ║                history id · anything naming a principal      ║
  ╚══════════════════════════════════════════════════════════════╝
```

The output direction is the same shape — `_recrypt_header_to_user_key` at `:2921-2930` sends header
+ keypair id and nothing else. Neither direction names anybody.

So the only question Service B is *able* to ask is:

> Does compute keypair `K` open header `H`?

And by §1 the answer is **yes for anyone holding a copy of `H`**.

---

## 4. The attack

Two facts combine. `HistoryDatasetAssociation.copy()` does `hda.metadata = self.metadata`
(`lib/galaxy/model/__init__.py:6263`) and passes `dataset=self.dataset` (`:6250`) — metadata copies
wholesale, and the copy points at the *same* ciphertext file. `copy_from` does the same under
`include_metadata` (`:6212-6213`).

```
  Bob                                      Alice
  ───                                      ─────
  ① uploads cohort.vcf.c4gh
     sealed to Bob's key only

  ② clicks Recrypt
     HDA metadata now holds
     header_compute + keypair_id

  ③ publishes the history ──────────────►  ④ copies the dataset in
     "safe — it's ciphertext, and              (one click)
      only my key opens it"                    HDA.copy():
                                                 metadata ─┐ carried
                                                 dataset ──┘ shared
                                               Alice's HDA now holds
                                               header_compute + keypair_id

                                           ⑤ runs any tool on it
                                               owns the HDA, so the ownership
                                               check and readiness guard pass
                                                     │
                                                     ▼
                                    POST /recrypt_header_to_job_key
                                    { header_compute, keypair_id, job_pubkey }
                                                     │
                                                     ▼
                                    Service B: "keypair K opens header H?
                                                yes." → reseals
                                                     │
                                                     ▼
                                    plaintext in Alice's job dir
                                                     ▼
                                    stdout / an unencrypted output
                                                     ▼
                                        ⑥ Alice reads Bob's data
```

Alice forges nothing. Every step is a supported operation on data she was granted read access to.

**On step ③.** This is not a careless act by Bob. Sharing Crypt4GH ciphertext is supposed to be
safe — that is the premise of the format and the reason the PR exists. The feature turns the safe
act into the dangerous one.

**On step ⑥.** No hostile tool is required. Job stdout/stderr is never encrypted by this PR. The two
gaps the author already acknowledges — discovered collection elements, and `format="auto"`
collectors — write plaintext datasets directly into the history. P1-2 (the verifier fails open) is
what makes this path *silent*: green job, no warning, plaintext in the history.

**Output re-encryption does not help.** `_recrypt_header_to_user_key` keys off `compute_keypair_id`,
so Alice's *output* gets sealed to Bob. Irrelevant — Alice already has the plaintext, and Alice chose
the tool.

---

## 5. Why this is not Service B's problem to solve

Worth being precise here, because the natural response is "Service B should check authorization."

It cannot. Give Service B a perfect ACL database — every user, every dataset, every grant. It
receives `{header, keypair_id, job_pubkey}`. To consult that database it must first look up *who is
asking*. That field does not exist on the wire.

```
   Bob's legitimate request        Alice's stolen request
   ┌───────────────────────┐      ┌───────────────────────┐
   │ header:    H          │      │ header:    H          │
   │ keypair:   K          │  ==  │ keypair:   K          │
   │ job_key:   <ephem>    │      │ job_key:   <ephem>    │
   └───────────────────────┘      └───────────────────────┘
                    indistinguishable
```

The two requests are identical at the byte level except for an ephemeral key that is fresh in both
cases and carries no identity. This is why the finding is scoped to Galaxy and not deferred to the
external service: **no implementation of Service B can close it, because Galaxy never says who is
asking.**

---

## 6. Diagnosis

`crypt4gh_compute_header` is a **bearer credential** stored in the **dataset metadata blob**, next to
`dbkey`, `column_names`, and `crypt4gh_inner_ext`. Metadata is designed to copy — for every other
field, copying is exactly the right behaviour. Bob's authorization became transferable the moment it
was written there.

Restated as a category error: consent is a *relation* (this user, this dataset, until this date) and
it was modelled as an *attribute* (this dataset has a compute header).

Two supporting edges of the same shape:

- `crypt4gh_compute_header` is declared `readonly=False, visible=True`
  (`lib/galaxy/datatypes/crypt4gh.py:69-77`); `crypt4gh_compute_keypair_id` is `readonly=False,
  visible=False` (`:89-98`) but still in the API payload and still settable. Key material in transit
  is being presented as a user-editable attribute.
- The recrypt flow writes that metadata straight from the browser via `setAttributes`
  (`useCrypt4ghRecrypt.ts:104-112`). The compute header is therefore client-supplied data — any
  header Alice can obtain, she can paste onto a dataset she owns, without needing the copy path at
  all.

---

## 7. Fixes

Ordered by what they actually buy.

1. **Move consent out of dataset metadata into a grant relation** — `(user_id, dataset_id,
   compute_header, keypair_id, expires)`. Job setup resolves the grant for `job.user_id` instead of
   reading the HDA's metadata. Alice's copy has no grant, so her job fails closed. This is the real
   fix, and it also closes the client-supplied-header edge, since the grant is written server-side
   against the authenticated user.
2. **Put a principal on the wire and have Service B verify it** — a short-lived Galaxy-signed
   assertion of the requesting user. Needed regardless if Service B is ever expected to enforce
   policy or produce a usable audit log; today its logs cannot attribute a single request.
3. **Strip `crypt4gh_compute_header` / `crypt4gh_compute_keypair_id` on HDA copy across a user
   boundary.** Cheap, closes the demonstrated path today. A band-aid: it does not cover library
   datasets, workflow-invocation copies, or the paste-a-header case, and it leaves the design still
   asserting that consent belongs to the dataset.
4. **Document that tool stdout/stderr is an unencrypted egress channel** for any decrypted input.
   True even after 1-3 land, and it constrains which tools may be exposed under this feature.

Recommendation: 1 as the design, with 3 landing immediately as mitigation.

---

## 8. Minimal test

None of this is covered — the PR has zero tests. The regression test for the fix is small:

```
given   an HDA owned by user B with crypt4gh_compute_header set
when    user A copies it into their own history and submits a job
then    the job fails closed, and no recrypt request is issued
```

A second test should assert the copy carries no `crypt4gh_compute_*` metadata, so the fix cannot
regress silently through the metadata layer.
