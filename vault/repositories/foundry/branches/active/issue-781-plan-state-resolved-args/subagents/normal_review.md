Run via Claude Opus 5.5 at high effort.

# Normal review: issue-781-plan-state-resolved-args

Reviewed `806b65c2` against `origin/main` `df991d0d`. Verdict: the design is sound and the carrier is honest. There was one real bug, selector precedence, and I fixed it with three small consistency fixes, in one commit on top of `806b65c2`: `5b3f2b78`, pushed to `jmchilton`. Gate: `make -k check` green except the known `validate-roadmap` and `check-vendored`.

What I acted on:

- **Bug, selector precedence.** The template copies every applicable `resolved_args` entry, and implement then had to give a disposition to every flag in all of them. Nextflow applies only one assignment per `ext.*` key: withLabel < withName(process) < withName(alias) < fully qualified, per docs.seqera.io/nextflow/config "Selector priority". `summarize-nextflow`'s `attachConfigDirectives` matches by name, alias and label, and does no ranking. So a canonical `withName:SAMTOOLS_VIEW` entry and an alias `withName:SAMTOOLS_VIEW_MAP_MAP` entry for the same key would both be carried into `state`. bamtofastq doesn't hit this, but module- or subworkflow-level configs (rnaseq) do. Fix:
  - The ledger's **Source arguments** section now has a precedence rule. Each overridden entry gets one `not_applicable` decision naming the selector that wins. A tie at the same rank gets one open plain entry with `step` set.
  - The template still copies verbatim and says that overridden entries are copied too.
  - The implement Mold, its eval and the advance eval were amended to match.
  - New implement scenario: a synthetic `withName:SAMTOOLS_VIEW` `-h` entry overridden by the alias.
- **Testability.** "Flag" was undefined: the examples write `-f1` as one token but `-r <reads_in_memory>` as two. The ledger now defines a flag as an option token plus any attached value. A value passed as the next token belongs to its option. A whole `ext.prefix` is one flag. The advance eval was tagged `check: deterministic`, which it can't be (enumerating the flags a closure can set takes judgement), so it is now `deterministic + llm-judged`, like its siblings.
- **#647.** `not_applicable` previously needed only "a reason". Its `rationale` must now name what makes the flag inapplicable, and for a prefix, the outputs it names. The template now says that `resolved_args` holds only config-set arguments, and that flags the module script writes itself are in `script_excerpt`. A missing entry is therefore no evidence that the source sets no flags. That is exactly #647's featureCounts `-s` failure.
- The `open-requirements-ledger` reference `purpose` on the template and advance Molds now mentions source-argument dispositions. Before, only implement's did.

Not acted on:

- **Carrier.** I kept the YAML document in a string, with one-line JSON entries. I re-verified it: `gxwf draft-validate --json` on a draft with the template's example block exits 0 with `draft valid`, and the block round-trips through `yaml` to the exact summary strings, closure included. `_plan_state` is `string?` in gxformat2 `schema/v19_09/draft_workflow.yml`, and gtu-ts 1.15 carries `Schema.Union(Null, String)` from it. Inside that constraint, this is the least invasive honest carrier. An upstream change is worth an issue (draft below), but it isn't needed to ship this.
- **Ledger vocabulary.** I left it as is. Carried and not-applicable flags are `decisions`, which are authorized choices. Dropped flags are `kind: dropped` entries, and the existing `kind: dropped` text already names "a parameter surface not exposed". The only new fields are `source_arg` and `disposition`. That follows the note's own "classify by effect" rule and isn't accretion.
- **Implement's "different `invoked_as`" line.** The template's eval forbids those entries, so this line is only defensive, but it costs nothing and covers hand-built drafts.
- **No deterministic fixture.** Same reasoning as the debrief. Red→green is argued, not run: base Molds never read `resolved_args` or write `source_arg`, so each new property fails on base by construction, and all checks are LLM-judged.

## Stack notes

- **#784.** Union `decisions` and `entries` on `source_arg` to build the flags table. An overridden entry has exactly one `not_applicable` record with no `flags`. Tie gaps are plain entries with top-level `step` and no `source_arg`.
- **#796.** The removed-step check still matches on top-level `step` only. Tie entries do carry a top-level `step`, and they should go with their step.

## Draft upstream issue (not filed)

Target: `galaxyproject/gxformat2`, because gtu-ts regenerates from it.

> **Allow structured `_plan_state` in draft workflows**
>
> `DraftWorkflowStep._plan_state` is `string?` in `schema/v19_09/draft_workflow.yml`, and its doc calls it "free-text". Foundry now carries source tool arguments (nf-core `ext.args`/`ext.prefix`) as structured data in `_plan_state`. To do that it embeds a YAML document in the string and writes each entry as a JSON object, so that Groovy quotes and closures survive. A mapping value is rejected (`additionalProperties: false`, string type), so it can't be the carrier. Proposal: type `_plan_state` (or all `_plan_*` fields) as `string | Any`, so a draft may carry a mapping. Keep the "strip before runnable" rule unchanged. `draft-next-step`'s work item and `draft-extract`'s strip would need to accept non-string values, and the gtu-ts effect schema would be regenerated.

<details>
<summary>Full review</summary>

Scope checked: the content diff (3 Molds, their evals and scenarios, ledger note, draft-format note, template refinement), the cast/dashboard regeneration, `summarize-nextflow` `resolver.ts` selector matching, the installed `@galaxy-tool-util/schema` 1.15.0 draft type, gxformat2 `origin/main` draft schema, bamtofastq `conf/modules.config` at `869832186b25`, and the Nextflow selector docs.

Verified facts:

- Scenario values match bamtofastq's config at the pin: the four view aliases' `ext.args`, `SAMTOOLS_CHR` `-hb`, the collate `ext.args` closure `params.samtools_collate_fast ? "-f -r " + params.reads_in_memory : ""`, and `args2 '-N'`.
- `-F12` = 4+8 and `-f1` = paired, matching the implement scenario's expected state.
- Nextflow docs: an unqualified `withName: hello` also applies to a process included as `sayHello`, and alias selectors take priority. So including canonical-name entries for aliased calls is correct, and only precedence was missing.

Findings:

1. (Bug) Selector precedence not modelled. Fixed, as above.
2. (Testability) Flag granularity undefined, and advance eval mis-tagged deterministic. Fixed.
3. (#647, minor) The `not_applicable` reason was unconstrained, and an absent `resolved_args` could read as "the source sets no flags". Fixed.
4. (Consistency, minor) Ledger reference purposes on template/advance didn't mention source arguments. Fixed.
5. (Nit, not acted) Implement's "selector names a different call" line is defensive only.
6. (Nit, not acted) The dropped example's `missing` restates `because`. It's illustrative, so I left it.
7. (Design, not acted) The carrier and ledger shape both fit, as above.

REVIEW_FOCUS: no Python. Abstractions are reused (`decisions`, `kind: dropped`, the ledger protocol). No tests were weakened. The new evals are additive.

</details>
