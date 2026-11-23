# Galaxy-brain research updates from galaxyproject/galaxy#24673

## Stale documentation

Both of these are independent of whether the PR merges.

1. `vault/research/Problem - YAML Tool Post-Hoc State Divergence.md`, "Where the structured state *is* used at runtime": says `Job.copy_from` (`model/__init__.py:1808`) copies `tool_state`. The method is `Job.copy_from_job`. At `651f9538c7`, line 1808 falls inside `copy_from_job`, which starts at line 1792. `Job` has no `copy_from`; only HDAs and `DatasetCollection` do.
2. `vault/research/PR 21828 - YAML Tool Hardening and Tool State.md`, `Job.tool_state` entry: has the same `Job.copy_from` misnomer at `:1808`.

`Component - Jobs API and Job Cache.md` already notes this naming difference.

## Post-merge activities

The research notes are verified against `dev` and this PR targets `release_25.1`, so do these once the change merges forward to `dev`, re-verifying line numbers at that SHA.

1. `vault/research/Component - Jobs API and Job Cache.md`, "`Job.copy_from_job`":
   - Add that a late hit first locks its HDA outputs with `FOR UPDATE`, in id order.
   - Add that those locks are held through non-immediate post job actions until the hit commits.
   - Extend the `visible` bullet: propagated copies now keep their own `visible` and `deleted`, while the direct output's `visible` is still restored by `copy_from_job`.
2. `vault/research/Component - Jobs API and Job Cache.md`, "Two searches" (late search): add that a copy of a late-hit output made while the job is queued now ends up on the cached dataset, whichever side gets the row first. Include the SQLite and expression tool limits.
3. `vault/research/Component - Collection Models.md`, `copy_from(other)` under Key Methods: the entry says it copies elements, but a populated collection swaps the existing element HDAs in place through `HDA.copy_from`. Note that this path now takes HDA row locks.
4. `vault/agents/gx_research/todo/hda_copies_and_dataset_sharing.md`: if the request is still pending at merge, the note should cover the merged protocol.
