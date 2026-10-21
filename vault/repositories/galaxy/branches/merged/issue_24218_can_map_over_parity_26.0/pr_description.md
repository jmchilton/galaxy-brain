Fix 🎯 #24218 - the workflow editor no longer draws map-overs onto `:paired_or_unpaired` inputs that the server won't map over.

On `release_26.0`, the editor accepts these connections and marks the step as mapped over a collection of type `""`:

| Output | Input | Editor before | Editor after (= server) |
| --- | --- | --- | --- |
| `paired` | `list:paired_or_unpaired` | map-over `""` 💥 | rejected |
| `paired_or_unpaired` | `list:paired_or_unpaired` | map-over `""` 💥 | rejected |
| `list` | `list:list:paired_or_unpaired` | map-over `""` 💥 | rejected |
| `list` | `list:paired_or_unpaired` | direct connection | direct connection |
| `list:list` | `list:paired_or_unpaired` | map-over `list` | map-over `list` |

💥 = a step mapped over an empty collection type, saved into the workflow, for a pair the server's `can_map_over` rejects.

The table is a sample. The base editor also accepts `record` and `list:record` into `list:paired_or_unpaired` as `""` map-overs, and `paired:paired_or_unpaired` as a map-over of type `"p"`. Run-time map-over is decided by the server's `can_map_over`, which rejects every one of these pairs, so the editor saves a map-over the server doesn't agree with. The first row is easy to hit in-tree: ***Split Paired and Unpaired declares `list:paired,list,list:paired_or_unpaired`, and the base editor accepts a plain `paired` collection into it; a new editor test with those declared types fails on the base and passes here.***

With this branch, client `canMapOver` checks its rules in the same order as the server's `has_subcollections_of_type`, so the two agree on every pair of collection types up to rank 3 (88 types, 7744 ordered pairs, `sample_sheet` and `record` included). ***Every change is a connection the editor used to accept and now refuses; nothing that was refused before is accepted now.***

***This is an editor fix. The one-line server change only affects inputs declared as `paired:…:paired_or_unpaired`, which no in-tree tool has; it's there because the client line it mirrors had the same bug.***

<details><summary>What else changes</summary>

- **`collection_type_source` outputs** (`terminals.ts`, `getCollectionTypeFromInput`). The output type now resolves in the server's order (`create_collection` in `tools/actions/__init__.py`): if the connection maps over a declared type, use that type, otherwise if it matches directly, use the connected collection's type. Without this, the fix above would turn `list` → `list:paired_or_unpaired` source outputs into `any`. It also fixes a reversed `canMatch` call. A `list` connected straight to a `list:paired_or_unpaired` source input now gives a `list` output, like the server, instead of `list:paired_or_unpaired`.
- **`:` rank boundary on both sides** (`type_description.py`, one line, and the matching client line). The compound `X:paired_or_unpaired` check compared outer ranks with a bare `endswith`, so `paired_or_unpaired` "ended with" `paired`. The client and server both accepted, for example, `paired_or_unpaired` and `list:paired_or_unpaired` as map-overs of `paired:paired_or_unpaired`. Both sides now require the outer ranks to align on a `:`, which only turns true into false, and only for inputs of the form `paired:…:paired_or_unpaired`. No in-tree tool declares such an input.
- **Rejection message.** `paired_or_unpaired` → `list:paired_or_unpaired` now reaches the editor's rejection path, where a suffix check read `list:paired_or_unpaired` as "requiring pairing" and suggested Split Paired and Unpaired. That hint is now only given for inputs that end in a `paired` rank. The pair gets the generic "Incompatible collection type(s) for attachment." The same fix drops the wrong hint for connections that were already refused, such as `list:paired_or_unpaired` → `list:list:paired_or_unpaired`. `paired_or_unpaired` outputs into `paired` inputs still get it.
- **`collection_semantics.yml`** gains two `is_valid: false` examples for the newly rejected connections, linked to their editor tests, and `doc/source/dev/collection_semantics.md` is regenerated from it.

</details>

<details><summary>Why the client and server disagreed</summary>

The client's `canMapOver` answered every case where the output had no more ranks than the input in an early `rank <= other.rank` branch, before reaching "cannot map over self". In that branch, any output not ending in `:paired` "mapped over" any `X:paired_or_unpaired` input. The server checks self first, then the `:other` suffix, then requires *extra* outer ranks for the compound case. The rewrite removes the early branch and keeps one rule list in the server's order, so the two files read rule for rule, as their "keep in sync" comments ask. The only extra rule is the server's trailing `single_datasets` case, which the editor has no use for.

</details>

***This only covers whether a connection maps over (`canMapOver` / `canMatch`). Computing the mapped-over type has known bugs of its own: for example, both sides truncate the type when mapping over `sample_sheet` inputs. That is a separate 26.0 fix with its own tests.***

## Risks

The one-way part is small: saved workflows with a 💥 connection now load with that connection flagged invalid, and Save is blocked until it's removed.

<details><summary>Risk Details</summary>

- The flagged connections are ones the server never mapped over, so no correct workflow is affected. Users who built one still have to delete the connection by hand.
- The server change turns `can_map_over` from true to false only for inputs of the form `paired:…:paired_or_unpaired`. No in-tree tool declares such an input. A third-party tool that does would stop being offered those collections as map-overs; none of them produced a meaningful map-over before.
- The output type of a `collection_type_source` output changes only for inputs that declare `paired_or_unpaired` types, and only to match what the server produces. In-tree `type_source` tools (`list,list:paired`, `list,paired`, `sample_sheet,…`) resolve the same as before.

</details>

<details><summary>Risk Review Advice</summary>

Compare `canMapOver` in `collectionTypeDescription.ts` with `has_subcollections_of_type` in `type_description.py` side by side; they should now read rule for rule, apart from the server's `single_datasets` case. Then check the new order in `getCollectionTypeFromInput` (map-over before direct match) against `create_collection` in `tools/actions/__init__.py`.

</details>

## Context

Builds on 🔀 #22193, which gave the `release_26.0` server compound `:paired_or_unpaired` map-over, so this backport brings full parity there. `release_25.1` isn't targeted because its server lacks that support. The client logic came in with 🔀 #19377. The `canMapOver` fix is ported from 🌿 [`issue_20657_input_processing_mode`](https://github.com/jmchilton/galaxy/tree/issue_20657_input_processing_mode), where the bug turned up while reusing `canMapOver` for the tool form. Land this with or before the fix for 🎯 #24220 (tool form drag and drop), which builds on the same `canMapOver` change. Alternative kept on 🌿 [`issue_24218_can_map_over_parity_26.0_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/issue_24218_can_map_over_parity_26.0_alt_original_scope): client only, without the `:` rank boundary on the server or client.

Merging forward: the new `collectionTypeDescription.test.ts` will add/add-conflict with the 26.1+ file of the same name. Keep both sets of `describe` blocks.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep: the branch fixes every row in the issue and leaves the map-over predicate in agreement on both sides.</summary>

- In scope: the `canMapOver` fix, the `collection_type_source` order it would otherwise break, and the `:` boundary on the line it rewrote. Every behavior flip is true → false.
- Re-scoped once to add the `:` boundary; the client-only original is kept as the alt branch.
- Effective map-over type bugs (`sample_sheet` truncation, a server compound ordering bug) touch different functions and need their own tests. They go to a separate 26.0 branch.
- Shared client/server parity table, a rank-sorted declared-type resolver and dropping `_endsWith` are `dev` follow-ups.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Approve: the diff simplifies `canMapOver` to one ordered rule list matching the server.</summary>

- The overlapping `rank <= other.rank` pre-branch is deleted, not moved. Net −10 lines in `collectionTypeDescription.ts`.
- Structural findings only affect inputs declaring several `collection_types` (the client doesn't rank-sort them; two sites pick a declared type with different rules). They predate the branch, no in-tree tool hits them, and they're `dev` follow-ups.
- `terminals.ts` was already over 1k lines on the base.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>No test changes needed; every new assertion was checked red against the source before its fix.</summary>

- Each new client test fails at its assertion against the previous source. The two Python `paired:paired_or_unpaired` boundary asserts fail against the previous `type_description.py`. The new lower-rank Python assert already passed there; it pins the server side of a fixed client row.
- One assertion (`list:paired:paired` over `paired:paired_or_unpaired` → true) is green before and after on purpose: it shows the `:` boundary doesn't over-reject.
- No API or Selenium tests: the server change affects no in-tree tool, and connection acceptance is pinned at the terminals layer the editor drag-connect uses.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings.</summary>

A fresh Codex run over the full diff ran the editor module tests and compared client results against the server rules across a large set of type combinations, with no mismatches.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>No base refactor; every candidate either changes behavior or is churn on a release branch.</summary>

- The `canMapOver` and `getCollectionTypeFromInput` rewrites only preserve behavior together with the fix.
- Replacing `_endsWith` with native `endsWith` preserves behavior but touches every caller in the file, so it stays a `dev` follow-up.

</details>

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? The editor refuses the connection and shows why on the terminal. Saved 💥 connections load as invalid, and Save is blocked with "review and remove workflow errors".
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They check type-pair behavior, editor `canAccept` and `collection_type_source` outcomes, and mirror the Python cases.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes, the first commit. Its tests pass on the base sources.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? Only workflows with a connection the server never mapped over (the 💥 rows); they now show it as invalid.
- [x] Who hits this in practice and what is the evidence? Anyone connecting a `paired` collection to a `list:paired_or_unpaired` input, including Split Paired and Unpaired. There are no user reports; found while reusing `canMapOver` on the #20657 branch.
- [x] Were simpler or existing approaches considered? Yes. Patching the `rank <= other.rank` branch in place is smaller but keeps the rule order different from the server's, which is how the two drifted. A shared client/server parity table is the better long-term guard but too large for a release backport. A client-only variant is kept on the alt branch.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `client/src/components/Workflow/Editor/modules/collectionTypeDescription.test.ts` (new): `canMapOver` over `paired_or_unpaired` and compound `X:paired_or_unpaired` inputs, including the issue's rows and the `:` boundary. The first commit adds the cases that already passed on the base.
- `terminals.test.ts`: `paired` and `paired_or_unpaired` → `list:paired_or_unpaired` are rejected with no map-over and the generic reason; `paired` is rejected by an input declaring Split Paired and Unpaired's `list:paired,list,list:paired_or_unpaired`; a `list:paired_or_unpaired` `collection_type_source` input resolves `list` → `list`, `list:paired` → `list:paired`, `list:list` → `list:paired_or_unpaired`.
- `test/unit/data/dataset_collections/test_type_descriptions.py`: server asserts for the lower-rank `paired_or_unpaired` case and the `:` boundary.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
