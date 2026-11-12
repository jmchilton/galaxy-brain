Run via Codex CLI (`gpt-6-sol`, effort from `~/.codex/config.toml`: high), read-only, over `4ff48eda..9530080f`. Triaged by Claude Opus 5.5.

# Codex review — `4ff48eda..9530080f`

Acted on three of four findings, each red-to-green in `test/nextflow-parity.test.ts`; the fourth was a CLI-page wording gap, clarified. Codex couldn't read the gtu-ts clone (outside its sandbox), so it didn't check step keying against `gxwf diff`; the normal review did.

Fixed:

1. **P1, CONFIRMED — shared entry id mapped an unrelated call** (`nextflow-parity.ts` record fallback). The summary schema says a `withLabel` entry has the same `id` in every process it matches, so a record on a template-resolved step citing it mapped every call sharing the id to that step and hid `call-unmapped`. The fallback now counts only ids effective for that call alone. A call whose ids are all shared maps nothing and reports `call-unmapped`, the safe side for a report.
2. **P1, CONFIRMED — output-only drop not joined.** The ledger note lists "dropping an output during repair" as a cut a `kind: dropped` entry records, with no top-level `step`. Removed outputs now also take drops whose backticked `units` name the output. `ledger.ts` gains `backticked()`; `unitNames()` is a filter over it.
3. **P2, CONFIRMED — a flag record with no reason counted as recording its entry.** A decision without `carried`/`not_applicable`, or a dropped flag record without `because`, now goes to `source-arg-malformed` with a `detail` and stays out of the join, so its entry also reports `source-arg-unrecorded`. Matches `isStepDrop` requiring `because` for step drops. The existing malformed test gained the `detail` field (stricter).

Clarified:

4. **P2, partly REFUTED — removed inputs never become command findings.** Not a contradiction: the Mold's Findings section adds "every difference you found while writing the sections that has no recorded reason", and the input's reason lives only in prose. The CLI page now says the Mold lists the unexplained ones.

Mold Outputs section and CLI page updated for `dropped_entries` now covering output drops.

<details><summary>Codex findings (verbatim titles)</summary>

- P1 `nextflow-parity.ts:295` A shared argument ID can map an unrelated call to a step — "Two calls use the same effective `withLabel` argument ID. Only call A has a Galaxy step without `_plan_state`, with a flag record naming that step; call B has no step or drop. The command assigns B to A's step and omits the `call-unmapped` finding."
- P1 `nextflow-parity.ts:400` A recorded output-only drop is reported as unrecorded — "The snapshot exposes output `qc` from a step that remains... the ledger has `kind: dropped`, `units: \"`qc`\"`... The command emits `output-removed-unrecorded`."
- P2 `nextflow-parity.ts:452` Unexplained removed inputs never become command findings — Mold vs CLI page wording.
- P2 `nextflow-parity.ts:423` A source-argument record with no reason suppresses an unrecorded finding.

Coverage note: generated casts not reviewed in full; gtu-ts clone unreachable.

</details>
