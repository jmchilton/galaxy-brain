# Batch 61: schema Markdown descriptions

Originator: `client/src/components/Tool/schemaMarkdown.test.ts`.

The existing test already has readable scenario-local typed fixtures, descriptive names, and a focused pure-function contract. Retained all five cases and six original assertions without cosmetic restructuring. Added one check that the nested input schema does not gain `markdownDescription`; the original non-mutation check covered only the root object, although the same case exercises nested descriptions. The new check makes the nested non-mutation expectation explicit without introducing new setup or a helper.

Pristine/final shuffled seed 610101 both pass five cases; final assertions: seven. V8 comparison is identical at five files and 36 covered statement/function/branch-arm locations, with zero lost or added. Reports: `/private/tmp/readability61-schema-before` and `/private/tmp/readability61-schema-after`.

No production, supporting-test, fixture, dependency, or README edits. Existing guidance adequately covers this pure-function test; no evidence-backed guidance gap or concrete shared-helper consumer was identified.

ESLint/Prettier and explicit pre-commit gates passed.

Bounded mutation challenge: changed only the recursion to copy recursively processed object values back onto their original nested objects with Object.assign, leaving root processing as a fresh object. All five original tests passed against that mutant. The final suite failed exactly the added nested non-mutation check, with the other four cases passing. Source and test were restored in finally; production source diff is empty, and the restored final suite passes five cases with shuffled seed 610201. Evidence: `/private/tmp/readability61-schema-mutant-original.log`, `/private/tmp/readability61-schema-mutant-final.log`, and `/private/tmp/readability61-schema-restored.log`. No mutation was committed.
