# Domain review: galaxyproject/foundry#778

- Profile: foundry_domain_review
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `4e4df0290d0b6e4be25fbfc8df7d206bb2bf3f77` (base `origin/main`, merge-base `94ce4ea2`)

**Verdict:** the routing is sound and narrowly scoped. Only `miss` authors now, fit is checked in implement, and repair folds. Casts, the cast schema copy and `galaxy-tool-discovery.schema.generated.ts` match the source (I checked the new discover/repair text and the `status` description). The gaps are on the oracle side: repair's new fold has no eval property, and an existing property reads as failing it. The new scenarios don't name committed fixtures, and `author-galaxy-tool-wrapper` still lets `weak` author. Not re-argued: dropping the `unsuitable` status (PR description, #773).

## P2 1 — Repair's fold has no eval property, and "a removal needs standing" fails a correct fold

§2 (`eval.md` is the oracle) and §5 (get it right in this PR). `repair-galaxy-draft-topology/index.md:118` adds a fold: `remove-step`, `rewire` its inputs to the consumers, `change-parameter`. `repair-galaxy-draft-topology/eval.md` didn't change. Its "a removal needs standing" property says "no step is removed when a consumer truly needs its output". In the STAR fold both `rna_star` consumers do need the index, so a judge applying the oracle as written fails the run the PR wants. No property checks the fold itself either: no added producer, the inputs moved to the consumers, and the consumers switched to the mode that does the work.

**Ask:** add a fold property, with a failing output a judge can picture, e.g. an added index producer, or a consumer left on a prebuilt-index mode. Scope the standing rule so it doesn't apply when the entry shows the consumer's wrapper does the removed step's work.

## P2 2 — The new cases don't name committed fixtures

§2 (every `## Case:` names a specific fixture; no maturity notes).

- `repair-galaxy-draft-topology/scenarios.md:59-71`: "No committed fixture yet." is a maturity note, and its fixture is abstract ("a draft whose drafty `STAR genome index` step feeds…"). Every other case in that file names an `examples/` path. `examples/star-sa-index-input/` already has the post-fold shape. A pre-fold copy, with a drafty index step and the blocking entry implement raises, would make this case concrete. It would also give the expectation's "as in `examples/star-sa-index-input/`" something to diff against.
- `implement-galaxy-tool-step/scenarios.md` "wrapper runs the work but has no index output": the fixture is abstract too. It names the summary by pin but not by file.
- In the same file, two older cases are abstract as well: "concrete step preserves failure evidence" and "runtime failure ownership hint" ("a plausible mismatch…"). Per §2 they get fixed in this PR, in a cleanup PR this one rebases on, or in a new `work/ready-implement` issue.

**Ask:** commit the pre-fold draft and ledger as a repair example, plus an implement example holding the draft and the `rna_star` summary. Point both cases at them and drop "No committed fixture yet." Fix or ticket the older abstract implement cases.

## P2 3 — `author-galaxy-tool-wrapper` still lets `weak` author

§5 (get it right in this PR; don't leave a known-wrong shape for a later change). The schema description, `discover-shed-tool`, `advance-galaxy-draft-step` and `content/schemas/galaxy-tool-discovery.md` now say `weak` never falls through to authoring. The live author cast still says otherwise:

- `content/molds/author-galaxy-tool-wrapper/index.md:84` (cast `SKILL.md:61`): "Continue only when discovery returned `miss`, or when the selected hit was weak enough that the harness explicitly fell through."
- `index.md:67`: "do not duplicate existing wrappers unless discovery evidence is weak or missing."
- `eval.md` "authoring does not duplicate discoverable wrappers": "unless the discovery evidence is unacceptable".

The PR description hands `author-galaxy-tool-wrapper` to #773/#723. The verifier may file this under that callout. Still, the two Molds now contradict each other in one pipeline, and dropping the `weak` clause is a one-line edit that doesn't touch #723's authoring gate.

**Ask:** cut the `weak` clauses from `author:67` and `:84`, and narrow the eval to "authors only on `miss`". Or keep this PR draft until #773 lands.

## P3 1 — Mold bodies defend their instructions

§3 (runtime instructions; no clauses where an instruction defends itself).

- `discover-shed-tool/index.md:109`: "Fit depends on the step's ports, which discovery doesn't see, and [[implement-galaxy-tool-step]] checks it after summarize." This is rationale. "A wrapper that runs the named executable is never a `miss`" restates the `miss` definition in the list above it.
- `discover-shed-tool/index.md:135`: "they're admin-only and write a tool data table, not a dataset a step can consume". The rule "drop `data_manager_*` hits" stands without it.
- `repair-galaxy-draft-topology/index.md:118`: "An added producer for the same work would raise the entry again."
- `implement-galaxy-tool-step/index.md:171`: "so the step stays drafty for repair".

**Ask:** keep the instruction and cut the justification. It belongs in the PR description or `open-requirements-ledger`.

## P3 2 — The discover STAR case pins search ranking and explains itself

§4 (text that goes stale; survey mechanics). In `discover-shed-tool/scenarios.md`, "`rna_starsolo`, which outranks it in search, may be an alternate" records today's Tool Shed ranking. "The index-builder data manager is admin-only and writes a tool data table, so it isn't the candidate" is rationale inside an expectation.

**Ask:** state just the expectation: "candidate is `iuc/rgrnastar/rna_star`; status `hit` or `weak`; no `data_manager_*` repo as candidate".

## P3 3 (optional) — The design tier still creates the step that repair then folds

§5 (get it right). `content/research/nextflow-to-galaxy-reference-data-mapping/index.md:95` tells the design tier to add a workflow-tier "build index" step past about 3 rebuilds. No STAR wrapper emits an index to history, so following that rule builds the step this PR then sends through implement, then a blocking entry, then a repair fold. Each round spends a `topology_repair` escalation. The 670 plan flagged adding "only when the wrapper accepts a prebuilt index" there. The line is outside the diff, so this may be filed as pre-existing. It is the source of the case this PR handles, though.

**Ask:** add the qualifier at `:95`, in this PR or in a `work/ready-implement` issue.

## P3 4 (optional) — The advance routing change has no scenario

§2. `advance-galaxy-draft-step` has new routing in step 1 (an entry recording a found wrapper that can't serve the step skips to repair) and in step 2 (a `weak` candidate is confirmed, never authored). Both have eval properties but no `## Case:`. The existing cases "entry on the picked step that holds only misses" and "entry that records the wrapper as confirmed absent" show the pattern.

**Ask:** add a case whose fixture holds such an entry against the picked step and expects repair with no new search.
