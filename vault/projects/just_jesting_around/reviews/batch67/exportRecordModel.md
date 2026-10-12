# Export records — batch 67

All six original cases and 17 checks remain, with the exact original response fixtures and expected expiry helper. Each case constructs its own model rather than sharing cached expiry state. Date.now is fixed to the existing recent fixture's creation timestamp and restored after each case. The file-source record now has an accurate local name.

A seventh case observes the exact expiry instant and the following millisecond, checking both hasExpired and canDownload at each point. Its four checks establish the existing strict-after boundary. A bounded greater-or-equal mutation passes all original cases and fails the added case; source/test restore in finally and restored seven cases pass. No production mutation is committed.

Pristine/final shuffled670101 pass six/seven cases. V8 retains exactly five files/98 covered statement/function/branch-arm locations. No shared UI renders. No supporting, helper, dependency or guidance change; original date fixtures remain unchanged and existing clock-ownership advice suffices. Driver owns integrated types and independent review.
