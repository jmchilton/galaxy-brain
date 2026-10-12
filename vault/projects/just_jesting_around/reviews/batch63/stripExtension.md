# Batch 63: stripExtension

Originator: `client/src/components/Collections/common/stripExtension.test.ts`.

All seventeen original filename/output pairs remain byte-for-byte equal. An automated inventory extracted the original expectations and final table tuples and compared their multisets, confirming all seventeen pairs are retained exactly. All six original behavior groups remain; the metadata-preservation group name now states the behavior directly.

Typed scenario tables separate the filename/expected data from the single repeated assertion. Nested describe.each/test.each reports every filename independently, with quoted input and output labels that also identify the empty-string edge case. This prevents one failing filename from suppressing later checks within the original grouped test and improves failure localization while preserving domain grouping. No fixture helper, production edge case, or supporting consumer was added.

Pristine shuffled seed 630101 passes six cases/seventeen assertions; final seed 630101 passes seventeen cases/seventeen assertions. V8 comparison is identical: four files and 31 covered statement/function/branch-arm locations, zero lost or added. Reports: `/private/tmp/readability63-strip-before` and `/private/tmp/readability63-strip-after`.

Existing README parametrization guidance directly applies. No evidence-backed guidance gap or new shared abstraction was found. No production, supporting-test, dependency, or README edits.

ESLint/Prettier and explicit pre-commit gates passed. Full client types are owned by the integrated driver gate.
