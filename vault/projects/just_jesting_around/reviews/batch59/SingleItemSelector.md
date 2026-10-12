# SingleItemSelector — readability batch 59

Retained all 14 original scenarios and 18 original assertions. Required multiselect instances, interaction inputs, and first option targets use get/getComponent for clearer failures; presence/absence checks continue to use find. Both unique-ID instances use the existing typed mount helper instead of duplicate object-cast mounts. Automatic unmount owns every component.

Selection defaults, matching/external current items, emitted item payload, exact ranked option-ID order, first option DOM data-id, restoring the full list, prop-change selection reactivity, and distinct instance IDs are unchanged. The two option-prop casts remain local because vue-multiselect's options declaration allows strings, numbers, or arbitrary objects; the test knows the supplied fixture shape.

Corrected the inaccurate loading case title to “shows a loading message when items are already available,” preserving its original LoadingSpan existence assertion. The component's LoadingSpan depends on loading, while Multiselect independently depends on items.length; both can render together. Asserting selector absence would require changing product behavior and does not match this existing implementation. No production change or new absence assertion was introduced.

Pristine and final shuffled seed 590101 passed 14 cases. Full client vue-tsc, file ESLint/Prettier, and explicit absolute-config pre-commit gates passed. V8 covered-source-location comparison retains all 153 covered statement/function/branch-arm locations across 29 files, with zero lost or added. Evidence and coverage directories: `/private/tmp/readability59-selector-before`, `/private/tmp/readability59-selector-after`, and matching logs; types/hooks logs `/private/tmp/readability59-selector-types.log` and `/private/tmp/readability59-selector-hooks.log`.

No supporting helper, production, dependency, or README changes. Current README guidance covers the useful changes; no new general advice proposed.
