# galaxy#23893 - [26.1] Add Montreal Forced Aligner datatypes

- PR: https://github.com/galaxyproject/galaxy/pull/23893 (IvoLeist, +9/-0, 1 file, base `release_26.1`)
- Head reviewed: `27b4c8037d28d3c064aad0670ef0efd7f6e10ab3`
- Base compared: `origin/release_26.1` @ `fcbf06253ef` (fetched 10-03; PR is 4 commits behind, merges cleanly)
- Worktree: `~/projects/worktrees/galaxy/pr/23893`
- Consuming tools: usegalaxy-eu/temporary-tools `test/mfa/` (to move to bgruening/galaxytools)
- Tests: none run locally (config-only, no `.venv`); `xmllint` clean, no new duplicate extensions. CI green after reruns (earlier `Test (3.10, 0..3)` reds superseded by passing runs).

## Recommendation

**Approve after a naming fix (or a conscious decision to keep it).** Seven config-only `subclass="true"` entries on existing classes (`CompressedZipArchive`, `data:Text`) - exactly the right amount of code. No new Python, no sniffers, so no sniff-order or false-positive risk (uploaded zips still sniff as `zip`). Release-branch target has clear precedent: #23572 (tfevents, same author), #23088 (PAGE XML) and the RMSX backport all added datatypes to `release_26.1`.

Extension names are the one thing that can't be changed later, so they deserve the look.

## Findings

1. **(Should fix) `mfa_corpus_model.zip` isn't a model** (`datatypes_conf.xml.sample:358`). MFA's model kinds are acoustic, dictionary, g2p, ivector, language_model and tokenizer. The corpus is the user's own audio + `.lab`/TextGrid archive, and the tool's help text says so ("Archive containing audio and transcripts"). Once tools and workflows reference the extension it's effectively permanent. Suggest `mfa_corpus.zip`.

2. **(Should fix) `display_in_upload="false"` on everything users have to upload** (`:357-363`). Nothing in the tool suite produces a corpus archive. The pretrained acoustic, g2p and LM models and the dictionaries come from the `mfa-models` GitHub releases (the tool tests pull them by URL). Because these are subclasses, a dataset uploaded as `zip` won't match a `format="mfa_acoustic_model.zip"` input, so users must upload and then change the datatype by hand. Set `display_in_upload="true"` at least for corpus, `mfa.dict`, acoustic, g2p and language model. The neighbouring `ncbi_genome_dataset.zip` subclass does this. A short `description`/`description_url` (https://montreal-forced-aligner.readthedocs.io/) would help in the upload selector.

3. **(Nit, optional) Placement of `mfa.dict`.** There's already a `<!-- speech datatypes -->` block (`textgrid`, `par`) around line 1174; `mfa.dict` would read better there than in the zip block. `data:Text` (not `Tabular`) is the right base, since MFA dictionary rows have variable column counts.

## Risks

One-way door limited to naming: the seven extension strings become the identifiers that tools, workflows and existing datasets depend on, so `mfa_corpus_model.zip` should be settled before merge. Everything else is two-way.

<details><summary>Risk Details</summary>

- Extension names get persisted in datasets and in tool and workflow `format=` attributes. Renaming one later needs a datatype alias or a migration.
- No code, sniffers or converters are added, so existing uploads and detection can't change.
- Merging into `release_26.1` puts the types on usegalaxy.* with the next point release. That's the goal of the PR and is in line with recent precedent.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers only need to agree on the extension names (finding 1) and on the upload visibility (finding 2). Nothing else in the change has runtime impact.

</details>
