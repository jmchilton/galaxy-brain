# Metadata JSON viewer review — iteration 07

Selected originator: `lib/tool_shed/webapp/frontend/src/components/MetadataInspector/MetadataJsonViewer.test.ts`. Baseline and final: 12 cases.

The real Vue 3 `MetadataJsonViewer` remains the mounted subject. A typed `defineComponent` mock replaces only its `vue-json-pretty` dependency and renders JSON through a render function. Runtime prop declarations replace the original untyped prop list; undefined defaults keep missing forwarded values observable. The stylesheet imports normally rather than receiving a redundant module mock. Every wrapper is automatically unmounted, and a small local factory infers its props from the actual subject.

All original content and existence assertions remain: strings, nested input names, ordered array values, model-name rendering, custom depth, empty object, null, booleans, numbers, deep nesting, and the last entry of a 100-item array. New renderer-prop checks verify the full data payload, `virtual: false`, `showLength: true`, default depth 2, and custom depth 5. Names describe what the isolated subject forwards; the fake renderer does not claim to exercise the third-party renderer's own layout or expansion behavior.

Existing `MetadataInspector/test-utils.ts` deliberately stubs this subject for parent-component suites, so importing it here would bypass the behavior under test. The dependency mock and mount arrangement have no second concrete consumer; a new shared helper is unnecessary. Native Tool Shed Vue 3 tools are used rather than Galaxy's Vue 2 local-Vue helper. Existing guidance already supports scoped cleanup and meaningful component contracts; no README addition or deferred advice is proposed.

Validation: all 12 cases pass (`/private/tmp/batch07_metadata_viewer_results.json`). Native Prettier and scoped ESLint using an isolated dependency environment with the unchanged upstream Tool Shed configuration pass. Root performs full Tool Shed typechecking and independent review. No production changes.
