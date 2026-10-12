# HistoryStorageOperationsIndicator — batch 63 author review

Originator: `client/src/components/History/CurrentHistory/HistoryOperations/HistoryStorageOperationsIndicator.test.ts`.

The original one case and three assertions remain: interactive popover configuration, Background storage operations popover label, and Background operations are running trigger label. This checks the parent-accessibility configuration contract; it does not simulate keyboard interaction. Required popover/trigger lookup now uses getComponent/get, and native inferred mount removes the component/object cast.

The scenario explicitly owns its testing Pinia and registers disposal after wrapper cleanup. Auto-unmount handles assertion failures. The original explicit successful-path unmount is retained because this synchronous case unmounts before GPopover's deferred initialization; moving cleanup only to afterEach changes that meaningful teardown timing.

Coverage investigation: automatic-only teardown retained default coverage but let deferred GPopover setup execute, adding 35 real shared UI locations while losing two post-unmount-guard locations. Retaining original immediate unmount plus failure-safe auto-unmount restores an exact actual-UI comparison without a coverage exception. No production change or new assertion is needed to preserve that existing path.

Validation: one shuffled case passes with seed 630101. Default pristine/final V8 covered locations match at 17 files/78 locations; explicit actual GPopover/GButton/GButtonGroup comparison matches at three files/192 locations. Zero covered statement/function/branch-arm locations lost or added in either final comparison. Pristine actual-UI collection uses the unchanged storage test in the sibling confirmation worktree; no temporary final-file restoration. File ESLint/Prettier and final explicit absolute-config repository hooks pass; integrated full types belong to the driver. Evidence is `/private/tmp/readability63-storage-*`.

Existing watcher mock remains the network boundary. No production/shared helper/supporting test/dependency/README edit, and no new evidenced guidance gap proposed.
