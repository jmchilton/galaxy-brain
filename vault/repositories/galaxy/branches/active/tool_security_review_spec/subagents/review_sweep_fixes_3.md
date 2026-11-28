# Review debrief: sweep fixes batch 3 (FP-2, FP-4, FP-16)

I acted on every should-fix and nit of the normal review. Each fix is folded into its cause commit: `5124a7e3d9b` (FP-2), `5840fb222be` (FP-4) and `24f783313cc` (FP-16). The review also raised one sensitive finding. It predates this branch and concerns a Galaxy-side check, so it went to the private security process and is not recorded here. John has it.

Not acted on:
- The sensitive finding: it needs a decision from John (a Galaxy-side fix, or a different analyser reading).
- Question: `colors_validated` defaults to True, which assumes the target Galaxy is release 25.1 or later, and the docstrings now say so. John decides whether `galaxy-tool-util` users who review for older servers should get the cautious reading by default.
- Follow-up: `$d.dataset.X` (`DatasetObject`) still reads every member it does not know as text. It only over-reports. `$input.dataset.dataset` is the Dataset model and needs its own reading.
- Follow-up, older than this branch: a collection's `serialize()` reads as clean, though it carries element identifiers.

<details>
<summary>Full review (non-sensitive part)</summary>

Reviewer: general-purpose subagent (Claude Opus 5.5). It reviewed `dfb75acaf62..811fe3d1183` read-only, ran probes, and checked the regression diffs, including the pairing of FP-4's added and removed findings.

1. should-fix (soundness), FP-4: `_`-prefixed names read as clean, but `_element_identifier` is the raw identifier. Done: a `_` name the wrapper has is read as raw opaque. `_element_identifier` joins the identifier reading, and the two private names Galaxy sets read as clean.
2. should-fix, FP-4: a history import sets `tool_version` from the archive. Done: it is now in DATA_TEXT, with `to_library_dataset_dataset_association` and `to_dataset_instances`.
3. should-fix, older than this branch: `serialize()` carries the raw identifier. Done: it gives a dict-like node, where `source_path` and `ext` read as clean and the other keys as the identifier.
4. should-fix, coverage: the member test walked only the HDA class. Done: it now also walks the wrapper instances, and every member is classified once. `get_datasets_for_group()` and `pop()` now give the dataset nodes, a missed reading that predates this branch.
5. nit: `DatasetObject` consistency. Left as a follow-up.
6. question: the `colors_validated` default. Left for John.
7. nit, FP-2: an unquoted hex colour had no pin. Done: a unit row.
8. nit, FP-16: a redundant `isinstance`. It is kept only so that mypy can narrow `node.args`.

Checked and found fine:
- FP-2: every path a colour value takes into a template is validated on this base. That covers `_validate_incoming` after `params_from_strings` for reruns, workflow and API jobs, and the job cache, plus `to_param_dict_string` at render time. The empty and None values were checked too.
- FP-4: Cheetah's lookup of an unknown member fails the template, and the file metadata additions are right. All 98 added findings pair with a removed one that lost only its dataset or metadata source. The spot-checked removals outside the catalogue's keys are all correct.
- FP-16: narrowing needs every alternative to be a conditional with that selector. Probes of dicts, repeats, reassignment and non-identifier keys behave correctly.

</details>

## Commits and regression (per commit, against the previous run)

| commit | cause | removed | added | changed | tool events |
|---|---|---|---|---|---|
| `5124a7e3d9b` | FP-2 | 86 in 31 tools | 0 | 0 | 22 (17 high to none, 5 high to medium) |
| `5840fb222be` | FP-4 | 106 net in 36 tools (raw 204 removed and 98 re-keyed adds) | 0 net | 0 | 11 (9 cleared, 2 to low) |
| `24f783313cc` | FP-16 | 4 in 1 tool (2 high) | 0 | 0 | 1 (high to medium) |

FP-2 hits the 30 predicted tools plus one quoted colour that the catalogue's matcher missed. FP-4 hits 35 of the 36 predicted tools. The one left out is the `creating_job` tool, kept by design. It also hits one functional test tool, whose Galaxy path was read as text. Sampled removals were all false positives.

At `24f783313cc` these pass: 1043 security unit tests, 3235 spec job tests (run alone), and `test_security_review.py` with the new `test_security_review_datasets.py` (133). Pushed as a checkpoint.
