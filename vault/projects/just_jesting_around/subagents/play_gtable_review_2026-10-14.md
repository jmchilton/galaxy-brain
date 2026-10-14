# Independent GTable play review

Verdict: PASS for `d23c0ad13fe8251bf572f2445b4589c13efab247`. No required fixes. I inspected the commit, its parent, real UI components and navigation selectors, and supplied gate/mutation logs. I made no worktree edits, ran no further test suites, and killed no processes.

No findings were left unaddressed. Native property, emitted payload, selector and keyboard-event contracts appropriately remain in units. No production files changed. The worktree was clean at review completion; HEAD matched the reviewed commit and the GTable component matched the saved original byte-for-byte.

## Details

The original ten runtime cases contain 23 written assertion sites and 27 executions. Every original assertion has a retained or moved equivalent:

| Original sites | Disposition |
| --- | --- |
| Header and row accessible names: 2 written, 6 executions across default/custom cases | `DefaultSelectionNames` and `CustomSelectionNames` require the exactly named header and explicitly named controls in both fixed dataset rows. String role-name queries use exact matching. Missing controls fail; iteration over an empty rendered list cannot pass. |
| Row-select exact payload and no row-click: 2 | Both remain unchanged in units, with a native unchecked starting state added. The browser label selection/deselection play adds visible owned-state checks. |
| Select-all exact payload: 1 | Remains unchanged in units, with native unchecked header start added. Browser bulk selection and clearing check both rows. |
| Partial native state: 4 | All remain unchanged. PartialSelection also requires visible named controls and matching selected/mixed browser states. |
| All-selected native header state: 2 | Both remain unchanged. AllSelected adds visible controls and checked state for both rows, including the formerly unchecked second-row gap. |
| Sortable/unsortable aria-sort and tabindex matrix: 6 | All remain unchanged in units, including absence checks. |
| Keyboard emitted histories: 2 | Both remain unchanged in units; original first/second ascending aria/order starts added. |
| Keyboard descending aria-sort and exact second/first order: 2 | Move to SortsFromKeyboard using the exact original first/second records. Browser Tab reaches Name, Enter produces descending aria/order, Space restores ascending aria/order. |
| Native Space defaultPrevented: 1 | Remains unchanged in units. |
| Nested header control no sort emission: 1 | Remains unchanged in units with its direct native keyboard trigger. |

Remaining units: eight cases, 23 written assertion sites = 19 originals retained + four starting-state assertions. Stories: nine indexed scenarios, seven active plays. Read-only state plays may sit on base scenarios; label/bulk/keyboard actions have separate stories.

The Common GTable wrapper exports the actual workspace UI GTable, whose index exports the inspected component. Real GCheckbox renders a visible native input inside its label. Clicking its label alone can change native checked state without updating GTable selection; SelectsDataset therefore checks the unclicked header's mixed state after selecting the treated row. That header is computed from parent-owned selectedItems and proves the GTable event/harness transition. It also checks the control row stays unchecked, and after deselection checks header checked and mixed states clear. Bulk actions require both row controls, whose state follows the parent-owned selection. The platform-level Space prevention and nested-control contracts stay in units. Navigation's `.g-checkbox` label selectors remain exercised by retained unit label clicks.

Reviewed logs confirm original 10/10 units and 4/4 stories, final touched 8/8 units and 9/9 stories twice, full rebased gate 494 units in 82 files and 532 browser tests in 92 files, formatting pass and no lint/type errors in the supplied outputs. Warm best Tests times are 88ms/128ms before and 75ms/339ms after for unit/story respectively. Actual zero exits are supplied by the driver; plain saved output does not independently encode shell exit status.

Combined mutation evidence: original ten units pass; six browser scenarios fail. Default/custom names fail on absent named row controls; partial/all-selected and bulk fail when row selection cells become inaccessible; keyboard fails on descending initial order. Independent onRowSelect-noop evidence makes SelectsDataset fail specifically at the mixed header check, despite the clicked native control toggling. This is the relevant owned-state proof.

Limitations: combined mutations can mask later assertions (the second-row-only selected mutation is not separately reached after a hidden-control failure). The source still explicitly checks both rows and the combined proof meets the lane's permitted combined-break procedure. These logs are finite mutation demonstrations, not exhaustive fault coverage. I did not rerun suites or reproduce mutations, per the read-only review scope. Browser plays are not yet covered by upstream CI, as documented in PIPELINE_BRANCHES.md; that is an existing lane limitation.
