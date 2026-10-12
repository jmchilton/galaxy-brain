# JobsTable — independent review, batch 64

Approve; no blocking findings. Compared `8ee6e666403` with base `846fdc7466ed145ef8bab8fdf76a10bdb2c0476e`, read the component and real table sorting boundary, and applied current client/shared review priorities. Independent shuffled seed 640201 passes two cases (`/private/tmp/readability64-jobs-independent.log`).

Both original exact row-order assertions and their oldest-first fixtures remain. Real GTable rendering still checks default newest-first ordering and the reverse ordering after clicking Last Update; original UtcDate/JobDetails stubs isolate unrelated child behavior. A required header selector uses the actual update_time field rather than its incidental array position, removing the non-null assertion while preserving the same user action. Native component inference removes the object cast, and automatic unmount owns both wrappers on failure and success. Existing local helpers already convey setup and rendered IDs without another abstraction.

No original contract is weakened and no production/supporting change or guidance gap is introduced. Author default coverage retains exactly 234 files/416 covered locations and actual shared table/alert/link coverage retains three files/160 locations. File lint, formatting and explicit hooks pass; integrated types belong to the driver.
