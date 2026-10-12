# WorkflowRun model independent normal review

Approved `617e7afc94e` against pinned `a716c7d6a82a497f52a1831309c67531451c35fa`. Inspected the complete test, getReplacements/WorkflowRunModel production behavior, shared review focus and current client guidance. All five cases/11 checks retain original strings, parameters, step links, optional-input payloads and exact ordered help/connection expectations.

The replacement case now names its inputs by domain role, and synchronous cases no longer declare async. The imported disconnected-input sample is structuredClone'd before a model constructor that mutates nested parameter objects; this preserves its actual runtime data while preventing a case from modifying the shared JSON fixture. The optional-data case already constructs its own steps and retains all fields. Existing local data/tool-step helpers still express the actual minimal model contract; no production, fixture or shared helper change.

Independent Node22 shuffled680201 one-worker run passes five cases (`/private/tmp/readability68-model-independent.log`). Author/default V8 comparison28files299 covered statement/function/branch-arm locations exact, zero loss/addition; no UI renders. These pure model contracts belong at the existing client unit boundary. No findings; final integrated types/hooks are driver-owned.
