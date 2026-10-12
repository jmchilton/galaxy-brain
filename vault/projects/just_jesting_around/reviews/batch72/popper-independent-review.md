# popper independent review

Approved; no driver action required.

Pinned base `27e6eaab10040eec5866dd9614ba44b7547c110d` through worker `c0570de2fab90e215d66147118451601f83302af`.

All11 original cases /29 checks, slots, placement, click/hover actions and delay advances remain; added explicit outside-click case yields12/31. Required targets use get while presence/absence checks remain find/exists. Automatic unmount removes actual usePopper listeners/instance before timer clearing, real-time restoration, mock clearing and exact host removal. New public visible→outside document click→hidden case replaces incidental leaked-listener coverage. Author bounded mutation shows originals pass but added hidden assertion fails when outside dismissal is disabled; restored suite passes. Independently compared V8 JSON: native6 files105→113 zero loss; UI23 files12 setup/import locations exact.

Independent pinned Node22.20 shuffled720201 single-worker run passes all final cases; log `/private/tmp/readability72-popper-independent.log`. Reviewed original diff, dependency ownership and README/shared review focus. Author native lint/format/absolute hook gates pass; driver owns integrated type gate. No source edits, invented guidance or substantive maintainability finding.
