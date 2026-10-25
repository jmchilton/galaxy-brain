You'll be given an issue, plan or prompt for a Galaxy branch, its BRANCH_DIRECTORY and WORKING_DIRECTORY. Find the galaxy-brain documents that would help agents implement and review it, and note the gaps.

1. Understand the change well enough to know which Galaxy components it touches; skim the relevant code in WORKING_DIRECTORY only as far as that needs.
2. Start from `vault/Index.md`, then read candidate notes in `vault/research/`, `vault/projects/`, `vault/plans/` and `vault/papers/`. Prior branch records under `vault/repositories/galaxy/branches/` that touched the same code count too.
3. Write `BRANCH_DIRECTORY/brain_research.md` per [BRAIN_RESEARCH_YAML_FORMAT.md](BRAIN_RESEARCH_YAML_FORMAT.md). Only list documents worth an implementer's time; an empty list is fine.
4. Queue at most two research requests for high-value gaps per [GX_QUEUING_RESEARCH.md](GX_QUEUING_RESEARCH.md), and list them in `brain_research.md`. A stale note that conflicts with the code counts as a gap.

Don't implement anything or edit vault notes.
